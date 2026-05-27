import Database from "@tauri-apps/plugin-sql";

let db;

export const getDB = async () => {
  if (!db) {
    db = await Database.load("sqlite:isi-emploi.db");

    await db.execute("PRAGMA foreign_keys = ON");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS seances (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        jour           TEXT NOT NULL,
        seance         TEXT NOT NULL,
        type           TEXT NOT NULL DEFAULT 'Cours',
        classe_id      TEXT NOT NULL,
        enseignant_id  TEXT,
        enseignant2_id TEXT,
        matiere_id     TEXT NOT NULL,
        salle_id       TEXT NOT NULL,
        semaine_type   TEXT DEFAULT 'toutes',
        repartition    TEXT NOT NULL DEFAULT 'toute_classe',
        groupe_id      INTEGER,
        date_seance    TEXT,
        rattrapage     INTEGER DEFAULT 0,
        semestre       TEXT NOT NULL DEFAULT 'S1',
        debut          TEXT,
        duree          INTEGER,
        new_nature     TEXT,
        created_at     TEXT DEFAULT (datetime('now')),
        updated_at     TEXT DEFAULT (datetime('now')),
        CHECK(type IN ('Cours', 'TD', 'TP', 'CI')),
        CHECK(semaine_type IN ('toutes', 'paire', 'impair', NULL)),
        CHECK(repartition IN ('toute_classe', 'groupe1', 'groupe2')),
        CHECK(semestre IN ('S1', 'S2'))
      )
    `);

    // Migration : ajouter les nouvelles colonnes si la table existait déjà
    const migrations = [
      "ALTER TABLE seances ADD COLUMN enseignant2_id TEXT",
      "ALTER TABLE seances ADD COLUMN debut TEXT",
      "ALTER TABLE seances ADD COLUMN duree INTEGER",
      "ALTER TABLE seances ADD COLUMN new_nature TEXT",
    ];
    for (const sql of migrations) {
      try { await db.execute(sql); } catch (_) { /* colonne déjà présente */ }
    }

    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_date        ON seances(date_seance)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_jour_seance ON seances(jour, seance)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_enseignant  ON seances(enseignant_id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_enseignant2 ON seances(enseignant2_id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_classe      ON seances(classe_id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_seances_salle       ON seances(salle_id)");
  }
  return db;
};

// ─── SELECT helpers ──────────────────────────────────────────────────────────

const SELECT_FIELDS = `
  s.id, s.jour, s.seance, s.type, s.created_at, s.updated_at,
  s.semaine_type, s.repartition, s.groupe_id, s.date_seance,
  s.rattrapage, s.semestre, s.debut, s.duree, s.new_nature,
  s.classe_id,      c.nom      AS classe_nom,       c.niveau   AS classe_niveau,
  s.enseignant_id,  e.nom      AS prof_nom,          e.prenom   AS prof_prenom,
  s.enseignant2_id, e2.nom     AS prof2_nom,         e2.prenom  AS prof2_prenom,
  s.matiere_id,     m.libelle  AS matiere_nom,       m.code     AS matiere_code,
  s.salle_id,       sa.id      AS salle_numero
`;

const LEFT_JOINS = `
  LEFT JOIN classes     c   ON c.id  = s.classe_id
  LEFT JOIN enseignants e   ON e.id  = s.enseignant_id
  LEFT JOIN enseignants e2  ON e2.id = s.enseignant2_id
  LEFT JOIN matieres    m   ON m.id  = s.matiere_id
  LEFT JOIN salles      sa  ON sa.id = s.salle_id
`;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const getSeances = async () => {
  const db = await getDB();
  return await db.select(`
    SELECT ${SELECT_FIELDS}
    FROM seances s
    ${LEFT_JOINS}
    ORDER BY s.jour, s.seance
  `);
};

export const getSeancesByClasse = async (classeId, semestre = null) => {
  const db = await getDB();
  let query = `SELECT ${SELECT_FIELDS} FROM seances s ${LEFT_JOINS} WHERE s.classe_id = ?`;
  const params = [classeId];
  if (semestre) { query += " AND s.semestre = ?"; params.push(semestre); }
  query += " ORDER BY s.jour, s.seance";
  return await db.select(query, params);
};

export const getSeancesByProfesseur = async (enseignantId, semestre = null) => {
  const db = await getDB();
  // Inclut les séances où cet enseignant est prof principal OU prof secondaire
  let query = `
    SELECT ${SELECT_FIELDS}
    FROM seances s ${LEFT_JOINS}
    WHERE (s.enseignant_id = ? OR s.enseignant2_id = ?)
  `;
  const params = [enseignantId, enseignantId];
  if (semestre) { query += " AND s.semestre = ?"; params.push(semestre); }
  query += " ORDER BY s.jour, s.seance";
  return await db.select(query, params);
};

export const getSeancesBySalle = async (salleId, semestre = null) => {
  const db = await getDB();
  let query = `SELECT ${SELECT_FIELDS} FROM seances s ${LEFT_JOINS} WHERE s.salle_id = ?`;
  const params = [String(salleId)]; // Convertir en string car salle_id est TEXT
  if (semestre) { 
    query += " AND s.semestre = ?"; 
    params.push(semestre); 
  }
  query += " ORDER BY s.jour, s.seance";
  
  console.log('[getSeancesBySalle] Query:', query);
  console.log('[getSeancesBySalle] Params:', params);
  
  const results = await db.select(query, params);
  console.log('[getSeancesBySalle] Results count:', results.length);
  if (results.length > 0) {
    console.log('[getSeancesBySalle] First result:', {
      id: results[0].id,
      matiere_nom: results[0].matiere_nom,
      classe_nom: results[0].classe_nom,
      salle_numero: results[0].salle_numero,
      salle_nom: results[0].salle_nom
    });
  }
  
  return results;
};

export const getSeancesForDate = async (date, classeId = null, enseignantId = null, salleId = null) => {
  const db = await getDB();
  const weekNumber = getWeekNumber(new Date(date));
  const isEvenWeek = weekNumber % 2 === 0;

  let query = `
    SELECT ${SELECT_FIELDS},
      CASE WHEN s.date_seance IS NOT NULL THEN 'planifiee' ELSE 'fixe' END AS seance_type
    FROM seances s ${LEFT_JOINS}
    WHERE (
      s.date_seance = ?
      OR (
        s.date_seance IS NULL
        AND s.jour = strftime('%w', ?)
        AND (
          s.semaine_type = 'toutes'
          OR (s.semaine_type = 'paire'  AND ? = 1)
          OR (s.semaine_type = 'impair' AND ? = 0)
        )
      )
    )
  `;
  const params = [date, date, isEvenWeek ? 1 : 0, isEvenWeek ? 0 : 1];

  if (classeId)     { query += " AND s.classe_id = ?";                             params.push(classeId); }
  if (enseignantId) { query += " AND (s.enseignant_id = ? OR s.enseignant2_id = ?)"; params.push(enseignantId, enseignantId); }
  if (salleId)      { query += " AND s.salle_id = ?";                               params.push(salleId); }

  query += " ORDER BY s.seance";
  return await db.select(query, params);
};

export const getSeancesForDateRange = async (startDate, endDate, classeId = null, enseignantId = null, salleId = null) => {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const seances = await getSeancesForDate(dateStr, classeId, enseignantId, salleId);
    dates.push({ date: dateStr, seances });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const getSeanceById = async (id) => {
  const db = await getDB();
  const result = await db.select(`
    SELECT ${SELECT_FIELDS} FROM seances s ${LEFT_JOINS} WHERE s.id = ?
  `, [id]);
  return result[0] ?? null;
};

export const getSeancesByJour = async (jour) => {
  const db = await getDB();
  return await db.select(`
    SELECT ${SELECT_FIELDS} FROM seances s ${LEFT_JOINS}
    WHERE s.jour = ? ORDER BY s.seance
  `, [jour]);
};

// ─── Écriture ────────────────────────────────────────────────────────────────

export const addSeance = async (data) => {
  const db = await getDB();
  const rattrapage = data.rattrapage ? 1 : 0;
  const semestre   = data.semestre   || 'S1';

  console.log('➕ addSeance:', {
    jour: data.jour, seance: data.seance,
    matiere_id: data.matiere_id, classe_id: data.classe_id,
    enseignant_id: data.enseignant_id, enseignant2_id: data.enseignant2_id,
    debut: data.debut, duree: data.duree, new_nature: data.new_nature,
    semestre,
  });

  return await db.execute(
    `INSERT INTO seances
      (jour, seance, type, classe_id, enseignant_id, enseignant2_id,
       matiere_id, salle_id, semaine_type, repartition,
       groupe_id, date_seance, rattrapage, semestre,
       debut, duree, new_nature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.jour?.replace(/^"|"$/g, ''),
      data.seance?.replace(/^"|"$/g, ''),
      data.type,
      data.classe_id,
      data.enseignant_id  ?? null,
      data.enseignant2_id ?? null,
      data.matiere_id,
      data.salle_id,
      data.semaine_type || 'toutes',
      data.repartition  || 'toute_classe',
      data.groupe_id    ?? null,
      data.date_seance  ?? null,
      rattrapage,
      semestre,
      data.debut        ?? null,
      data.duree        ?? null,
      data.new_nature   ?? null,
    ]
  );
};

export const updateSeance = async (id, data) => {
  const db = await getDB();
  const rattrapage = data.rattrapage ? 1 : 0;
  const semestre   = data.semestre   || 'S1';

  const commonFields = `
    jour=?, seance=?, type=?, classe_id=?,
    enseignant_id=?, enseignant2_id=?,
    matiere_id=?, salle_id=?,
    repartition=?, rattrapage=?, semestre=?,
    debut=?, duree=?, new_nature=?,
    updated_at=datetime('now')
  `;
  const commonParams = [
    data.jour, data.seance, data.type, data.classe_id,
    data.enseignant_id  ?? null,
    data.enseignant2_id ?? null,
    data.matiere_id, data.salle_id,
    data.repartition || 'toute_classe', rattrapage, semestre,
    data.debut       ?? null,
    data.duree       ?? null,
    data.new_nature  ?? null,
  ];

  if (data.date_seance) {
    return await db.execute(
      `UPDATE seances SET ${commonFields}, date_seance=?, semaine_type=NULL WHERE id=?`,
      [...commonParams, data.date_seance, id]
    );
  } else {
    return await db.execute(
      `UPDATE seances SET ${commonFields}, semaine_type=?, date_seance=NULL WHERE id=?`,
      [...commonParams, data.semaine_type || 'toutes', id]
    );
  }
};

export const addGroupesSeances = async (data) => {
  const db = await getDB();
  const groupeId = Date.now();
  const rattrapage = data.rattrapage ? 1 : 0;
  const semestre   = data.semestre   || 'S1';

  const insert = `
    INSERT INTO seances
      (jour, seance, type, classe_id, enseignant_id, enseignant2_id,
       matiere_id, salle_id, semaine_type, repartition,
       groupe_id, date_seance, rattrapage, semestre,
       debut, duree, new_nature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db.execute(insert, [
    data.jour, data.seance, data.type, data.classe_id,
    data.enseignant_groupe1 ?? null, null,
    data.matiere_id, data.salle_groupe1,
    data.semaine_type, 'groupe1', groupeId, null, rattrapage, semestre,
    data.debut ?? null, data.duree ?? null, data.new_nature ?? null,
  ]);

  await db.execute(insert, [
    data.jour, data.seance, data.type, data.classe_id,
    data.enseignant_groupe2 ?? null, null,
    data.matiere_id, data.salle_groupe2,
    data.semaine_type, 'groupe2', groupeId, null, rattrapage, semestre,
    data.debut ?? null, data.duree ?? null, data.new_nature ?? null,
  ]);

  return { success: true, groupeId };
};

// ─── Suppression ─────────────────────────────────────────────────────────────

export const deleteSeance             = async (id)       => { const db = await getDB(); return await db.execute("DELETE FROM seances WHERE id=?",         [id]); };
export const deleteSeancesByGroupeId  = async (groupeId) => { const db = await getDB(); return await db.execute("DELETE FROM seances WHERE groupe_id=?",   [groupeId]); };
export const deleteSeancesByJour      = async (jour)     => { const db = await getDB(); return await db.execute("DELETE FROM seances WHERE jour=?",        [jour]); };
export const deleteAllSeances         = async ()         => { const db = await getDB(); return await db.execute("DELETE FROM seances"); };

// ─── Utilitaires ──────────────────────────────────────────────────────────────

export const seanceExists = async (jour, seance, classeId = null) => {
  const db = await getDB();
  let query = "SELECT id FROM seances WHERE jour=? AND seance=?";
  const params = [jour, seance];
  if (classeId) { query += " AND classe_id = ?"; params.push(classeId); }
  const r = await db.select(query, params);
  return r.length > 0;
};

export const countSeances = async () => {
  const db = await getDB();
  const r = await db.select("SELECT COUNT(*) AS total FROM seances");
  return r[0]?.total ?? 0;
};

export const checkConflicts = async (date, jour, seance, classeId, enseignantId, salleId, semestre = null, excludeId = null) => {
  const db = await getDB();
  const weekNumber = getWeekNumber(new Date(date));
  const isEvenWeek = weekNumber % 2 === 0;

  const dateCondition = `
    (s.date_seance = ?
     OR (s.date_seance IS NULL AND s.jour = ?
         AND (s.semaine_type = 'toutes'
              OR (s.semaine_type = 'paire'  AND ? = 1)
              OR (s.semaine_type = 'impair' AND ? = 0))))
  `;
  const dateParams = [date, jour, isEvenWeek ? 1 : 0, isEvenWeek ? 0 : 1];
  const semestreClause = semestre
    ? `AND s.semestre = ?`
    : `AND (s.semestre IS NOT NULL AND s.semestre != '')`;

  const results = { classe: null, enseignant: null, salle: null };

  const runCheck = async (whereClause, params, label) => {
    let q = `SELECT s.* FROM seances s WHERE ${whereClause} AND ${dateCondition} AND s.seance = ? ${semestreClause}`;
    const p = [...params, ...dateParams, seance];
    if (semestre) p.push(semestre);
    if (excludeId) { q += " AND s.id != ?"; p.push(excludeId); }
    const rows = await db.select(q, p);
    return rows[0] ?? null;
  };

  if (classeId)     results.classe      = await runCheck("s.classe_id = ?",                                  [classeId],     "classe");
  // Conflit enseignant : prof principal OU secondaire
  if (enseignantId) results.enseignant  = await runCheck("(s.enseignant_id = ? OR s.enseignant2_id = ?)",    [enseignantId, enseignantId], "enseignant");
  if (salleId)      results.salle       = await runCheck("s.salle_id = ?",                                   [salleId],      "salle");

  return results;
};

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export { getWeekNumber };