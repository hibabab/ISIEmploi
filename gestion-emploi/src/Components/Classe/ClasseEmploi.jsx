import React, { useState, useEffect } from 'react';
import { getSeancesByClasse } from '../../database/seances';
import { getAllConfigurations, getConfigurationById } from '../../database/personalisation';
import EmploiTableau from '../Emploi/EmploiTableau';

const BLUE = '#237AFF';

export default function ClasseEmploi({ classeId, classeNom, onBack }) {
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [emploiData, setEmploiData] = useState({});
  const [loading, setLoading] = useState(false);
  const [semestre, setSemestre] = useState('S1');

  useEffect(() => {
    (async () => {
      const configs = await getAllConfigurations();
      setConfigurations(configs || []);
      if (configs?.length) await handleConfigChange(configs[0].id);
    })();
  }, [classeId]);

  // Recharger quand le semestre change
  useEffect(() => {
    if (selectedConfig && classeId) {
      loadEmploiData(selectedConfig, classeId, semestre);
    }
  }, [semestre]);

  const handleConfigChange = async (configId) => {
    const config = await getConfigurationById(parseInt(configId));
    setSelectedConfig(config);
    if (config && classeId) await loadEmploiData(config, classeId, semestre);
  };

  const loadEmploiData = async (config, id, sem) => {
    setLoading(true);

    const grid = {};
    config.jours.forEach(jour => {
      grid[jour] = {};
      config.sequence.forEach(s => { grid[jour][s.element] = []; });
    });

    try {
      console.log('[ClasseEmploi] classeId:', id, 'semestre:', sem);
      const seances = await getSeancesByClasse(id, sem);

      console.log('[ClasseEmploi] seances count:', seances.length);
      if (seances.length > 0) console.log('[ClasseEmploi] seances[0]:', seances[0]);

      seances.forEach(s => {
        if (!grid[s.jour]) {
          console.warn('[ClasseEmploi] jour inconnu:', s.jour);
          return;
        }
        if (grid[s.jour][s.seance] === undefined) {
          console.warn('[ClasseEmploi] seance inconnue:', s.seance);
          return;
        }

        grid[s.jour][s.seance].push({
          id: s.id,
          matiere_nom: s.matiere_nom ?? '—',
          matiere_libelle: s.matiere_nom ?? '—',
          matiere_id: s.matiere_id,
          enseignant_id: s.enseignant_id ?? null,
          enseignant_prenom: s.prof_prenom ?? '',
          enseignant_nom: s.prof_nom ?? '',
          enseignant2_id: s.enseignant2_id ?? null,
          enseignant2_prenom: s.prof2_prenom ?? '',
          enseignant2_nom: s.prof2_nom ?? '',
          salle_id: s.salle_numero ?? (s.salle_id ? String(s.salle_id) : null),
          salle_nom: s.salle_nom || s.salle_numero,
          classe_id: s.classe_id,
          classe_nom: s.classe_nom,
          type: s.type ?? 'Cours',
          semaine_type: s.semaine_type ?? 'toutes',
          rattrapage: s.rattrapage ?? false,
          date_seance: s.date_seance ?? null,
        });
      });

      setEmploiData(grid);
    } catch (err) {
      console.error('[ClasseEmploi] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition mb-4 bg-transparent border-none cursor-pointer p-0 font-inherit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à la liste
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: BLUE }}>
              Emploi du temps – {classeNom}
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Consultation des cours</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sélecteur de semestre */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Semestre
              </span>
              <div className="flex gap-2">
                {['S1', 'S2'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSemestre(s)}
                    className="px-5 py-1.5 rounded-full text-[13px] font-semibold font-inherit cursor-pointer transition-all duration-150"
                    style={{
                      border: `1.5px solid ${semestre === s ? BLUE : '#e2e8f0'}`,
                      background: semestre === s ? BLUE : '#fff',
                      color: semestre === s ? '#fff' : '#64748b',
                      boxShadow: semestre === s ? `0 4px 12px rgba(35,122,255,.3)` : 'none',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur de configuration */}
            {configurations.length > 0 && (
              <select
                value={selectedConfig?.id || ''}
                onChange={e => handleConfigChange(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
                {configurations.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.annee} – {c.semestre})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {!selectedConfig && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700 text-sm">📋 Veuillez sélectionner une configuration</p>
        </div>
      )}

      {loading && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-600 text-sm rounded text-center flex items-center justify-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full animate-spin"
            style={{ border: `2px solid ${BLUE}`, borderTopColor: 'transparent' }} />
          Chargement des données…
        </div>
      )}

      {selectedConfig && !loading && (
        <EmploiTableau
          selectedConfig={selectedConfig}
          emploiData={emploiData}
          emploiType="classe"
          selectedItem={classeId}
          selectedItemName={classeNom}
          onCellClick={() => {}}
          onDeleteSeance={undefined}
          onMoveSeance={undefined}
        />
      )}
    </div>
  );
}