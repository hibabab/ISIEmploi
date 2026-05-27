import React, { useState, useEffect } from 'react';
import { getEnseignants } from '../../database/enseignants';
import { getMatieres } from '../../database/matiere';
import { getSalles } from '../../database/salles';
import { addSeance, checkConflicts, getSeancesByProfesseur, getSeancesBySalle } from '../../database/seances';

const IconCheck = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>;
const IconX = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>;
const IconLoader = () => <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
const IconWarn = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;

const stripQuotes = (s) => (typeof s === 'string' ? s.replace(/^"|"$/g, '') : s);

function CoursePopup({ isOpen, onClose, initialData, selectedItemId, selectedSemestre, onSuccess }) {
  const [data, setData] = useState({
    jour: '', seance: '', enseignant_id: '', salle_id: '',
    matiere_id: '', type: 'Cours', semaine_type: 'toutes',
    repartition: 'toute_classe', date_seance: '', multipleDates: [], rattrapage: false,
  });

  const [seanceMode, setSeanceMode] = useState('fixe');
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [salles, setSalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [existingSeances, setExistingSeances] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  
  // États pour les disponibilités en temps réel
  const [salleAvailability, setSalleAvailability] = useState({});
  const [profAvailability, setProfAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const semestreDB = selectedSemestre === '2' ? 'S2' : 'S1';

  // Reset à l'ouverture
  useEffect(() => {
    if (!isOpen || !initialData) return;
    setExistingSeances(initialData.existingSeances || []);
    setSeanceMode('fixe');
    setSelectedDate('');
    setData({
      jour: initialData.jour || '',
      seance: initialData.seance || '',
      enseignant_id: '', salle_id: '', matiere_id: '',
      type: 'Cours', semaine_type: 'toutes', repartition: 'toute_classe',
      date_seance: '', multipleDates: [], rattrapage: false,
    });
    setError(null);
    setSalleAvailability({});
    setProfAvailability({});
  }, [isOpen, initialData]);

  // Charger référentiels
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const [ens, mat, sal] = await Promise.all([getEnseignants(), getMatieres(), getSalles()]);
        setEnseignants(ens || []);
        setMatieres(mat || []);
        setSalles(sal || []);
      } catch (err) {
        setError('Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  // Modifiez ces deux fonctions :

// Vérifier la disponibilité d'une salle pour un créneau donné
const checkSalleAvailability = async (salleId, jour, seance, semaineType, mode, dateSeance = null) => {
  try {
    const seances = await getSeancesBySalle(salleId, semestreDB);
    
    // Pour planifiée, on vérifie comme une séance fixe (ignore la date)
    if (mode === 'planifiee') {
      const conflict = seances.find(s => {
        // Ignorer les séances planifiées (avec date) - on ne vérifie que les fixes
        if (s.date_seance) return false;
        return stripQuotes(s.jour) === jour && 
               stripQuotes(s.seance) === seance &&
               (semaineType === 'toutes' || s.semaine_type === 'toutes' || s.semaine_type === semaineType);
      });
      return { available: !conflict, conflictSeance: conflict };
    }
    
    // Pour fixe, même logique
    if (mode === 'fixe') {
      const conflict = seances.find(s => {
        if (s.date_seance) return false;
        return stripQuotes(s.jour) === jour && 
               stripQuotes(s.seance) === seance &&
               (semaineType === 'toutes' || s.semaine_type === 'toutes' || s.semaine_type === semaineType);
      });
      return { available: !conflict, conflictSeance: conflict };
    }
    
    return { available: true, conflictSeance: null };
  } catch (err) {
    console.error("Erreur vérification salle:", err);
    return { available: true, conflictSeance: null };
  }
};

// Vérifier la disponibilité d'un professeur pour un créneau donné
const checkProfAvailability = async (profId, jour, seance, semaineType, mode, dateSeance = null) => {
  try {
    const seances = await getSeancesByProfesseur(profId, semestreDB);
    
    // Pour planifiée, on vérifie comme une séance fixe (ignore la date)
    if (mode === 'planifiee') {
      const conflict = seances.find(s => {
        // Ignorer les séances planifiées (avec date) - on ne vérifie que les fixes
        if (s.date_seance) return false;
        return stripQuotes(s.jour) === jour && 
               stripQuotes(s.seance) === seance &&
               (semaineType === 'toutes' || s.semaine_type === 'toutes' || s.semaine_type === semaineType);
      });
      return { available: !conflict, conflictSeance: conflict };
    }
    
    // Pour fixe, même logique
    if (mode === 'fixe') {
      const conflict = seances.find(s => {
        if (s.date_seance) return false;
        return stripQuotes(s.jour) === jour && 
               stripQuotes(s.seance) === seance &&
               (semaineType === 'toutes' || s.semaine_type === 'toutes' || s.semaine_type === semaineType);
      });
      return { available: !conflict, conflictSeance: conflict };
    }
    
    return { available: true, conflictSeance: null };
  } catch (err) {
    console.error("Erreur vérification professeur:", err);
    return { available: true, conflictSeance: null };
  }
};
  // Vérifier toutes les disponibilités quand les critères changent
  useEffect(() => {
    const checkAllAvailabilities = async () => {
      if (!isOpen) return;
      
      const shouldCheck = 
        (seanceMode === 'fixe' && data.jour && data.seance && data.semaine_type) ||
        (seanceMode === 'planifiee' && data.jour && data.seance && data.date_seance);
      
      if (!shouldCheck || salles.length === 0 || enseignants.length === 0) return;
      
      setCheckingAvailability(true);
      
      try {
        // Vérifier chaque salle
        const salleResults = {};
        for (const salle of salles) {
          const result = await checkSalleAvailability(
            salle.id, data.jour, data.seance, data.semaine_type, 
            seanceMode, data.date_seance
          );
          salleResults[salle.id] = result;
        }
        setSalleAvailability(salleResults);
        
        // Vérifier chaque professeur
        const profResults = {};
        for (const prof of enseignants) {
          const result = await checkProfAvailability(
            prof.id, data.jour, data.seance, data.semaine_type,
            seanceMode, data.date_seance
          );
          profResults[prof.id] = result;
        }
        setProfAvailability(profResults);
        
      } catch (err) {
        console.error("Erreur vérification disponibilités:", err);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkAllAvailabilities();
  }, [isOpen, seanceMode, data.jour, data.seance, data.semaine_type, data.date_seance, salles, enseignants]);

  // Trier les salles par disponibilité
  const sallesDisponibles = React.useMemo(() => {
    if (Object.keys(salleAvailability).length === 0) return salles;
    
    const avecDispo = salles.map(salle => {
      const availability = salleAvailability[salle.id];
      return {
        ...salle,
        disponible: availability?.available ?? true,
        conflit: availability?.conflictSeance
      };
    });
    
    return avecDispo.sort((a, b) => {
      if (a.disponible && !b.disponible) return -1;
      if (!a.disponible && b.disponible) return 1;
      return 0;
    });
  }, [salles, salleAvailability]);

  // Trier les professeurs par disponibilité
  const professeursDisponibles = React.useMemo(() => {
    if (Object.keys(profAvailability).length === 0) return enseignants;
    
    const avecDispo = enseignants.map(prof => {
      const availability = profAvailability[prof.id];
      return {
        ...prof,
        disponible: availability?.available ?? true,
        conflit: availability?.conflictSeance
      };
    });
    
    return avecDispo.sort((a, b) => {
      if (a.disponible && !b.disponible) return -1;
      if (!a.disponible && b.disponible) return 1;
      return 0;
    });
  }, [enseignants, profAvailability]);

  // Statut de la salle sélectionnée
  const selectedSalleStatus = (() => {
    if (!data.salle_id) return { status: 'idle', info: '' };
    if (checkingAvailability) return { status: 'loading', info: '' };
    if (Object.keys(salleAvailability).length === 0) return { status: 'idle', info: '' };
    
    const availability = salleAvailability[data.salle_id];
    if (availability && !availability.available) {
      return {
        status: 'conflict',
        info: availability.conflictSeance ? 
          `${availability.conflictSeance.matiere_nom || ''} — ${availability.conflictSeance.classe_nom || ''}` : 
          'Occupée'
      };
    }
    return { status: 'ok', info: '' };
  })();

  // Statut du professeur sélectionné
  const selectedProfStatus = (() => {
    if (!data.enseignant_id) return { status: 'idle', info: '' };
    if (checkingAvailability) return { status: 'loading', info: '' };
    if (Object.keys(profAvailability).length === 0) return { status: 'idle', info: '' };
    
    const availability = profAvailability[data.enseignant_id];
    if (availability && !availability.available) {
      return {
        status: 'conflict',
        info: availability.conflictSeance ? 
          `${availability.conflictSeance.matiere_nom || ''} — ${availability.conflictSeance.classe_nom || ''}` : 
          'Occupé'
      };
    }
    return { status: 'ok', info: '' };
  })();

  const set = (field, value) => { setData(prev => ({ ...prev, [field]: value })); setError(null); };

  const handleModeChange = (newMode) => {
    setSeanceMode(newMode);
    if (newMode === 'fixe') {
      setData(prev => ({ ...prev, date_seance: '', multipleDates: [] }));
    } else if (newMode === 'planifiee') {
      setData(prev => ({ ...prev, multipleDates: [] }));
    } else if (newMode === 'multi') {
      setData(prev => ({ ...prev, date_seance: '' }));
    }
    setError(null);
  };

  const handleAddSingleDate = () => {
    if (!selectedDate) { setError('Veuillez sélectionner une date'); return; }
    if (data.multipleDates.includes(selectedDate)) { setError('Date déjà dans la liste'); return; }
    set('multipleDates', [...data.multipleDates, selectedDate]);
    setSelectedDate('');
  };

  const handleSave = async () => {
    const classeId = selectedItemId;
    const enseignantId = data.enseignant_id || null;
    const salleId = data.salle_id || null;
    const matiereId = data.matiere_id || null;

    if (!matiereId) { setError('Veuillez sélectionner une matière'); return; }
    if (!enseignantId) { setError('Veuillez sélectionner un professeur'); return; }
    if (!salleId) { setError('Veuillez sélectionner une salle'); return; }

    // Vérification des conflits avant sauvegarde (sauf rattrapage)
    if (!data.rattrapage) {
      if (selectedProfStatus.status === 'conflict') {
        setError(`❌ Professeur indisponible : ${selectedProfStatus.info}`);
        return;
      }
      if (selectedSalleStatus.status === 'conflict') {
        setError(`❌ Salle indisponible : ${selectedSalleStatus.info}`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      // Mode multi-dates
      if (seanceMode === 'multi') {
        if (data.multipleDates.length === 0) {
          setError('Ajoutez au moins une date');
          setSaving(false);
          return;
        }
        
        let ok = 0, ko = 0;
        for (const date of data.multipleDates) {
          try {
            const c = await checkConflicts(date, data.jour, data.seance, classeId, enseignantId, salleId, semestreDB);
            
            if (!data.rattrapage && (c.classe || c.enseignant || c.salle)) {
              ko++;
              continue;
            }
            
            await addSeance({
              jour: data.jour, seance: data.seance, type: data.type,
              classe_id: classeId, enseignant_id: enseignantId, matiere_id: matiereId,
              salle_id: salleId, date_seance: date, repartition: data.repartition,
              semaine_type: null, rattrapage: data.rattrapage ? 1 : 0, semestre: semestreDB
            });
            ok++;
          } catch { ko++; }
        }
        
        if (ok > 0) {
          alert(`✅ ${ok} séance(s) enregistrée(s) avec succès${ko > 0 ? `, ${ko} ignorée(s)` : ''}`);
          onSuccess?.();
          onClose();
        } else {
          throw new Error('Aucune séance enregistrée (toutes en conflit)');
        }
        return;
      }

      // Mode fixe ou planifiée
      const payload = {
        jour: data.jour, seance: data.seance, type: data.type,
        classe_id: classeId, enseignant_id: enseignantId, matiere_id: matiereId, salle_id: salleId,
        semaine_type: seanceMode === 'planifiee' ? null : (data.semaine_type || 'toutes'),
        repartition: data.repartition,
        date_seance: seanceMode === 'planifiee' ? (data.date_seance || null) : null,
        rattrapage: data.rattrapage ? 1 : 0,
        semestre: semestreDB,
      };

      await addSeance(payload);
      
      const rattrapageMsg = data.rattrapage ? " (rattrapage)" : "";
      alert(`✅ Séance ${seanceMode === 'planifiee' ? 'planifiée' : 'fixe'} ajoutée${rattrapageMsg}`);
      
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasBlockingConflict = !data.rattrapage && 
    (seanceMode === 'fixe' || seanceMode === 'planifiee') && 
    (selectedProfStatus.status === 'conflict' || selectedSalleStatus.status === 'conflict');

  const showDispoCheck = (seanceMode === 'fixe' || (seanceMode === 'planifiee' && data.date_seance)) &&
    data.jour && data.seance && !loading;

  const sallesDispoCount = sallesDisponibles.filter(s => s.disponible).length;
  const profsDispoCount = professeursDisponibles.filter(p => p.disponible).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Ajouter un cours</h3>
            <p className="text-gray-500 text-xs mt-0.5">{data.jour} • {data.seance?.replace('_', ' ')}</p>
            <p className="text-xs text-blue-600 mt-0.5">📚 Semestre {selectedSemestre === '2' ? '2' : '1'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <IconWarn /><span>{error}</span>
            </div>
          )}

          {loading ? <div className="text-center py-8 text-gray-400">Chargement…</div> : (<>

            {/* TYPE DE SÉANCE */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Type de séance</label>
              <div className="flex gap-6 flex-wrap">
                {[
                  { value: 'fixe', label: 'Fixe', desc: 'récurrente (vérif semaine paire/impair)' },
                  { value: 'planifiee', label: 'Planifiée', desc: 'date unique' },
                  { value: 'multi', label: 'Multi-dates', desc: 'plusieurs dates' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="seance_type" value={value}
                      checked={seanceMode === value} onChange={() => handleModeChange(value)}
                      className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {seanceMode === 'planifiee' && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date de la séance *</label>
                  <input 
                    type="date" 
                    value={data.date_seance || ''} 
                    onChange={e => set('date_seance', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" 
                  />
                </div>
              )}

              {seanceMode === 'multi' && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex gap-3 items-start flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Ajouter une date</label>
                      <div className="flex gap-2">
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button onClick={handleAddSingleDate} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">+</button>
                      </div>
                    </div>
                    {data.multipleDates.length > 0 && (
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{data.multipleDates.length} date(s)</label>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                          {[...data.multipleDates].sort().map(date => (
                            <div key={date} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-xs">
                              <span>📅 {date}</span>
                              <button onClick={() => set('multipleDates', data.multipleDates.filter(d => d !== date))}
                                className="text-red-500 hover:text-red-700 font-bold">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SEMAINE (fixe uniquement) */}
            {seanceMode === 'fixe' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Semaine</label>
                <div className="flex gap-6 flex-wrap">
                  {['toutes', 'paire', 'impair'].map(val => {
                    const label = val === 'toutes' ? 'Toutes les semaines' : val === 'paire' ? 'Semaines paires' : 'Semaines impaires';
                    const alreadyFilled = existingSeances.some(s => s.semaine_type === val && !s.date_seance && s.repartition === data.repartition);
                    return (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="semaine_type" value={val} checked={data.semaine_type === val}
                          onChange={e => set('semaine_type', e.target.value)} 
                          className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{label}</span>
                        {alreadyFilled && <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">⚠️ Déjà remplie</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RÉPARTITION */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Répartition</label>
              <div className="flex gap-6 flex-wrap">
                {[
                  { value: 'toute_classe', label: 'Toute la classe', desc: 'Cours pour tous' },
                  { value: 'groupe1', label: 'Groupe 1', desc: 'Premier groupe' },
                  { value: 'groupe2', label: 'Groupe 2', desc: 'Deuxième groupe' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="repartition" value={value} checked={data.repartition === value}
                      onChange={e => set('repartition', e.target.value)} className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* RATTRAPAGE */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.rattrapage} 
                  onChange={e => set('rattrapage', e.target.checked)}
                  className="w-5 h-5 text-amber-600 rounded border-amber-300" 
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">📌 Séance de rattrapage</span>
                  <p className="text-xs text-gray-500">Ignore les conflits de disponibilité</p>
                </div>
              </label>
            </div>

            {/* PROFESSEUR */}
            <div className={`p-4 rounded-lg border transition-colors ${
              selectedProfStatus.status === 'conflict' ? 'bg-red-50 border-red-300'
                : selectedProfStatus.status === 'ok' ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Professeur *</label>
                <div className="flex items-center gap-2">
                  {checkingAvailability && <span className="text-[11px] text-gray-400"><IconLoader/> Vérification...</span>}
                  {showDispoCheck && !checkingAvailability && Object.keys(profAvailability).length > 0 && (
                    <span className="text-[11px] text-gray-400">
                      {profsDispoCount} / {enseignants.length} disponibles
                    </span>
                  )}
                  {!data.rattrapage && <AvailBadge status={selectedProfStatus.status} label={selectedProfStatus.info} />}
                </div>
              </div>

              <select
                value={data.enseignant_id || ''}
                onChange={e => set('enseignant_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">-- Sélectionner un professeur --</option>
                {professeursDisponibles.map(prof => (
                  <option 
                    key={prof.id} 
                    value={prof.id}
                    disabled={!data.rattrapage && !prof.disponible && Object.keys(profAvailability).length > 0}
                  >
                    {prof.prenom} {prof.nom}
                    {!data.rattrapage && !prof.disponible && Object.keys(profAvailability).length > 0 && ` — ⚠️ ${prof.conflit?.matiere_nom || 'Occupé'}`}
                  </option>
                ))}
              </select>
            </div>

            {/* SALLE */}
            <div className={`p-4 rounded-lg border transition-colors ${
              selectedSalleStatus.status === 'conflict' ? 'bg-red-50 border-red-300'
                : selectedSalleStatus.status === 'ok' ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Salle *</label>
                <div className="flex items-center gap-2">
                  {checkingAvailability && <span className="text-[11px] text-gray-400"><IconLoader/> Vérification...</span>}
                  {showDispoCheck && !checkingAvailability && Object.keys(salleAvailability).length > 0 && (
                    <span className="text-[11px] text-gray-400">
                      {sallesDispoCount} / {salles.length} disponibles
                    </span>
                  )}
                  {!data.rattrapage && <AvailBadge status={selectedSalleStatus.status} label={selectedSalleStatus.info} />}
                </div>
              </div>

              <select
                value={data.salle_id || ''}
                onChange={e => set('salle_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">-- Sélectionner une salle --</option>
                {sallesDisponibles.map(salle => (
                  <option 
                    key={salle.id} 
                    value={salle.id}
                    disabled={!data.rattrapage && !salle.disponible && Object.keys(salleAvailability).length > 0}
                  >
                    {salle.id}
                    {!data.rattrapage && !salle.disponible && Object.keys(salleAvailability).length > 0 && ` — ⚠️ ${salle.conflit?.matiere_nom || 'Occupée'}`}
                  </option>
                ))}
              </select>
            </div>

            {/* CONFLIT GLOBAL */}
            {hasBlockingConflict && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800">
                <IconWarn />
                <div>
                  <p className="font-semibold">Conflit détecté — impossible d'enregistrer</p>
                  {selectedProfStatus.status === 'conflict' && <p className="text-xs mt-1">• Professeur : {selectedProfStatus.info}</p>}
                  {selectedSalleStatus.status === 'conflict' && <p className="text-xs mt-0.5">• Salle : {selectedSalleStatus.info}</p>}
                  <p className="text-xs mt-2">💡 Cochez "Séance de rattrapage" pour ignorer les conflits</p>
                </div>
              </div>
            )}

            {/* MATIÈRE + TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Matière *</label>
                <select value={data.matiere_id || ''} onChange={e => set('matiere_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">-- Sélectionner une matière --</option>
                  {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Type de cours</label>
                <select value={data.type || 'Cours'} onChange={e => set('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="Cours">Cours</option>
                  <option value="TD">TD</option>
                  <option value="TP">TP</option>
                  <option value="CI">CI</option>
                </select>
              </div>
            </div>

          </>)}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!data.rattrapage && hasBlockingConflict) || checkingAvailability}
            className="px-5 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: ((!data.rattrapage && hasBlockingConflict) || checkingAvailability) ? '#94a3b8' : '#0A497E' }}
          >
            {saving ? 'Enregistrement…' : 
             checkingAvailability ? 'Vérification...' :
             (!data.rattrapage && hasBlockingConflict) ? '⚠ Conflits détectés' : 
             data.rattrapage ? '📌 Ajouter (rattrapage)' : 'Ajouter'}
          </button>
        </div>

      </div>
    </div>
  );
}

function AvailBadge({ status, label }) {
  if (status === 'idle') return null;
  if (status === 'loading') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      <IconLoader/> Vérification…
    </span>
  );
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
      <IconCheck/> Disponible
    </span>
  );
  if (status === 'conflict') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
      <IconX/> Indisponible
    </span>
  );
  return null;
}

export default CoursePopup;