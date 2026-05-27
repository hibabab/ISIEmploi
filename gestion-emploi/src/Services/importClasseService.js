import * as XLSX from "xlsx";
import { getDB } from "../database/classes";

export const importClassesFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          return resolve({ success: false, message: "❌ Fichier vide" });
        }

        const classesVues = new Set();
        for (const row of rows) {
          const nom = (row["Classe"] ?? "").toString().trim();
          if (nom) classesVues.add(nom);
        }

        console.log(`📋 ${classesVues.size} classes trouvées:`, [...classesVues]);

        const db = await getDB();
        let importedCount = 0, skippedCount = 0;

        for (const nom of classesVues) {
          const result = await db.execute(
            // id = nom (TEXT PRIMARY KEY)
            "INSERT OR IGNORE INTO classes (id, nom) VALUES (?, ?)",
            [nom, nom]
          );
          result.rowsAffected > 0 ? importedCount++ : skippedCount++;
        }

        resolve({
          success: true,
          importedCount,
          skippedCount,
          totalCount: classesVues.size,
          message: `✅ ${importedCount} classes importées | ⏭️ ${skippedCount} déjà existantes`,
        });
      } catch (error) {
        console.error("❌ Erreur import classes:", error);
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erreur lecture fichier"));
    reader.readAsArrayBuffer(file);
  });
};