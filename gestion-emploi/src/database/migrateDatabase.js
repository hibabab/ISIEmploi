// migration.js - à exécuter une seule fois
import { getDB } from './seances.js';

export const migrateDatabase = async () => {
  const db = await getDB();
    await db.execute("DROP TABLE IF EXISTS matieres");
  try {
    // Vérifier si l'ancienne contrainte existe
    const tableInfo = await db.select("PRAGMA table_info(seances)");
    console.log('Table info:', tableInfo);
    
    // Recréer la table sans la contrainte CHECK sur seance
    await db.execute(`
      CREATE TABLE IF NOT EXISTS seances_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jour TEXT NOT NULL,
        seance TEXT NOT NULL,
        professeur TEXT NOT NULL,
        matiere TEXT NOT NULL,
        salle TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Cours',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        CHECK(type IN ('Cours', 'TD', 'TP'))
      )
    `);
    
    // Copier les données existantes
    await db.execute(`
      INSERT INTO seances_new (id, jour, seance, professeur, matiere, salle, type, created_at)
      SELECT id, jour, seance, professeur, matiere, salle, type, created_at
      FROM seances
    `);
    
    // Supprimer l'ancienne table
    await db.execute("DROP TABLE seances");
    
    // Renommer la nouvelle table
    await db.execute("ALTER TABLE seances_new RENAME TO seances");
    
    console.log('✅ Migration réussie !');
  } catch (err) {
    console.error('❌ Erreur de migration:', err);
  }
};

// Exécuter la migration
// migrateDatabase();