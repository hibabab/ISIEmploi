// src/Services/exportSalleService.js
import { getSalles } from "../database/salles";

const HEADERS = [
  "id",
  "capacite",
  "capacite_ex",
  "type",
  "etat",
  "code_proemp",
  "soutenance",
  "salle_smartex",
];

const downloadFile = (data, filename, mimeType) => {
  const blob = new Blob([data], { type: mimeType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCSV = (val) => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportSallesToCSV = async () => {
  try {
    const salles = await getSalles();

    if (!salles || salles.length === 0) {
      return { success: false, error: "Aucune salle à exporter." };
    }

    const csvData = [HEADERS.join(",")];

    salles.forEach((salle) => {
      const row = HEADERS.map((h) => {
        // Convertir soutenance (0/1 SQLite) → True/False
        if (h === "soutenance") return escapeCSV(salle[h] ? "True" : "False");
        return escapeCSV(salle[h]);
      });
      csvData.push(row.join(","));
    });

    const filename = `salles_${new Date().toISOString().slice(0, 10)}.csv`;
    const csvString = "\uFEFF" + csvData.join("\r\n"); // BOM UTF-8

    downloadFile(csvString, filename, "text/csv;charset=utf-8;");

    return { success: true, exportedCount: salles.length, filename };

  } catch (error) {
    console.error("Erreur export salles:", error);
    return { success: false, error: error.message || String(error) };
  }
};