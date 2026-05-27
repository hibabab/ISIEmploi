// database/auth.js
import Database from '@tauri-apps/plugin-sql';

let db = null;

const openDB = async () => {
  if (!db) {
    db = await Database.load('sqlite:emploi.db');
  }
  return db;
};

export const initAdminTable = async () => {
  const db = await openDB();
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  const existingAdmin = await db.select("SELECT * FROM admin WHERE nom = ?", ["hiba"]);
  
  if (existingAdmin.length === 0) {
    await db.execute(
      "INSERT INTO admin (nom, password) VALUES (?, ?)",
      ["hiba", "1234"]
    );
    console.log("Admin par défaut créé");
  }
};

export const loginAdmin = async (nom, password) => {
  const db = await openDB();
  const result = await db.select(
    "SELECT * FROM admin WHERE nom = ? AND password = ?",
    [nom, password]
  );
  return result.length > 0 ? result[0] : null;
};

export const getAdminByNom = async (nom) => {
  const db = await openDB();
  const result = await db.select("SELECT * FROM admin WHERE nom = ?", [nom]);
  return result.length > 0 ? result[0] : null;
};