
import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS unites (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        abr TEXT NOT NULL,
        libelle TEXT NOT NULL,
        semestre INTEGER NOT NULL,
        credit REAL NOT NULL,
        regime TEXT NOT NULL DEFAULT '',
        coef REAL NOT NULL,
        parcours_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (parcours_id) REFERENCES parcours(id) ON DELETE CASCADE
      )
    `);

    try {
      await db.execute("ALTER TABLE unites ADD COLUMN regime TEXT NOT NULL DEFAULT ''");
    } catch (e) {
      // Colonne déjà existante, ignorer
    }
  }
  return db;
};

export const addUnite = async (id, code, abr, libelle, semestre, credit, regime, coef, parcoursId) => {
  const db = await getDB();
  return await db.execute(
    "INSERT OR IGNORE INTO unites (id, code, abr, libelle, semestre, credit, regime, coef, parcours_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, code, abr, libelle, semestre, credit, regime, coef, parcoursId]
  );
};

export const updateUnite = async (id, code, abr, libelle, semestre, credit, regime, coef) => {
  const db = await getDB();
  return await db.execute(
    `UPDATE unites SET code = ?, abr = ?, libelle = ?, semestre = ?, credit = ?, regime = ?, coef = ? WHERE id = ?`,
    [code, abr, libelle, semestre, credit, regime, coef, id]
  );
};

export const getUnitesByParcours = async (parcoursId) => {
  const db = await getDB();
  return await db.select(
    "SELECT * FROM unites WHERE parcours_id = ? ORDER BY semestre, created_at",
    [parcoursId]
  );
};

export const deleteUnite = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM unites WHERE id = ?", [id]);
};