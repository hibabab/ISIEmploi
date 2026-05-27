// src/Services/importEmploiService.js
import { addSeance } from "../database/seances";
import { getSalles } from "../database/salles";
import { getClasses } from "../database/classes";
import { getEnseignants } from "../database/enseignants";
import { getConfiguration, getAllConfigurations } from "../database/personalisation";
import { getDB as getClassesDB } from "../database/classes";
import { getDB as getMatieresDB } from "../database/matiere";

// ─── Normalisation ────────────────────────────────────────────────────────────

const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, '')
    .trim();
};

const isNonEmpty = (val) => val && val.trim() !== '' && val.trim() !== 'null';

// ─── Helpers DB ───────────────────────────────────────────────────────────────

const getAllMatieres = async () => {
  const db = await getMatieresDB();
  try {
    return await db.select("SELECT id, code, libelle, abr FROM matieres") || [];
  } catch (e) {
    console.error("Erreur matières:", e);
    return [];
  }
};

const findOrCreateClasse = async (nom) => {
  const db = await getClassesDB();
  await db.execute(
    "INSERT OR IGNORE INTO classes (id, nom) VALUES (?, ?)",
    [nom, nom]
  );
  return nom;
};

// ─── Mapping séances depuis la config ─────────────────────────────────────────

const buildSeanceMapping = async () => {
  let config = null;
  try {
    config = await getConfiguration();
    if (!config) {
      const configs = await getAllConfigurations();
      if (configs?.length > 0) config = configs[0];
    }
  } catch (e) {
    console.error("Erreur config:", e);
  }

  if (!config?.sequence) {
    console.warn("⚠️ Aucune config trouvée, seance = chiffre brut");
    return null;
  }

  const seanceElements = config.sequence
    .filter(s => !s.element.includes('PAUSE'))
    .map(s => s.element);

  const mapping = {};
  seanceElements.forEach((element, index) => {
    mapping[String(index + 1)] = element;
  });

  console.log("🗂️ Mapping séances:", mapping);
  return { mapping, jours: config.jours };
};

// ─── Mapping TypeS → libellé séance ──────────────────────────────────────────

const TYPE_MAPPING = {
  '1': 'Cours',
  '2': 'TD',
  '3': 'CI',
  '4': 'TP',
  '5': 'TP',
  '6': 'TP',
  '7': 'TP',
  '8': 'TP',
  '9': 'TP',
};

const resolveType = (raw) => TYPE_MAPPING[String(raw).trim()] || 'Cours';

// ─── Import principal ─────────────────────────────────────────────────────────

export const importEmploiFromCSV = async (file) => {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        console.log("📖 Lecture fichier CSV emploi...");

        const configData = await buildSeanceMapping();

        const [matieres, classes, enseignants, salles] = await Promise.all([
          getAllMatieres(),
          getClasses(),
          getEnseignants(),
          getSalles()
        ]);

        console.log(`📚 ${matieres.length} matières | 🏫 ${classes.length} classes | 👨‍🏫 ${enseignants.length} enseignants | 🏢 ${salles.length} salles`);

        // ── Maps de résolution ────────────────────────────────────────────────

        const matiereMap = new Map();
        for (const m of matieres) {
          if (m.libelle) matiereMap.set(normalizeString(m.libelle), m.id);
          if (m.abr)     matiereMap.set(normalizeString(m.abr),     m.id);
          if (m.code)    matiereMap.set(normalizeString(m.code),    m.id);
        }

        const classeMap = new Map();
        for (const c of classes) {
          if (c.nom) {
            classeMap.set(c.nom.trim(),          c.id);
            classeMap.set(normalizeString(c.nom), c.id);
          }
        }

        const enseignantMap = new Map();
        for (const ens of enseignants) {
          if (ens.nom) {
            if (ens.prenom) enseignantMap.set(normalizeString(`${ens.nom} ${ens.prenom}`), ens.id);
            enseignantMap.set(normalizeString(ens.nom), ens.id);
          }
        }

        const salleMap = new Map();
        for (const s of salles) {
          if (s.id) {
            salleMap.set(s.id.trim(),          s.id);
            salleMap.set(normalizeString(s.id), s.id);
          }
        }

        // ── Parser CSV ────────────────────────────────────────────────────────

        const content = e.target.result;
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) throw new Error("Fichier CSV vide");

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());

        // Index de toutes les colonnes utilisées
        const col = (name) => headers.indexOf(name);
        const idx = {
          // ── Identité de la ligne
          classe:       col('Classe'),
          seance:       col('Seance'),
          tranche:      col('Tranche'),

          // ── Séance principale (semaine A / toutes)
          matiere:      col('Matière'),
          salle:        col('Salle'),
          enseignant1:  col('Enseignant1'),
          enseignant2:  col('Enseignant2'),       // ← NOUVEAU
          typeS1:       col('TypeS1'),

          // ── Séance alternée (semaine B / impaire)
          matiereB:     col('MatièreB'),
          salleB:       col('SalleB'),
          enseignant1B: col('Enseignant1B'),
          enseignant2B: col('Enseignant2B'),      // ← NOUVEAU
          typeS1B:      col('TypeS1B'),           // ← NOUVEAU

          // ── Métadonnées
          newNature:    col('NewNature'),          // ← NOUVEAU
          debut:        col('Debut'),              // ← NOUVEAU
          duree:        col('Durée'),              // ← NOUVEAU
        };

        console.log("📍 Index colonnes:", idx);

        if (idx.classe === -1 || idx.seance === -1) {
          throw new Error(`Colonnes manquantes: Classe=${idx.classe}, Seance=${idx.seance}`);
        }

        // ── Compteurs ─────────────────────────────────────────────────────────

        let importedCount   = 0,
            errorCount      = 0,
            skippedCount    = 0,
            classesCreees   = 0,
            alternatingCount = 0;

        const notFoundMatieres    = new Set();
        const notFoundSalles      = new Set();
        const notFoundEnseignants = new Set();

        // ── Helper : résoudre un enseignant (loggue si absent) ───────────────

        const resolveEnseignant = (csv) => {
          if (!isNonEmpty(csv)) return null;
          const id = enseignantMap.get(normalizeString(csv));
          if (!id) notFoundEnseignants.add(csv);
          return id ?? null;
        };

        // ── Helper : tenter l'insertion ───────────────────────────────────────

        const tryAddSeance = async (payload, label) => {
          try {
            await addSeance(payload);
            importedCount++;
            if (importedCount % 100 === 0) console.log(`📊 ${importedCount} séances importées...`);
            return true;
          } catch (err) {
            if (!err.message?.includes('UNIQUE')) {
              console.error(`❌ Erreur SQL [${label}]:`, err.message);
            }
            errorCount++;
            return false;
          }
        };

        // ── Parser une ligne CSV (gestion guillemets) ─────────────────────────

        const parseLine = (line) => {
          const values = [];
          let current = '', inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (line[j + 1] === '"') { current += '"'; j++; }
              else inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          return values.map(x => x.replace(/^"|"$/g, '').trim());
        };

        // ── Boucle principale ─────────────────────────────────────────────────

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line?.trim()) { skippedCount++; continue; }

          const v = parseLine(line);
          const get = (index) => (index !== -1 ? (v[index] || '') : '');

          // Champs identité
          const classeCSV  = get(idx.classe);
          const seanceRaw  = get(idx.seance);
          const trancheCSV = idx.tranche !== -1 ? (get(idx.tranche) || '1') : '1';

          // Séance principale
          const matiereCSV    = get(idx.matiere);
          const salleCSV      = get(idx.salle);
          const enseignant1CSV = get(idx.enseignant1);
          const enseignant2CSV = get(idx.enseignant2);
          const typeS1         = get(idx.typeS1) || '1';

          // Séance B
          const matiereBCSV    = get(idx.matiereB);
          const salleBCSV      = get(idx.salleB);
          const enseignant1BCSV = get(idx.enseignant1B);
          const enseignant2BCSV = get(idx.enseignant2B);
          const typeS1B         = get(idx.typeS1B) || '1';

          // Métadonnées
          const newNature = get(idx.newNature) || null;
          const debutRaw  = get(idx.debut)     || null;
          const dureeRaw  = get(idx.duree)     || null;
          const duree     = dureeRaw ? parseInt(dureeRaw, 10) || null : null;

          // Debug ligne 1
          if (i === 1) {
            console.log(`🔬 Ligne 1:`,
              { classeCSV, seanceRaw, matiereCSV, salleCSV, enseignant1CSV, enseignant2CSV,
                typeS1, matiereBCSV, salleBCSV, enseignant1BCSV, enseignant2BCSV, typeS1B,
                newNature, debut: debutRaw, duree });
          }

          // Extraire jour + numéro séance depuis "Mardi2", "Jeudi1"...
          const match = seanceRaw.match(/^([A-Za-zÀ-ÖØ-öø-ÿ]+)(\d+)$/);
          if (!match) { skippedCount++; continue; }

          const jour          = match[1];
          const seanceNum     = match[2];
          const seanceElement = configData?.mapping?.[seanceNum] ?? seanceNum;
          const semestre      = trancheCSV === '2' ? 'S2' : 'S1';

          // Champs communs à tous les payloads de cette ligne
          const meta = { debut: debutRaw, duree, new_nature: newNature };

          if (!classeCSV || !jour || !seanceElement) { skippedCount++; continue; }

          // Résolution classe
          let classeId = classeMap.get(classeCSV) ?? classeMap.get(normalizeString(classeCSV));
          if (!classeId) {
            classeId = await findOrCreateClasse(classeCSV);
            classeMap.set(classeCSV, classeId);
            classeMap.set(normalizeString(classeCSV), classeId);
            classesCreees++;
          }

          const hasAlternating = isNonEmpty(matiereBCSV) && isNonEmpty(salleBCSV);

          // ────────────────────────────────────────────────────────────────────
          // CAS 1 : Alternance paire / impaire
          // ────────────────────────────────────────────────────────────────────
          if (hasAlternating) {
            let insertedAny = false;

            // ── Séance principale → semaine paire ───────────────────────────
            if (isNonEmpty(matiereCSV) && isNonEmpty(salleCSV)) {
              const matiereId = matiereMap.get(normalizeString(matiereCSV));
              if (!matiereId) {
                notFoundMatieres.add(matiereCSV);
              } else {
                const salleId = salleMap.get(salleCSV) ?? salleMap.get(normalizeString(salleCSV));
                if (!salleId) {
                  notFoundSalles.add(salleCSV);
                } else {
                  const ok = await tryAddSeance({
                    jour, seance: seanceElement,
                    type:          resolveType(typeS1),
                    classe_id:     classeId,
                    enseignant_id:  resolveEnseignant(enseignant1CSV),
                    enseignant2_id: resolveEnseignant(enseignant2CSV),
                    matiere_id:    matiereId,
                    salle_id:      salleId,
                    semaine_type:  'paire',
                    repartition:   'toute_classe',
                    rattrapage:    false,
                    semestre,
                    ...meta,
                  }, `${classeCSV} ${seanceRaw} paire`);
                  if (ok) insertedAny = true;
                }
              }
            }

            // ── Séance B → semaine impaire ───────────────────────────────────
            const matiereBId = matiereMap.get(normalizeString(matiereBCSV));
            if (!matiereBId) {
              notFoundMatieres.add(matiereBCSV);
            } else {
              const salleBId = salleMap.get(salleBCSV) ?? salleMap.get(normalizeString(salleBCSV));
              if (!salleBId) {
                notFoundSalles.add(salleBCSV);
              } else {
                const ok = await tryAddSeance({
                  jour, seance: seanceElement,
                  type:          resolveType(typeS1B),
                  classe_id:     classeId,
                  enseignant_id:  resolveEnseignant(enseignant1BCSV),
                  enseignant2_id: resolveEnseignant(enseignant2BCSV),
                  matiere_id:    matiereBId,
                  salle_id:      salleBId,
                  semaine_type:  'impair',
                  repartition:   'toute_classe',
                  rattrapage:    false,
                  semestre,
                  ...meta,
                }, `${classeCSV} ${seanceRaw} impair`);
                if (ok) { insertedAny = true; alternatingCount++; }
              }
            }

            if (!insertedAny) skippedCount++;
            continue;
          }

          // ────────────────────────────────────────────────────────────────────
          // CAS 2 : Séance simple (toutes semaines)
          // ────────────────────────────────────────────────────────────────────
          if (!isNonEmpty(matiereCSV) || !isNonEmpty(salleCSV)) { skippedCount++; continue; }

          const matiereId = matiereMap.get(normalizeString(matiereCSV));
          if (!matiereId) { notFoundMatieres.add(matiereCSV); continue; }

          const salleId = salleMap.get(salleCSV) ?? salleMap.get(normalizeString(salleCSV));
          if (!salleId) { notFoundSalles.add(salleCSV); continue; }

          await tryAddSeance({
            jour, seance: seanceElement,
            type:          resolveType(typeS1),
            classe_id:     classeId,
            enseignant_id:  resolveEnseignant(enseignant1CSV),
            enseignant2_id: resolveEnseignant(enseignant2CSV),
            matiere_id:    matiereId,
            salle_id:      salleId,
            semaine_type:  'toutes',
            repartition:   'toute_classe',
            rattrapage:    false,
            semestre,
            ...meta,
          }, `${classeCSV} ${seanceRaw}`);
        }

        // ── Résumé ────────────────────────────────────────────────────────────

        console.log(`\n=== RÉSUMÉ IMPORT ===`);
        console.log(`✅ Séances importées : ${importedCount} (dont ${alternatingCount} séances B alternées)`);
        console.log(`➕ Classes créées    : ${classesCreees}`);
        console.log(`❌ Erreurs SQL       : ${errorCount}`);
        console.log(`⚠️  Lignes ignorées  : ${skippedCount}`);
        console.log(`📚 Matières non trouvées (${notFoundMatieres.size}):`,    [...notFoundMatieres].slice(0, 10));
        console.log(`🏢 Salles non trouvées (${notFoundSalles.size}):`,        [...notFoundSalles].slice(0, 10));
        console.log(`👨‍🏫 Enseignants non trouvés (${notFoundEnseignants.size}):`, [...notFoundEnseignants].slice(0, 10));

        resolve({
          success:          true,
          importedCount,
          alternatingCount,
          classesCreees,
          errorCount,
          skippedCount,
          notFoundMatieres:    [...notFoundMatieres],
          notFoundSalles:      [...notFoundSalles],
          notFoundEnseignants: [...notFoundEnseignants],
        });

      } catch (error) {
        console.error("❌ Erreur fatale:", error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erreur lecture fichier"));
    reader.readAsText(file, 'UTF-8');
  });
};

export const importEmploiForClass = importEmploiFromCSV;
export const importAllEmploi      = importEmploiFromCSV;