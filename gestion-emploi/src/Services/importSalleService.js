// src/Services/importSalleService.js
import { addSalle, checkSalleExists } from "../database/salles";

export const importSallesFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split(/\r?\n/);
        if (lines.length < 2) {
          return resolve({ success: true, importedCount: 0, duplicateCount: 0 });
        }

        // Lire l'en-tête pour mapper les colonnes dynamiquement
        const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
        // headers attendus : id, capacite, capacite_ex, type, etat, code_proemp, soutenance, salle_smartex

        const col = (row, name) => {
          const idx = headers.indexOf(name);
          if (idx === -1 || idx >= row.length) return null;
          const val = row[idx].replace(/^"|"$/g, "").trim();
          return val === "" ? null : val;
        };

        const uniqueIds = new Set();
        let imported = 0;
        let duplicates = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(",");

          const id = col(cols, "id");
          if (!id || id === "0" || id === "00") continue;

          if (uniqueIds.has(id)) {
            duplicates++;
            continue;
          }

          const exists = await checkSalleExists(id);
          if (exists) {
            duplicates++;
            continue;
          }

          const salle = {
            id,
            capacite:      col(cols, "capacite")     ? parseInt(col(cols, "capacite"))     : null,
            capacite_ex:   col(cols, "capacite_ex")  ? parseInt(col(cols, "capacite_ex"))  : null,
            type:          col(cols, "type"),
            etat:          col(cols, "etat"),
            code_proemp:   col(cols, "code_proemp"),
            soutenance:    col(cols, "soutenance")?.toLowerCase() === "true",
            salle_smartex: col(cols, "salle_smartex"),
          };

          await addSalle(salle);
          uniqueIds.add(id);
          imported++;
          console.log(`✅ Importé: ${id}`);
        }

        console.log(`Importé: ${imported}, Doublons: ${duplicates}`);
        resolve({ success: true, importedCount: imported, duplicateCount: duplicates });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Échec de lecture du fichier"));
    reader.readAsText(file, "UTF-8");
  });
};