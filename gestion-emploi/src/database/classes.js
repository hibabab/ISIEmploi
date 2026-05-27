import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");

    // Supprimer l'ancienne table et recréer avec nom comme TEXT PRIMARY KEY
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id         TEXT PRIMARY KEY NOT NULL,
        nom        TEXT NOT NULL,
        niveau     TEXT,
        filiere    TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
};

export const getClasses = async () => {
  const db = await getDB();
  return await db.select("SELECT * FROM classes ORDER BY filiere, nom");
};

export const addClasse = async (data) => {
  const db = await getDB();
  return await db.execute(
    "INSERT OR IGNORE INTO classes (id, nom, niveau, filiere) VALUES (?, ?, ?, ?)",
    [data.nom, data.nom, data.niveau || null, data.filiere || null]
  );
};

export const addClasses = async (classes) => {
  const db = await getDB();
  for (const cls of classes) {
    await db.execute(
      "INSERT OR IGNORE INTO classes (id, nom, niveau, filiere) VALUES (?, ?, ?, ?)",
      [cls.nom, cls.nom, cls.niveau || null, cls.filiere || null]
    );
  }
};

export const deleteClasse = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM classes WHERE id = ?", [id]);
};

export const updateClasse = async (id, data) => {
  const db = await getDB();
  return await db.execute(
    "UPDATE classes SET nom = ?, niveau = ?, filiere = ? WHERE id = ?",
    [data.nom, data.niveau, data.filiere, id]
  );
};

export const getClassesByFiliere = async (filiere) => {
  const db = await getDB();
  return await db.select(
    "SELECT * FROM classes WHERE filiere = ? ORDER BY nom",
    [filiere]
  );
};