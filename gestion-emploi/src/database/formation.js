// src/database/formation.js
import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");
    
   
    
    // Créer la table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS formations (
        id TEXT PRIMARY KEY NOT NULL,
        libelle TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Vérifier que la table est créée
    const tables = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='formations'");
    console.log("Table formations créée:", tables);
  }
  return db;
};

export const addFormation = async (id, libelle) => {
  const db = await getDB();
  try {
    console.log("Tentative d'insertion:", { id, libelle });
    
    const result = await db.execute(
      "INSERT INTO formations (id, libelle) VALUES (?, ?)",
      [id, libelle]
    );
    
    console.log("Insertion réussie:", result);
    return result;
  } catch (error) {
    console.error("Erreur détaillée:", error);
    throw error;
  }
};

export const getFormations = async () => {
  const db = await getDB();
  return await db.select("SELECT * FROM formations ORDER BY created_at DESC");
};

export const deleteFormation = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM formations WHERE id = ?", [id]);
};