import Database from "@tauri-apps/plugin-sql";

let db;

const DEFAULT_SEQUENCE = [
  { element: 'SEANCE_1', heureDebut: '08:00', heureFin: '09:30', duree: 90 },
  { element: 'SEANCE_2', heureDebut: '09:40', heureFin: '11:10', duree: 90 },
  { element: 'SEANCE_3', heureDebut: '11:20', heureFin: '12:50', duree: 90 },
  { element: 'PAUSE',    heureDebut: '12:50', heureFin: '13:40', duree: 50 },
  { element: 'SEANCE_4', heureDebut: '13:40', heureFin: '15:10', duree: 90 },
  { element: 'SEANCE_5', heureDebut: '15:20', heureFin: '16:50', duree: 90 },
  { element: 'SEANCE_6', heureDebut: '17:00', heureFin: '18:30', duree: 90 },
];

const DEFAULT_CONFIG = {
  nom: 'Configuration par défaut',
  annee: '2024-2025',
  dateDebutS1: '2024-09-01',
  dateFinS1: '2025-01-31',
  dateDebutS2: '2025-02-01',
  dateFinS2: '2025-06-30',
  jours: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
  sequence: DEFAULT_SEQUENCE,
  dureeSeance: 90,
};

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");
    await db.execute("PRAGMA foreign_keys = ON");

    // Table configuration principale (sans semestre)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS configuration_emploi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        annee TEXT NOT NULL,
        jours TEXT NOT NULL,
        duree_seance INTEGER NOT NULL DEFAULT 90,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Table semestre liée à configuration
    await db.execute(`
      CREATE TABLE IF NOT EXISTS semestre (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configuration_id INTEGER NOT NULL,
        code TEXT NOT NULL CHECK(code IN ('S1', 'S2')),
        date_debut TEXT NOT NULL,
        date_fin TEXT NOT NULL,
        FOREIGN KEY (configuration_id) REFERENCES configuration_emploi(id) ON DELETE CASCADE
      )
    `);

    // Table séquence des séances
    await db.execute(`
      CREATE TABLE IF NOT EXISTS element_sequence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configuration_id INTEGER NOT NULL,
        element TEXT NOT NULL,
        heure_debut TEXT NOT NULL,
        heure_fin TEXT NOT NULL,
        duree INTEGER NOT NULL DEFAULT 90,
        ordre INTEGER NOT NULL,
        FOREIGN KEY (configuration_id) REFERENCES configuration_emploi(id) ON DELETE CASCADE
      )
    `);

    // Insérer la configuration par défaut si aucune n'existe
    const existing = await db.select("SELECT COUNT(*) as count FROM configuration_emploi");
    if (existing[0].count === 0) {
      await _insertDefaultConfig(db);
    }
  }
  return db;
};

// ── Insertion interne de la config par défaut ──
const _insertDefaultConfig = async (db) => {
  const result = await db.execute(
    `INSERT INTO configuration_emploi (nom, annee, jours, duree_seance)
     VALUES (?, ?, ?, ?)`,
    [
      DEFAULT_CONFIG.nom,
      DEFAULT_CONFIG.annee,
      JSON.stringify(DEFAULT_CONFIG.jours),
      DEFAULT_CONFIG.dureeSeance,
    ]
  );
  const configId = result.lastInsertId;

  // Insérer S1 et S2
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S1', ?, ?)`,
    [configId, DEFAULT_CONFIG.dateDebutS1, DEFAULT_CONFIG.dateFinS1]
  );
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S2', ?, ?)`,
    [configId, DEFAULT_CONFIG.dateDebutS2, DEFAULT_CONFIG.dateFinS2]
  );

  // Insérer la séquence
  for (let i = 0; i < DEFAULT_CONFIG.sequence.length; i++) {
    const item = DEFAULT_CONFIG.sequence[i];
    await db.execute(
      `INSERT INTO element_sequence (configuration_id, element, heure_debut, heure_fin, duree, ordre)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [configId, item.element, item.heureDebut, item.heureFin, item.duree || 90, i]
    );
  }
};

// ── Lire la configuration (la plus récente) ──
export const getConfiguration = async () => {
  const db = await getDB();

  const configs = await db.select(
    "SELECT * FROM configuration_emploi ORDER BY id DESC LIMIT 1"
  );
  if (configs.length === 0) return null;

  const config = configs[0];

  const semestres = await db.select(
    "SELECT * FROM semestre WHERE configuration_id = ? ORDER BY code ASC",
    [config.id]
  );

  const sequence = await db.select(
    "SELECT * FROM element_sequence WHERE configuration_id = ? ORDER BY ordre ASC",
    [config.id]
  );

  const s1 = semestres.find(s => s.code === 'S1') || {};
  const s2 = semestres.find(s => s.code === 'S2') || {};

  return {
    id: config.id,
    nom: config.nom,
    annee: config.annee,
    dureeSeance: config.duree_seance,
    dateDebutS1: s1.date_debut || '',
    dateFinS1: s1.date_fin || '',
    dateDebutS2: s2.date_debut || '',
    dateFinS2: s2.date_fin || '',
    jours: JSON.parse(config.jours),
    sequence: sequence.map(s => ({
      id: s.id,
      element: s.element,
      heureDebut: s.heure_debut,
      heureFin: s.heure_fin,
      duree: s.duree,
    }))
  };
};

// ── Sauvegarder la configuration (supprime l'ancienne) ──
export const saveConfiguration = async (config) => {
  const db = await getDB();

  await db.execute("DELETE FROM configuration_emploi");

  const result = await db.execute(
    `INSERT INTO configuration_emploi (nom, annee, jours, duree_seance)
     VALUES (?, ?, ?, ?)`,
    [
      config.nom,
      config.annee,
      JSON.stringify(config.jours),
      config.dureeSeance || 90,
    ]
  );

  const configId = result.lastInsertId;

  // Insérer les semestres
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S1', ?, ?)`,
    [configId, config.dateDebutS1 || '', config.dateFinS1 || '']
  );
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S2', ?, ?)`,
    [configId, config.dateDebutS2 || '', config.dateFinS2 || '']
  );

  // Insérer les séances
  for (let i = 0; i < config.sequence.length; i++) {
    const item = config.sequence[i];
    await db.execute(
      `INSERT INTO element_sequence (configuration_id, element, heure_debut, heure_fin, duree, ordre)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [configId, item.element, item.heureDebut, item.heureFin, item.duree || 90, i]
    );
  }
};

// ── Mettre à jour une configuration existante ──
export const updateConfiguration = async (id, config) => {
  const db = await getDB();

  await db.execute(
    `UPDATE configuration_emploi SET nom = ?, annee = ?, jours = ?, duree_seance = ? WHERE id = ?`,
    [config.nom, config.annee, JSON.stringify(config.jours), config.dureeSeance || 90, id]
  );

  // Mettre à jour semestres
  await db.execute("DELETE FROM semestre WHERE configuration_id = ?", [id]);
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S1', ?, ?)`,
    [id, config.dateDebutS1 || '', config.dateFinS1 || '']
  );
  await db.execute(
    `INSERT INTO semestre (configuration_id, code, date_debut, date_fin) VALUES (?, 'S2', ?, ?)`,
    [id, config.dateDebutS2 || '', config.dateFinS2 || '']
  );

  // Mettre à jour séquence
  await db.execute("DELETE FROM element_sequence WHERE configuration_id = ?", [id]);
  for (let i = 0; i < config.sequence.length; i++) {
    const item = config.sequence[i];
    await db.execute(
      `INSERT INTO element_sequence (configuration_id, element, heure_debut, heure_fin, duree, ordre)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, item.element, item.heureDebut, item.heureFin, item.duree || 90, i]
    );
  }
};

// ── Récupérer une configuration par ID ──
export const getConfigurationById = async (id) => {
  const db = await getDB();

  const configs = await db.select(
    "SELECT * FROM configuration_emploi WHERE id = ?",
    [id]
  );
  if (configs.length === 0) return null;

  const config = configs[0];

  const semestres = await db.select(
    "SELECT * FROM semestre WHERE configuration_id = ? ORDER BY code ASC",
    [config.id]
  );

  const sequence = await db.select(
    "SELECT * FROM element_sequence WHERE configuration_id = ? ORDER BY ordre ASC",
    [config.id]
  );

  const s1 = semestres.find(s => s.code === 'S1') || {};
  const s2 = semestres.find(s => s.code === 'S2') || {};

  return {
    id: config.id,
    nom: config.nom,
    annee: config.annee,
    dureeSeance: config.duree_seance,
    dateDebutS1: s1.date_debut || '',
    dateFinS1: s1.date_fin || '',
    dateDebutS2: s2.date_debut || '',
    dateFinS2: s2.date_fin || '',
    jours: JSON.parse(config.jours),
    sequence: sequence.map(s => ({
      id: s.id,
      element: s.element,
      heureDebut: s.heure_debut,
      heureFin: s.heure_fin,
      duree: s.duree,
    }))
  };
};

// ── Ajouter une séance ──
export const addSeanceToConfig = async (configId, seance, ordre) => {
  const db = await getDB();
  const result = await db.execute(
    `INSERT INTO element_sequence (configuration_id, element, heure_debut, heure_fin, duree, ordre)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [configId, seance.element, seance.heureDebut, seance.heureFin, seance.duree || 90, ordre]
  );
  return result.lastInsertId;
};

// ── Modifier une séance ──
export const updateSeance = async (seanceId, heureDebut, heureFin, duree) => {
  const db = await getDB();
  await db.execute(
    `UPDATE element_sequence SET heure_debut = ?, heure_fin = ?, duree = ? WHERE id = ?`,
    [heureDebut, heureFin, duree, seanceId]
  );
};

// ── Supprimer une séance ──
export const deleteSeance = async (seanceId) => {
  const db = await getDB();
  await db.execute("DELETE FROM element_sequence WHERE id = ?", [seanceId]);
};

// ── Vérifier si une configuration existe ──
export const hasConfiguration = async () => {
  const db = await getDB();
  const result = await db.select("SELECT COUNT(*) as count FROM configuration_emploi");
  return result[0].count > 0;
};

// ── Récupérer toutes les configurations ──
export const getAllConfigurations = async () => {
  const db = await getDB();
  const configs = await db.select("SELECT * FROM configuration_emploi ORDER BY created_at DESC");
  return configs.map(config => ({
    id: config.id,
    nom: config.nom,
    annee: config.annee,
    dureeSeance: config.duree_seance,
    jours: JSON.parse(config.jours),
    created_at: config.created_at
  }));
};

// ── Supprimer toutes les configurations ──
export const deleteAllConfigurations = async () => {
  const db = await getDB();
  await db.execute("DELETE FROM configuration_emploi");
};

// ── Compter les configurations ──
export const countConfigurations = async () => {
  const db = await getDB();
  const result = await db.select("SELECT COUNT(*) as count FROM configuration_emploi");
  return result[0].count;
};