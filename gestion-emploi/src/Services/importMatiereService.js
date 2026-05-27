
// src/Services/importMatiereService.js
import { addMatiere } from "../database/matiere";
import { getDB } from "../database/unite";

// Correspondance entre IDs du CSV matières et IDs réels des unités
const UNITE_ID_MAPPING = {
  "M1DLAr3": "M1DLAr2",
  "M1DLVT3": "M1DLVT2",
  "M1P2LUE111": "M1P2LUE110",
  "M1P2LUE121": "M1P2LUE120",
  "M1P2LUE131": "M1P2LUE130",
  "M1P2LUE1401": "M1P2LUE140",
  "M1P2LUE141": "M1P2LUE140",
  "M1P2LUE151": "M1P2LUE150",
  "M1P2LUE2501": "M1P2LUE2500",
  "M1P2LUE3601": "M1P2LUE3600",
  "M1P2LUE4701": "M1P2LUE4700",
  "M1P2LUE5801": "M1P2LUE5800",
  "M1SIIoTI11": "M1SIIoTI10",
  "M1SIIoTIO10": "M1SIIoTIO1",
  "M1SIIoTIO2": "M1SIIoTio2",
  "M1SIIoTio3": "M1SIIoTIO3",
  "M2DLAr4": "M2DLAr3",
  "M2DLVT4": "M2DLVT3",
  "M2P2LUE161": "M2P2LUE160",
  "M2P2LUE171": "M2P2LUE170",
  "M2P2LUE181": "M2P2LUE180",
  "M2P2LUE201": "M2P2LUE200",
  "M2SIIoTI16": "M2SIIoTI15",
};

export const importMatieresFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split('\n');
        let importedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Récupérer toutes les unités d'enseignement
        const db = await getDB();
        const unites = await db.select("SELECT id, code FROM unites");
        const unitesMap = new Map();
        unites.forEach(u => {
          if (u.code) unitesMap.set(u.code, u.id);
          if (u.id) unitesMap.set(u.id, u.id);
        });

        console.log(`=== DÉBUT IMPORT MATIÈRES ===`);
        console.log(`Unités disponibles dans la base: ${unites.length}`);
        console.log(`Nombre total de lignes CSV: ${lines.length}`);

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) {
            skippedCount++;
            continue;
          }

          // Extraire les champs en tenant compte des guillemets
          let fields = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (line[j + 1] === '"') {
                current += '"';
                j++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              fields.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current);
          fields = fields.map(f => f.trim());

          // Index des champs:
          // [0]: code_ee, [1]: id, [2]: libelle_ee, [3]: coef_ee,
          // [6]: cours_ee, [7]: td_ee, [8]: tp_ee,
          // [20]: unite_ens, [21]: abrv_ee

          if (fields.length >= 21) {
            const id = fields[1];
            const code = fields[0];
            const abr = fields[21] || fields[2];
            const libelle = fields[2];
            const coef = parseFloat(fields[3]) || 0;
            const heureCours = parseFloat(fields[6]) || 0;
            const heureTd = parseFloat(fields[7]) || 0;
            const heureTp = parseFloat(fields[8]) || 0;
            const rawUniteCode = (fields[20] || "").replace(/^"|"$/g, '').trim();

            // Appliquer le mapping si nécessaire
            const uniteCode = UNITE_ID_MAPPING[rawUniteCode] || rawUniteCode;

            // Chercher l'ID de l'unité
            const uniteId = uniteCode ? unitesMap.get(uniteCode) : null;

            if (id && code && uniteId) {
              try {
                await addMatiere(id, code, abr, libelle, coef, heureCours, heureTd, heureTp, uniteId);
                importedCount++;
                if (importedCount % 100 === 0) {
                  console.log(`📊 ${importedCount} matières importées...`);
                }
              } catch (err) {
                errorCount++;
                const msg = err?.message || JSON.stringify(err);
                if (!msg.includes('UNIQUE')) {
                  console.log(`❌ Erreur pour ${code}:`, msg);
                }
              }
            } else {
              errorCount++;
              if (!uniteId && rawUniteCode) {
                console.log(`⚠️ Unité non trouvée: "${rawUniteCode}" (mappé: "${uniteCode}") pour matière ${code}`);
              }
            }
          } else {
            skippedCount++;
          }
        }

        console.log(`\n=== RÉSUMÉ FINAL ===`);
        console.log(`✅ Matières importées: ${importedCount}`);
        console.log(`❌ Erreurs: ${errorCount}`);
        console.log(`⚠️ Ignorées: ${skippedCount}`);

        resolve({ success: true, importedCount, errorCount, skippedCount });

      } catch (error) {
        console.error("❌ Erreur fatale:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("❌ Erreur lecture fichier:", error);
      reject(error);
    };

    reader.readAsText(file, 'UTF-8');
  });
};