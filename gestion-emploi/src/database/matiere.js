import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS matieres (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        abr TEXT NOT NULL,
        libelle TEXT NOT NULL,
        coef REAL NOT NULL,
        heure_cours REAL NOT NULL,
        heure_td REAL NOT NULL,
        heure_tp REAL NOT NULL,
        total REAL GENERATED ALWAYS AS (heure_cours + heure_td + heure_tp) STORED,
        unite_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE CASCADE
      )
    `);
  }
  return db;
};

export const getMatieres = async () => {
  const db = await getDB();
  return await db.select("SELECT * FROM matieres");
};

export const addMatiere = async (id, code, abr, libelle, coef, heureCours, heureTd, heureTp, uniteId) => {
  const db = await getDB();
  return await db.execute(
    "INSERT INTO matieres (id, code, abr, libelle, coef, heure_cours, heure_td, heure_tp, unite_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, code, abr, libelle, coef, heureCours, heureTd, heureTp, uniteId]
  );
};

export const updateMatiere = async (id, code, abr, libelle, coef, heureCours, heureTd, heureTp) => {
  const db = await getDB();
  return await db.execute(
    `UPDATE matieres
     SET code = ?, abr = ?, libelle = ?, coef = ?, heure_cours = ?, heure_td = ?, heure_tp = ?
     WHERE id = ?`,
    [code, abr, libelle, coef, heureCours, heureTd, heureTp, id]
  );
};

export const getMatieresByUnite = async (uniteId) => {
  const db = await getDB();
  return await db.select(
    "SELECT * FROM matieres WHERE unite_id = ? ORDER BY created_at",
    [uniteId]
  );
};

export const deleteMatiere = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM matieres WHERE id = ?", [id]);
};