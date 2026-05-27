// src/database/salles.js
import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS salles (
        id            TEXT PRIMARY KEY,
        capacite      INTEGER,
        capacite_ex   INTEGER,
        type          TEXT,
        etat          TEXT,
        code_proemp   TEXT,
        soutenance    INTEGER DEFAULT 0,
        salle_smartex TEXT
      )
    `);
  }
  return db;
};

export const getSalles = async () => {
  const db = await getDB();
  return await db.select("SELECT * FROM salles ORDER BY type, id");
};

export const addSalle = async (salle) => {
  const db = await getDB();
  return await db.execute(
    `INSERT INTO salles (id, capacite, capacite_ex, type, etat, code_proemp, soutenance, salle_smartex)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      salle.id,
      salle.capacite ?? null,
      salle.capacite_ex ?? null,
      salle.type ?? null,
      salle.etat ?? null,
      salle.code_proemp ?? null,
      salle.soutenance ? 1 : 0,
      salle.salle_smartex ?? null,
    ]
  );
};

export const updateSalle = async (salle) => {
  const db = await getDB();
  return await db.execute(
    `UPDATE salles SET capacite=?, capacite_ex=?, type=?, etat=?, code_proemp=?, soutenance=?, salle_smartex=?
     WHERE id=?`,
    [
      salle.capacite ?? null,
      salle.capacite_ex ?? null,
      salle.type ?? null,
      salle.etat ?? null,
      salle.code_proemp ?? null,
      salle.soutenance ? 1 : 0,
      salle.salle_smartex ?? null,
      salle.id,
    ]
  );
};

export const deleteSalle = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM salles WHERE id = ?", [id]);
};

export const checkSalleExists = async (id) => {
  const db = await getDB();
  const result = await db.select("SELECT id FROM salles WHERE id = ?", [id]);
  return result.length > 0;
};

// Exporter getSeancesBySalle depuis seances.js pour faciliter l'import
export { getSeancesBySalle } from './seances';