// src/components/Salles/SalleEmploi.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getSeancesBySalle, updateSeance, deleteSeance } from '../../database/seances';
import { getAllConfigurations, getConfigurationById } from '../../database/personalisation';
import EmploiTableau from '../Emploi/EmploiTableau';

const BLUE = '#237AFF';

export default function SalleEmploi({ salleId, salleNumero, onBack }) {
  const [configurations, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [emploiData, setEmploiData] = useState({});
  const [loading, setLoading] = useState(false);
  const [semestre, setSemestre] = useState('S1');
  const [error, setError] = useState(null);

  console.log('[SalleEmploi] Props reçues:', { salleId, salleNumero });

  // Validation - accepte les string comme "A131"
  const getValidSalleId = useCallback(() => {
    if (!salleId && salleId !== 0) {
      return null;
    }
    
    // Retourne l'ID tel quel (peut être string ou number)
    return salleId;
  }, [salleId]);

  useEffect(() => {
    const validId = getValidSalleId();
    console.log('[SalleEmploi] ID validé:', validId, 'type:', typeof validId);
    
    if (!validId) {
      setError(`ID de salle invalide: ${salleId}`);
      return;
    }
    
    const loadConfigs = async () => {
      try {
        const configs = await getAllConfigurations();
        setConfigs(configs ?? []);
        if (configs?.length) {
          await handleConfigChange(configs[0].id, semestre);
        }
      } catch (err) {
        console.error('[SalleEmploi] Erreur chargement configs:', err);
        setError('Erreur lors du chargement des configurations');
      }
    };
    
    loadConfigs();
  }, [salleId]);

  useEffect(() => {
    if (selectedConfig && getValidSalleId()) {
      loadEmploiData(selectedConfig, semestre);
    }
  }, [semestre]);

  const handleConfigChange = async (configId, sem = semestre) => {
    try {
      const config = await getConfigurationById(configId);
      setSelectedConfig(config);
      if (config) {
        await loadEmploiData(config, sem);
      }
    } catch (err) {
      console.error('[SalleEmploi] Erreur changement config:', err);
      setError('Erreur lors du changement de configuration');
    }
  };

  const loadEmploiData = async (config, sem) => {
    const validSalleId = getValidSalleId();
    if (!validSalleId) {
      setError('ID de salle invalide pour chargement');
      return;
    }

    setLoading(true);
    setError(null);

    // Initialisation de la grille
    const grid = {};
    config.jours.forEach(jour => {
      grid[jour] = {};
      config.sequence.forEach(seq => {
        grid[jour][seq.element] = [];
      });
    });

    try {
      console.log('[SalleEmploi] Appel getSeancesBySalle avec:', validSalleId, sem);
      const seances = await getSeancesBySalle(validSalleId, sem);
      console.log('[SalleEmploi] Séances reçues:', seances.length);

      seances.forEach(seance => {
        if (!grid[seance.jour]) {
          console.warn('[SalleEmploi] Jour non trouvé:', seance.jour);
          return;
        }
        
        if (grid[seance.jour][seance.seance] === undefined) {
          console.warn('[SalleEmploi] Séance non trouvée:', seance.seance);
          return;
        }

        const seanceObj = {
          id: seance.id,
          matiere_nom: seance.matiere_nom || seance.matiere_libelle || '—',
          matiere_libelle: seance.matiere_nom || seance.matiere_libelle || '—',
          matiere_id: seance.matiere_id,
          enseignant_id: seance.enseignant_id,
          enseignant_nom: seance.prof_nom || '',
          enseignant_prenom: seance.prof_prenom || '',
          enseignant2_id: seance.enseignant2_id,
          enseignant2_nom: seance.prof2_nom || '',
          enseignant2_prenom: seance.prof2_prenom || '',
          salle_id: seance.salle_id,
          salle_nom: seance.salle_nom || seance.salle_numero,
          classe_id: seance.classe_id,
          classe_nom: seance.classe_nom,
          type: seance.type || 'Cours',
          semaine_type: seance.semaine_type || 'toutes',
          rattrapage: seance.rattrapage === 1,
          date_seance: seance.date_seance,
        };

        grid[seance.jour][seance.seance].push(seanceObj);
      });

      setEmploiData(grid);
    } catch (err) {
      console.error('[SalleEmploi] Erreur:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeance = async (seanceId) => {
    try {
      await deleteSeance(seanceId);
      if (selectedConfig) {
        await loadEmploiData(selectedConfig, semestre);
      }
    } catch (err) {
      console.error('[SalleEmploi] Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleMoveSeance = async (seanceId, fromJour, fromSeance, toJour, toSeance) => {
    try {
      await updateSeance(seanceId, { jour: toJour, seance: toSeance });
      if (selectedConfig) {
        await loadEmploiData(selectedConfig, semestre);
      }
    } catch (err) {
      console.error('[SalleEmploi] Erreur déplacement:', err);
      alert('Erreur lors du déplacement');
    }
  };

  const handleCellClick = (jour, seance) => {
    console.log('Cellule cliquée:', jour, seance);
  };

  if (error) {
    return (
      <div className="p-5 min-h-screen bg-slate-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] mb-5" style={{ color: BLUE }}>
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour aux salles
        </button>
        <div className="text-center text-red-600 bg-red-50 rounded-lg p-4">
          <p className="font-bold mb-2">Erreur: {error}</p>
          <p className="text-sm">salleId reçu: {JSON.stringify(salleId)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 min-h-screen bg-slate-50">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] mb-5" style={{ color: BLUE }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour aux salles
      </button>

      <div className="text-lg font-bold mb-4" style={{ color: BLUE }}>
        Emploi du temps - Salle {salleNumero || salleId}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 uppercase">Semestre</span>
        <div className="flex gap-2">
          {['S1', 'S2'].map(s => (
            <button key={s} onClick={() => setSemestre(s)}
              className="px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
              style={{
                border: `1.5px solid ${semestre === s ? BLUE : '#e2e8f0'}`,
                background: semestre === s ? BLUE : '#fff',
                color: semestre === s ? '#fff' : '#64748b',
              }}>
              {s}
            </button>
          ))}
        </div>

        {configurations.length > 0 && (
          <select 
            value={selectedConfig?.id || ''}
            onChange={e => handleConfigChange(parseInt(e.target.value))}
            className="ml-auto px-3 py-1.5 text-[13px] border rounded-lg">
            {configurations.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <div className="text-center py-4">Chargement...</div>}

      {!loading && selectedConfig && (
        <EmploiTableau
          selectedConfig={selectedConfig}
          emploiData={emploiData}
          emploiType="salle"
          selectedItem={getValidSalleId()}
          selectedItemName={`Salle ${salleNumero || salleId}`}
          onCellClick={handleCellClick}
          onDeleteSeance={handleDeleteSeance}
          onMoveSeance={handleMoveSeance}
        />
      )}
    </div>
  );
}