// src/Services/exportEmploiService.js
//
// Génère un CSV identique au format d'import (ancienne plateforme).
//
// Logique clé :
//  - Séances "toutes"  → une ligne (Matière côté A, MatièreB vide)
//  - Séances "paire" + "impair" sur le même (jour, seance, classe)
//    → fusionnées en UNE seule ligne (A = paire, B = impaire)
//  - Séances planifiées (date_seance non null) → incluses UNIQUEMENT si
//    leur date tombe dans la semaine PROCHAINE (lundi→samedi suivant le
//    dimanche de l'export, conformément à "export chaque dimanche")
//
// Colonnes produites (ordre exact du fichier original) :
//   Classe, Seance, Tranche,
//   Matière, Salle, Enseignant1, Enseignant2, Enseignant3,
//   XMatière, XSalle, XEnseignant1, XEnseignant2, XEnseignant3,
//   YMatière, YSalle, YEnseignant1, YEnseignant2, YEnseignant3,
//   MatièreB, SalleB, Enseignant1B, Enseignant2B, Enseignant3B,
//   XMatièreB, XSalleB, XEnseignant1B, XEnseignant2B, XEnseignant3B,
//   YMatièreB, YSalleB, YEnseignant1B, YEnseignant2B, YEnseignant3B,
//   NewNature, TypeS1, TypeS2, TypeS3, TypeS1B, TypeS2B, TypeS3B,
//   Durée, Commune, Debut

import { getDB } from "../database/seances";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mapping type libellé → code numérique TypeS (inverse du mapping import) */
const TYPE_TO_CODE = {
  'Cours': 1,
  'TD':    2,
  'CI':    3,
  'TP':    5,
};
const typeCode = (t) => TYPE_TO_CODE[t] ?? 1;

/**
 * Construit le code "Seance" du CSV à partir de (jour TEXT, seance TEXT).
 * En base, jour est stocké comme le texte brut du CSV ("Lundi", "Mardi"…)
 * et seance est l'élément de config ("08:00-09:30" ou un chiffre brut).
 * On a besoin de retrouver le numéro d'ordre de la séance dans la journée.
 * On le stocke via la colonne Durée/Debut ; mais le code Seance du CSV
 * est en fait directement le champ `seance` tel qu'il a été importé
 * (ex: "Mardi2").  Comme on l'a stocké tel quel lors de l'import, on le
 * reconstruit : jour + index de séance.
 *
 * ATTENTION : dans l'import on a fait :
 *   seanceElement = configData.mapping[seanceNum] ?? seanceNum
 * Donc en base, seance peut valoir l'élément de config (ex "08:00-09:30")
 * OU le chiffre brut si pas de config.
 * Pour l'export on a besoin du code original "Jour+Num".
 * On stocke aussi `debut` (ex "08:00") — on va s'en servir pour
 * retrouver le numéro d'ordre via la config, ou on utilise le code brut
 * stocké dans seance si c'est un chiffre.
 *
 * Solution pragmatique : on reconstruit "Jour + rang" en triant les séances
 * d'un même jour par heure de début.
 */

/** Jours en français → numéro de tri (pour ORDER BY cohérent) */
const JOUR_ORDER = {
  Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6
};

/** Entoure de guillemets si nécessaire (valeurs CSV) */
const q = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return '"' + s + '"';
};

/** Semaine prochaine : [lundi, samedi] à partir d'aujourd'hui (dimanche) */
const getNextWeekRange = () => {
  const today = new Date();
  // On avance jusqu'au prochain lundi (même si on n'est pas dimanche)
  const dayOfWeek = today.getDay(); // 0=dim, 1=lun…
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5); // lundi + 5 = samedi
  saturday.setHours(23, 59, 59, 999);
  return { monday, saturday };
};

const dateInRange = (dateStr, monday, saturday) => {
  const d = new Date(dateStr);
  return d >= monday && d <= saturday;
};

/** Convertit une date ISO en "JourN" (ex: "2025-01-06" lundi → "Lundi1")
 *  en utilisant le rang de la séance dans la journée basé sur l'heure debut */
const dateToJourLabel = (dateStr) => {
  const d = new Date(dateStr);
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  return jours[d.getDay()];
};

// ─── Requête principale ────────────────────────────────────────────────────────

const fetchAllSeances = async () => {
  const db = await getDB();
  return await db.select(`
    SELECT
      s.id,
      s.jour,
      s.seance,
      s.semaine_type,
      s.semestre,
      s.type,
      s.debut,
      s.duree,
      s.new_nature,
      s.date_seance,
      s.classe_id,
      c.nom        AS classe_nom,
      s.matiere_id,
      m.libelle    AS matiere_libelle,
      s.salle_id,
      s.enseignant_id,
      e1.nom       AS ens1_nom,
      e1.prenom    AS ens1_prenom,
      s.enseignant2_id,
      e2.nom       AS ens2_nom,
      e2.prenom    AS ens2_prenom
    FROM seances s
    LEFT JOIN classes     c   ON c.id  = s.classe_id
    LEFT JOIN matieres    m   ON m.id  = s.matiere_id
    LEFT JOIN salles      sa  ON sa.id = s.salle_id
    LEFT JOIN enseignants e1  ON e1.id = s.enseignant_id
    LEFT JOIN enseignants e2  ON e2.id = s.enseignant2_id
    ORDER BY
      s.classe_id,
      CASE s.jour
        WHEN 'Lundi'    THEN 1 WHEN 'Mardi'    THEN 2
        WHEN 'Mercredi' THEN 3 WHEN 'Jeudi'    THEN 4
        WHEN 'Vendredi' THEN 5 WHEN 'Samedi'   THEN 6
        ELSE 7
      END,
      s.debut,
      s.semestre
  `);
};

// ─── Construction du nom enseignant (NOM Prenom) ──────────────────────────────

const ensNom = (row, prefix) => {
  // prefix = 'ens1' ou 'ens2'
  const nom    = row[`${prefix}_nom`]    || '';
  const prenom = row[`${prefix}_prenom`] || '';
  if (!nom && !prenom) return '';
  return prenom ? `${nom} ${prenom}`.trim() : nom.trim();
};

// ─── Reconstituer le code "Seance" CSV (ex: "Mardi2") ────────────────────────
//
// Stratégie : on utilise `debut` (ex "09:40") pour déterminer le rang
// dans la journée. On mappe les heures standard :
const DEBUT_TO_NUM = {
  '08:00': 1,
  '09:40': 2,
  '11:20': 3,
  '13:40': 4,
  '15:20': 5,
  '17:00': 6,
};
const seanceCode = (jour, debut) => {
  const num = debut ? (DEBUT_TO_NUM[debut] ?? debut) : '?';
  return `${jour}${num}`;
};

// ─── Assemblage des lignes CSV ─────────────────────────────────────────────────

/**
 * Regroupe les séances paire/impaire du même (classe, jour, seance_num)
 * en un seul objet { seanceA, seanceB }.
 * Les séances "toutes" restent seules { seanceA, seanceB: null }.
 * Les séances planifiées restent seules aussi.
 */
const groupSeances = (rows) => {
  const groups = new Map(); // clé: "classe_id|jour|debut|semestre"
  const planned = [];       // séances avec date_seance

  for (const row of rows) {
    // Séances planifiées → traitement séparé
    if (row.date_seance) {
      planned.push(row);
      continue;
    }

    const key = `${row.classe_id}|${row.jour}|${row.debut ?? row.seance}|${row.semestre}`;

    if (!groups.has(key)) {
      groups.set(key, { seanceA: null, seanceB: null });
    }
    const g = groups.get(key);

    if (row.semaine_type === 'impair') {
      g.seanceB = row;
    } else {
      // 'toutes' ou 'paire' → côté A
      g.seanceA = row;
    }
  }

  return { groups, planned };
};

/**
 * Détermine NewNature et TypeS1B à partir du groupe.
 * - Si seanceB existe → "10/20", TypeS1B = typeCode(seanceB.type)
 * - Sinon            → "00",    TypeS1B = 0
 */
const buildNewNature = (seanceA, seanceB) => {
  if (seanceB) return seanceA?.new_nature || '10/20';
  return seanceA?.new_nature || '00';
};

/** Construit le code Durée (colonne Durée du CSV) */
const buildDureeCode = (seanceA, seanceB) => {
  // Dans le CSV original, Durée semble être un code composite Jour+Num (ex: 22 = Mardi séance 2)
  // On le reconstruit depuis jour + debut
  const row = seanceA || seanceB;
  if (!row) return 0;
  const jourNum = JOUR_ORDER[row.jour] ?? 0;
  const seanceNum = row.debut ? (DEBUT_TO_NUM[row.debut] ?? 0) : 0;
  return jourNum * 10 + seanceNum;
};

/** Formate un enseignant complet "NOM Prenom" depuis les colonnes brutes */
const formatEns = (nom, prenom) => {
  if (!nom && !prenom) return '';
  return prenom ? `${nom} ${prenom}`.trim() : (nom || '').trim();
};

// ─── Construction d'une ligne CSV ─────────────────────────────────────────────

const EMPTY_COLS_5 = ',,,,,';        // 5 colonnes vides (X ou Y groupes)
const EMPTY_3      = ',,,';          // 3 colonnes vides

/**
 * Retourne les 43 valeurs de la ligne dans l'ordre exact du CSV.
 * Toutes les colonnes X*, Y*, Enseignant3* sont laissées vides (non utilisées).
 */
const buildRow = (seanceA, seanceB, overrideJour = null, overrideCode = null) => {
  const ref   = seanceA || seanceB;
  const classe = ref.classe_id || ref.classe_nom || '';
  const jour   = overrideJour || ref.jour;
  const debut  = ref.debut;
  const code   = overrideCode || seanceCode(jour, debut);
  const tranche = ref.semestre === 'S2' ? 2 : 1;

  // ── Côté A (principale / paire / toutes) ──
  const matiereA = seanceA ? (seanceA.matiere_libelle || '') : ' ';
  const salleA   = seanceA ? (seanceA.salle_id        || '') : '';
  const ens1A    = seanceA ? formatEns(seanceA.ens1_nom, seanceA.ens1_prenom) : '';
  const ens2A    = seanceA ? formatEns(seanceA.ens2_nom, seanceA.ens2_prenom) : '';
  const typeA    = seanceA ? typeCode(seanceA.type) : 0;

  // ── Côté B (alternée / impaire) ──
  const matiereB = seanceB ? (seanceB.matiere_libelle || '') : '';
  const salleB   = seanceB ? (seanceB.salle_id        || '') : '';
  const ens1B    = seanceB ? formatEns(seanceB.ens1_nom, seanceB.ens1_prenom) : '';
  const ens2B    = seanceB ? formatEns(seanceB.ens2_nom, seanceB.ens2_prenom) : '';
  const typeB    = seanceB ? typeCode(seanceB.type) : 0;

  // ── Métadonnées ──
  const newNature = buildNewNature(seanceA, seanceB);
  const dureeCode = buildDureeCode(seanceA, seanceB);
  const dureeMin  = ref.duree ?? 90;

  // 43 colonnes dans l'ordre :
  // 1  Classe
  // 2  Seance
  // 3  Tranche                    (pas de guillemets dans l'original)
  // 4  Matière
  // 5  Salle
  // 6  Enseignant1
  // 7  Enseignant2
  // 8  Enseignant3                (toujours vide)
  // 9  XMatière                   (toujours vide)
  // 10 XSalle                     (toujours vide)
  // 11 XEnseignant1               (toujours vide)
  // 12 XEnseignant2               (toujours vide)
  // 13 XEnseignant3               (toujours vide)
  // 14 YMatière                   (toujours vide)
  // 15 YSalle                     (toujours vide)
  // 16 YEnseignant1               (toujours vide)
  // 17 YEnseignant2               (toujours vide)
  // 18 YEnseignant3               (toujours vide)
  // 19 MatièreB
  // 20 SalleB
  // 21 Enseignant1B
  // 22 Enseignant2B
  // 23 Enseignant3B               (toujours vide)
  // 24 XMatièreB                  (toujours vide)
  // 25 XSalleB                    (toujours vide)
  // 26 XEnseignant1B              (toujours vide)
  // 27 XEnseignant2B              (toujours vide)
  // 28 XEnseignant3B              (toujours vide)
  // 29 YMatièreB                  (toujours vide)
  // 30 YSalleB                    (toujours vide)
  // 31 YEnseignant1B              (toujours vide)
  // 32 YEnseignant2B              (toujours vide)
  // 33 YEnseignant3B              (toujours vide)
  // 34 NewNature
  // 35 TypeS1
  // 36 TypeS2                     (toujours 0)
  // 37 TypeS3                     (toujours 0)
  // 38 TypeS1B
  // 39 TypeS2B                    (toujours 0)
  // 40 TypeS3B                    (toujours 0)
  // 41 Durée                      (code composite JourNum)
  // 42 Commune                    (toujours 90 ou durée réelle)
  // 43 Debut

  const cols = [
    q(classe),           // 1
    q(code),             // 2
    tranche,             // 3  pas de guillemets
    q(matiereA),         // 4
    q(salleA),           // 5
    q(ens1A),            // 6
    q(ens2A),            // 7
    '',                  // 8  Enseignant3 vide
    '',                  // 9  XMatière vide
    '',                  // 10 XSalle vide
    '',                  // 11 XEnseignant1 vide
    '',                  // 12 XEnseignant2 vide
    '',                  // 13 XEnseignant3 vide
    '',                  // 14 YMatière vide
    '',                  // 15 YSalle vide
    '',                  // 16 YEnseignant1 vide
    '',                  // 17 YEnseignant2 vide
    '',                  // 18 YEnseignant3 vide
    q(matiereB),         // 19
    q(salleB),           // 20
    q(ens1B),            // 21
    q(ens2B),            // 22
    '',                  // 23 Enseignant3B vide
    '',                  // 24 XMatièreB vide
    '',                  // 25 XSalleB vide
    '',                  // 26 XEnseignant1B vide
    '',                  // 27 XEnseignant2B vide
    '',                  // 28 XEnseignant3B vide
    '',                  // 29 YMatièreB vide
    '',                  // 30 YSalleB vide
    '',                  // 31 YEnseignant1B vide
    '',                  // 32 YEnseignant2B vide
    '',                  // 33 YEnseignant3B vide
    q(newNature),        // 34
    typeA,               // 35 TypeS1
    0,                   // 36 TypeS2
    0,                   // 37 TypeS3
    typeB,               // 38 TypeS1B
    0,                   // 39 TypeS2B
    0,                   // 40 TypeS3B
    dureeCode,           // 41 Durée (code composite)
    dureeMin,            // 42 Commune (durée en minutes)
    q(debut || ''),      // 43 Debut
  ];

  return cols.join(',');
};

// ─── En-tête CSV ──────────────────────────────────────────────────────────────

const CSV_HEADER =
  'Classe,Seance,Tranche,Matière,Salle,Enseignant1,Enseignant2,Enseignant3,' +
  'XMatière,XSalle,XEnseignant1,XEnseignant2,XEnseignant3,' +
  'YMatière,YSalle,YEnseignant1,YEnseignant2,YEnseignant3,' +
  'MatièreB,SalleB,Enseignant1B,Enseignant2B,Enseignant3B,' +
  'XMatièreB,XSalleB,XEnseignant1B,XEnseignant2B,XEnseignant3B,' +
  'YMatièreB,YSalleB,YEnseignant1B,YEnseignant2B,YEnseignant3B,' +
  'NewNature,TypeS1,TypeS2,TypeS3,TypeS1B,TypeS2B,TypeS3B,Durée,Commune,Debut';

// ─── Export principal ─────────────────────────────────────────────────────────

export const exportEmploiToCSV = async () => {
  try {
    const allSeances = await fetchAllSeances();
    const { groups, planned } = groupSeances(allSeances);
    const { monday, saturday } = getNextWeekRange();

    const lines = [CSV_HEADER];

    // ── 1. Séances fixes (toutes / paire+impaire fusionnées) ─────────────────
    for (const [, g] of groups) {
      const { seanceA, seanceB } = g;
      if (!seanceA && !seanceB) continue;
      lines.push(buildRow(seanceA, seanceB));
    }

    // ── 2. Séances planifiées (date précise) dans la semaine suivante ─────────
    //    Chaque séance planifiée → 1 ligne individuelle.
    //    Le code Seance utilise le jour réel de la date (ex: "Mardi2").
    const plannedInRange = planned.filter(r => dateInRange(r.date_seance, monday, saturday));

    for (const row of plannedInRange) {
      const jour = dateToJourLabel(row.date_seance);
      const code = seanceCode(jour, row.debut);
      lines.push(buildRow(row, null, jour, code));
    }

    const csvContent = lines.join('\n');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}` +
                      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `export-${timestamp}-emploi.csv`;

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

    return {
      success:        true,
      filename,
      totalRows:      lines.length - 1,
      fixedCount:     groups.size,
      plannedCount:   plannedInRange.length,
      weekRange:      {
        from: monday.toISOString().split('T')[0],
        to:   saturday.toISOString().split('T')[0],
      },
    };

  } catch (error) {
    console.error('❌ Export emploi échoué:', error);
    return { success: false, error: error.message };
  }
};

// ─── Téléchargement ───────────────────────────────────────────────────────────

const downloadFile = (data, filename, mimeType) => {
  const BOM = '\uFEFF'; // BOM UTF-8 pour Excel
  const blob = new Blob([BOM + data], { type: mimeType });
  const link  = document.createElement('a');
  const url   = URL.createObjectURL(blob);
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};