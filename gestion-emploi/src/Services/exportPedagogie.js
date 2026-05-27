// src/Services/exportPedagogie.js
import Database from "@tauri-apps/plugin-sql";
import * as XLSX from "xlsx";

let db;

const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");
  }
  return db;
};

const buildPedagogieRows = async () => {
  const db = await getDB();
  return await db.select(`
    SELECT
      f.id                        AS cod_diplome,
      f.libelle                   AS Lib_diplome,
      p.domaine                   AS cod_domaine,
      p.domaine                   AS lib_domaine,
      p.mention                   AS cod_mention,
      p.mention                   AS Lib_mention,
      p.specialite                AS cod_specialite,
      p.specialite                AS lib_specialite,
      p.code                      AS cod_parcours,
      p.abr_parcours              AS Abrev_parcours,
      'SEMESTRE ' || u.semestre   AS semestre,
      u.code                      AS cod_unite_ens,
      m.code                      AS cod_matiere,
      u.abr                       AS abrev_unite,
      m.abr                       AS Abrev_matiere,
      u.libelle                   AS lib_unite_ens,
      m.libelle                   AS lib_matiere,
      'O'                         AS Actif,
      'U'                         AS "Mode Credit U/M",
      u.libelle                   AS lib_unite_aff,
      u.code                      AS cod_unite_aff,
      u.regime                    AS "code Formule calcul",
      m.coef                      AS coef,
      u.credit                    AS crd,
      'M'                         AS "nat M/P",
      m.libelle                   AS "lib_matiere aff",
      m.code                      AS "cod_matiere aff",
      0                           AS Note_elim
    FROM matieres m
    JOIN unites u     ON m.unite_id    = u.id
    JOIN parcours p   ON u.parcours_id = p.id
    JOIN formations f ON p.formation_id = f.id
    ORDER BY f.id, p.code, u.semestre, u.code, m.code
  `);
};

const HEADERS = [
  "cod_diplome", "Lib_diplome", "cod_domaine", "lib_domaine",
  "cod_mention", "Lib_mention", "cod_specialite", "lib_specialite",
  "cod_parcours", "Abrev_parcours", "semestre", "cod_unite_ens",
  "cod_matiere", "abrev_unite", "Abrev_matiere", "lib_unite_ens",
  "lib_matiere", "Actif", "Mode Credit U/M", "lib_unite_aff",
  "cod_unite_aff", "code Formule calcul", "coef", "crd", "nat M/P",
  "lib_matiere aff", "cod_matiere aff", "Note_elim",
];

// Fonction utilitaire pour télécharger via le navigateur
const downloadFile = (data, filename, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportPedagogieXLS = async () => {
  try {
    const rows = await buildPedagogieRows();

    if (!rows || rows.length === 0) {
      return { success: false, error: "Aucune donnée à exporter." };
    }

    // Construire les données
    const sheetData = [
      HEADERS,
      ...rows.map(row =>
        HEADERS.map(h => {
          const val = row[h];
          return val === null || val === undefined ? "" : val;
        })
      ),
    ];

    // Créer le workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Pedagogie");
    
    // Optionnel: ajouter des feuilles vides supplémentaires si nécessaire
    // XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Feuil1");
    // XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Feuil2");
    // XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Feuil3");

    const filename = `export_pedagogie_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Générer le fichier et le télécharger
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadFile(wbout, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return { success: true, count: rows.length, filename };

  } catch (error) {
    console.error("Erreur export:", error);
    return { success: false, error: error.message || String(error) };
  }
};

export const exportPedagogieCSV = async () => {
  try {
    const rows = await buildPedagogieRows();

    if (!rows || rows.length === 0) {
      return { success: false, error: "Aucune donnée à exporter." };
    }

    // Convertir en CSV
    const csvData = [HEADERS.join(',')];
    
    rows.forEach(row => {
      const line = HEADERS.map(h => {
        let val = row[h];
        if (val === null || val === undefined) val = "";
        // Échapper les guillemets et les virgules
        if (typeof val === 'string') {
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
        }
        return val;
      }).join(',');
      csvData.push(line);
    });

    const filename = `export_pedagogie_${new Date().toISOString().slice(0, 10)}.csv`;
    const csvString = csvData.join('\n');
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    
    downloadFile(blob, filename, "text/csv");

    return { success: true, count: rows.length, filename };

  } catch (error) {
    console.error("Erreur export CSV:", error);
    return { success: false, error: error.message || String(error) };
  }
};