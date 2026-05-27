import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    
    await db.execute("PRAGMA foreign_keys = ON");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS parcours (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        mention TEXT NOT NULL,
        specialite TEXT NOT NULL,
        abr_parcours TEXT NOT NULL,
        type TEXT NOT NULL,
        domaine TEXT NOT NULL,
        formation_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
      )
    `);
  }
  return db;
};

export const addParcours = async (id, code, mention, specialite, abrParcours, type, domaine, formationId) => {
  const db = await getDB();
  return await db.execute(
    "INSERT INTO parcours (id, code, mention, specialite, abr_parcours, type, domaine, formation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, code, mention, specialite, abrParcours, type, domaine, formationId]
  );
};

export const getParcours = async () => {
  const db = await getDB();
  return await db.select(`
    SELECT p.*, f.libelle as formation_libelle
    FROM parcours p
    JOIN formations f ON p.formation_id = f.id
    ORDER BY p.created_at DESC
  `);
};

export const getParcoursById = async (formationId) => {
  const db = await getDB();
  return await db.select(`
    SELECT p.*, f.libelle as formation_libelle
    FROM parcours p
    JOIN formations f ON p.formation_id = f.id
    WHERE p.formation_id = ?
    ORDER BY p.created_at DESC
  `, [formationId]);
};

export const deleteParcours = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM parcours WHERE id = ?", [id]);
};

export const getParcoursByFormation = async (formationId) => {
  const db = await getDB();
  return await db.select(`
    SELECT p.*, f.libelle as formation_libelle
    FROM parcours p
    JOIN formations f ON p.formation_id = f.id
    WHERE p.formation_id = ?
    ORDER BY p.created_at DESC
  `, [formationId]);
};