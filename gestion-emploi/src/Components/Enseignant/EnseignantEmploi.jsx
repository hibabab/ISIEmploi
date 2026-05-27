import React, { useState, useEffect } from 'react';
import { getSeancesByProfesseur } from '../../database/seances';
import { getEnseignants } from '../../database/enseignants';
import { getAllConfigurations, getConfigurationById } from '../../database/personalisation';
import EmploiTableau from '../Emploi/EmploiTableau';

const BLUE = '#237AFF';

export default function EnseignantEmploi({ enseignantId, onBack }) {
  const [enseignant,     setEnseignant]     = useState(null);
  const [configurations, setConfigs]        = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [emploiData,     setEmploiData]     = useState({});
  const [loading,        setLoading]        = useState(false);
  const [semestre,       setSemestre]       = useState('S1');

  useEffect(() => {
    (async () => {
      const list = await getEnseignants();
      setEnseignant(list.find(e => e.id === parseInt(enseignantId)));
    })();
  }, [enseignantId]);

  useEffect(() => {
    (async () => {
      const configs = await getAllConfigurations();
      setConfigs(configs ?? []);
      if (configs?.length) await handleConfigChange(configs[0].id, semestre);
    })();
  }, [enseignantId]);

  useEffect(() => {
    if (selectedConfig) loadEmploiData(selectedConfig, semestre);
  }, [semestre]);

  const handleConfigChange = async (configId, sem = semestre) => {
    const config = await getConfigurationById(configId);
    setSelectedConfig(config);
    if (config && enseignantId) await loadEmploiData(config, sem);
  };

  const loadEmploiData = async (config, sem) => {
    setLoading(true);

    // Grid vide — tableau par cellule
    const grid = {};
    config.jours.forEach(jour => {
      grid[jour] = {};
      config.sequence.forEach(s => { grid[jour][s.element] = []; });
    });

    try {
      const seances = await getSeancesByProfesseur(parseInt(enseignantId), sem);

      console.log('[EnseignantEmploi] config.jours:', config.jours);
      console.log('[EnseignantEmploi] config.sequence elements:', config.sequence.map(s => s.element));
      console.log('[EnseignantEmploi] seances count:', seances.length);
      if (seances.length > 0) console.log('[EnseignantEmploi] seances[0]:', seances[0]);

      seances.forEach(s => {
        if (!grid[s.jour]) {
          console.warn('[EnseignantEmploi] jour inconnu:', s.jour);
          return;
        }
        if (grid[s.jour][s.seance] === undefined) {
          console.warn('[EnseignantEmploi] seance inconnue:', s.seance, 'dans jour:', s.jour);
          return;
        }

        // ✅ Colonnes réelles retournées par SELECT_FIELDS dans seances.js :
        //    prof_nom, prof_prenom, prof2_nom, prof2_prenom
        //    salle_numero (= sa.id alias)
        //    matiere_nom  (= m.libelle alias)
        grid[s.jour][s.seance].push({
          id:                 s.id,
          matiere_nom:        s.matiere_nom       ?? '—',
          matiere_libelle:    s.matiere_nom       ?? '—',
          enseignant_id:      s.enseignant_id     ?? null,
          enseignant_prenom:  s.prof_prenom       ?? '',
          enseignant_nom:     s.prof_nom          ?? '',
          enseignant2_id:     s.enseignant2_id    ?? null,
          enseignant2_prenom: s.prof2_prenom      ?? '',
          enseignant2_nom:    s.prof2_nom         ?? '',
          salle_id:           s.salle_numero      ?? (s.salle_id ? String(s.salle_id) : null),
          type:               s.type              ?? 'Cours',
          semaine_type:       s.semaine_type      ?? 'toutes',
          rattrapage:         s.rattrapage        ?? false,
          date_seance:        s.date_seance       ?? null,
          classe_nom: s.classe_nom ?? null,
        });
      });

      console.log('[EnseignantEmploi] grid final:', grid);
      setEmploiData(grid);
    } catch (err) {
      console.error('[EnseignantEmploi] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!enseignant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full animate-spin"
               style={{ border: `2px solid ${BLUE}`, borderTopColor: 'transparent' }} />
          <p className="text-slate-400 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const selectedItemName = `${enseignant.prenom ?? ''} ${enseignant.nom ?? ''}`.trim();

  return (
    <div className="p-5 min-h-screen bg-slate-50">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] bg-none border-none cursor-pointer mb-5 font-inherit p-0"
        style={{ color: BLUE }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour à la liste
      </button>

      <div className="text-lg font-bold mb-4" style={{ color: BLUE }}>
        {enseignant.prenom} {enseignant.nom}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Semestre</span>
        <div className="flex gap-2">
          {['S1', 'S2'].map(s => (
            <button key={s} onClick={() => setSemestre(s)}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold font-inherit cursor-pointer transition-all duration-150"
              style={{
                border:     `1.5px solid ${semestre === s ? BLUE : '#e2e8f0'}`,
                background: semestre === s ? BLUE : '#fff',
                color:      semestre === s ? '#fff' : '#64748b',
                boxShadow:  semestre === s ? `0 4px 12px rgba(35,122,255,.3)` : 'none',
              }}>
              {s}
            </button>
          ))}
        </div>

        {configurations.length > 0 && (
          <select onChange={e => handleConfigChange(parseInt(e.target.value))}
            className="ml-auto px-3 py-1.5 text-[13px] border-[1.5px] border-slate-200 rounded-lg bg-white text-slate-700 font-inherit cursor-pointer">
            {configurations.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.annee} · {c.semestre})</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 bg-blue-50 rounded-xl px-4 py-2.5 mb-4 text-[13px]"
             style={{ color: BLUE }}>
          <div className="w-3.5 h-3.5 rounded-full animate-spin"
               style={{ border: `2px solid ${BLUE}`, borderTopColor: 'transparent' }} />
          Chargement des données…
        </div>
      )}

      {!loading && (
        <EmploiTableau
          selectedConfig={selectedConfig}
          emploiData={emploiData}
          emploiType="professeur"
          selectedItem={enseignantId}
          selectedItemName={selectedItemName}
          onCellClick={() => {}}
          onDeleteSeance={undefined}
          onMoveSeance={undefined}
        />
      )}
    </div>
  );
}