import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS enseignants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL,
        cin TEXT,
        telephone TEXT,
        departement TEXT,
        grade TEXT,
        nature TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
};

export const getEnseignants = async () => {
  const db = await getDB();

 
  return await db.select("SELECT * FROM enseignants ORDER BY created_at DESC");
};

export const getEnseignantsByDepartement = async (departement) => {
  const db = await getDB();
  return await db.select(
    "SELECT * FROM enseignants WHERE departement = ? ORDER BY nom, prenom",
    [departement]
  );
};

export const addEnseignant = async (data) => {
  const db = await getDB();
  return await db.execute(
    `INSERT INTO enseignants (nom, prenom, email, cin, telephone, departement, grade, nature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.nom, data.prenom, data.email, data.cin, data.telephone, data.departement, data.grade, data.nature]
  );
};

export const updateEnseignant = async (id, data) => {
  const db = await getDB();
  return await db.execute(
    `UPDATE enseignants SET nom=?, prenom=?, email=?, cin=?, telephone=?, departement=?, grade=?, nature=?
     WHERE id=?`,
    [data.nom, data.prenom, data.email, data.cin, data.telephone, data.departement, data.grade, data.nature, id]
  );
};

export const deleteEnseignant = async (id) => {
  const db = await getDB();
  return await db.execute("DELETE FROM enseignants WHERE id = ?", [id]);
};