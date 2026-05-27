import React, { useState, useEffect } from 'react';
import { getConfiguration, getAllConfigurations } from '../../database/personalisation';
import {
  getSeancesByClasse,
  getSeancesByProfesseur,
  getSeancesBySalle,
  deleteSeance,
  updateSeance,
} from '../../database/seances';
import { getClasses }     from '../../database/classes';
import { getEnseignants } from '../../database/enseignants';
import { getSalles }      from '../../database/salles';
import { getMatieres }    from '../../database/matiere';
import CoursePopup   from './CoursePopup';
import EmploiTableau from './EmploiTableau';

function mapSeance(s) {
  return {
    id:                s.id,
    jour:              s.jour,
    seance:            s.seance,
    matiere_nom:       s.matiere_nom      || s.matiere_libelle || '',
    matiere_libelle:   s.matiere_libelle  || '',
    matiere_id:        s.matiere_id,
    enseignant_prenom: s.enseignant_prenom || s.prof_prenom || '',
    enseignant_nom:    s.enseignant_nom    || s.prof_nom    || '',
    enseignant_id:     s.enseignant_id     ?? null,
    enseignant2_id:    s.enseignant2_id    ?? null,
    prof2_prenom:      s.prof2_prenom      || '',
    prof2_nom:         s.prof2_nom         || '',
    salle_nom:         s.salle_nom || s.salle_id || '',
    salle_id:          s.salle_id          ?? null,
    type:              s.type              || 'Cours',
    classe_nom:        s.classe_nom        || '',
    classe_id:         s.classe_id         ?? null,
    date_seance:       s.date_seance       ?? null,
    semaine_type:      s.semaine_type      || 'toutes',
    repartition:       s.repartition       || 'toute_classe',
    rattrapage:        s.rattrapage === 1  || s.rattrapage === true,
    semestre:          s.semestre          || 'S1',
    debut:             s.debut             ?? null,
    duree:             s.duree             ?? null,
    new_nature:        s.new_nature        ?? null,
  };
}

function Emploitemps() {
  const [selectedConfig,    setSelectedConfig]   = useState(null);
  const [emploiData,        setEmploiData]        = useState({});
  const [allSeances,        setAllSeances]        = useState([]);
  const [allSeancesGlobal,  setAllSeancesGlobal]  = useState([]); // ✅ NOUVEAU
  const [showPopup,         setShowPopup]         = useState(false);
  const [popupData,         setPopupData]         = useState({
    jour: '', seance: '', matiere_id: '', enseignant_id: '', salle_id: '',
    type: 'Cours', classe_id: '', date_seance: null, semaine_type: 'toutes',
    repartition: 'toute_classe', enseignant_groupe1: '', enseignant_groupe2: '',
    salle_groupe1: '', salle_groupe2: '', id: null,
  });
  const [emploiType,        setEmploiType]        = useState('classe');
  const [selectedItem,      setSelectedItem]      = useState('');
  const [selectedSemestre,  setSelectedSemestre]  = useState('1');
  const [classes,           setClasses]           = useState([]);
  const [enseignants,       setEnseignants]       = useState([]);
  const [salles,            setSalles]            = useState([]);
  const [matieres,          setMatieres]          = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [configLoading,     setConfigLoading]     = useState(true);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setConfigLoading(true);
    try {
      const [classesData, enseignantsData, sallesData, matieresData] = await Promise.all([
        getClasses(), getEnseignants(), getSalles(), getMatieres(),
      ]);
      setClasses(classesData         || []);
      setEnseignants(enseignantsData || []);
      setSalles(sallesData           || []);
      setMatieres(matieresData       || []);
      await loadDefaultConfiguration();
      // ✅ Charger toutes les séances globales pour la détection de conflits
      await loadAllSeancesGlobal(classesData || []);
    } catch (err) {
      console.error('Erreur chargement initial:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  // ✅ NOUVELLE FONCTION — charge toutes les séances de toutes les classes
  const loadAllSeancesGlobal = async (classesList) => {
    try {
      const results = await Promise.all(
        classesList.map(c => getSeancesByClasse(c.id).catch(() => []))
      );
      const toutes = results.flat().map(mapSeance);
      setAllSeancesGlobal(toutes);
    } catch (err) {
      console.error('Erreur chargement séances globales:', err);
    }
  };

  const loadDefaultConfiguration = async () => {
    try {
      let config = await getConfiguration();
      if (!config) {
        const configs = await getAllConfigurations();
        if (configs?.length > 0) config = configs[0];
      }
      if (config) {
        setSelectedConfig(config);
        initEmptyEmploi(config);
      }
    } catch (err) {
      console.error('Erreur chargement configuration:', err);
    }
  };

  const initEmptyEmploi = (config) => {
    if (!config?.jours || !config?.sequence) return;
    const empty = {};
    config.jours.forEach(jour => {
      empty[jour] = {};
      config.sequence.forEach(s => { empty[jour][s.element] = []; });
    });
    setEmploiData(empty);
  };

  const loadEmploiData = async (type, itemId, semestre) => {
    if (!selectedConfig || !itemId) return;
    setLoading(true);

    const empty = {};
    selectedConfig.jours.forEach(jour => {
      empty[jour] = {};
      selectedConfig.sequence.forEach(s => { empty[jour][s.element] = []; });
    });

    try {
      const semestreDB = semestre === '1' ? 'S1' : 'S2';
      let rawSeances = [];

      if (type === 'classe') {
        const all = await getSeancesByClasse(itemId);
        rawSeances = all.filter(s =>
          s.semestre === semestreDB ||
          s.semestre === semestre   ||
          (semestre === '1' && (s.semestre === 'S1' || s.semestre === 1)) ||
          (semestre === '2' && (s.semestre === 'S2' || s.semestre === 2))
        );
      } else if (type === 'professeur') {
        const idNum = Number(itemId);
        const idStr = String(itemId);
        let result = await getSeancesByProfesseur(idNum, semestreDB);
        if (result.length === 0) result = await getSeancesByProfesseur(idStr, semestreDB);
        if (result.length === 0) result = await getSeancesByProfesseur(idNum, null);
        rawSeances = result;
      } else if (type === 'salle') {
        rawSeances = await getSeancesBySalle(itemId, semestreDB);
      }

      const mapped = rawSeances.map(mapSeance);
      setAllSeances(mapped);

      mapped.forEach(seance => {
        if (empty[seance.jour]?.[seance.seance] !== undefined) {
          empty[seance.jour][seance.seance].push(seance);
        } else {
          console.warn('Séance ignorée - jour/seance non trouvé:', seance.jour, seance.seance);
        }
      });

      setEmploiData(empty);

      // ✅ Rafraîchir le global après chaque chargement
      await loadAllSeancesGlobal(classes);
    } catch (err) {
      console.error('Erreur chargement emploi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setEmploiType(type);
    setSelectedItem('');
    setSelectedSemestre('1');
    setAllSeances([]);
    if (selectedConfig) initEmptyEmploi(selectedConfig);
  };

  const handleItemSelect = (itemId) => {
    setSelectedItem(itemId);
    if (itemId && selectedConfig) {
      loadEmploiData(emploiType, itemId, selectedSemestre);
    } else {
      setAllSeances([]);
      if (selectedConfig) initEmptyEmploi(selectedConfig);
    }
  };

  const handleSemestreChange = (semestre) => {
    setSelectedSemestre(semestre);
    if (selectedItem && selectedConfig) {
      loadEmploiData(emploiType, selectedItem, semestre);
    }
  };

  const handleCellClick = (jour, seance, type, itemId) => {
    if (!itemId) { alert("Veuillez d'abord sélectionner un élément"); return; }

    const existingForSlot = allSeances
      .filter(s => s.jour === jour && s.seance === seance)
      .map(s => ({
        id:             s.id,
        matiere_id:     s.matiere_id,
        matiere_nom:    s.matiere_nom,
        enseignant_id:  s.enseignant_id,
        enseignant2_id: s.enseignant2_id,
        salle_id:       s.salle_id,
        classe_id:      s.classe_id,
        type:           s.type,
        semaine_type:   s.semaine_type,
        repartition:    s.repartition,
        date_seance:    s.date_seance,
        rattrapage:     s.rattrapage,
        semestre:       s.semestre,
      }));

    setPopupData({
      jour, seance,
      matiere_id: '', enseignant_id: '', salle_id: '',
      type: 'Cours',
      classe_id: type === 'classe' ? itemId : '',
      date_seance: null, semaine_type: 'toutes', repartition: 'toute_classe',
      enseignant_groupe1: '', enseignant_groupe2: '',
      salle_groupe1: '', salle_groupe2: '',
      id: null,
      existingSeances: existingForSlot,
    });
    setShowPopup(true);
  };

  const handleDeleteSeance = async (id) => {
    try {
      await deleteSeance(id);
      setAllSeances(prev => prev.filter(s => s.id !== id));
      // ✅ Mettre à jour aussi le global
      setAllSeancesGlobal(prev => prev.filter(s => s.id !== id));
      setEmploiData(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        Object.keys(next).forEach(jour => {
          Object.keys(next[jour]).forEach(seance => {
            next[jour][seance] = (next[jour][seance] || []).filter(s => s.id !== id);
          });
        });
        return next;
      });
    } catch (err) {
      console.error('Erreur suppression séance:', err);
      alert('Erreur lors de la suppression. Veuillez réessayer.');
    }
  };

  const handleMoveSeance = async (id, fromJour, fromSeance, toJour, toSeance, overrides = {}) => {
    try {
      const seanceSource = allSeances.find(s => s.id === id);
      if (!seanceSource) return;

      const updated = {
        ...seanceSource,
        jour:   toJour,
        seance: toSeance,
        ...overrides,
      };

      await updateSeance(id, updated);

      setAllSeances(prev => prev.map(s => s.id === id ? updated : s));

      // ✅ Mettre à jour aussi le global
      setAllSeancesGlobal(prev => prev.map(s => s.id === id ? updated : s));

      setEmploiData(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[fromJour]?.[fromSeance]) {
          next[fromJour][fromSeance] = next[fromJour][fromSeance].filter(s => s.id !== id);
        }
        if (!next[toJour])           next[toJour] = {};
        if (!next[toJour][toSeance]) next[toJour][toSeance] = [];
        next[toJour][toSeance].push(updated);
        return next;
      });
    } catch (err) {
      console.error('Erreur déplacement séance:', err);
      alert('Erreur lors du déplacement. Veuillez réessayer.');
    }
  };

  const handleSuccess = () => {
    if (selectedItem) loadEmploiData(emploiType, selectedItem, selectedSemestre);
  };

  const getItemLabel = () => {
    if (emploiType === 'classe')     return 'une classe';
    if (emploiType === 'professeur') return 'un enseignant';
    return 'une salle';
  };

  const getSelectedItemName = () => {
    if (!selectedItem) return '';
    if (emploiType === 'classe') {
      const c = classes.find(c => String(c.id) === String(selectedItem));
      return c ? c.nom : '';
    }
    if (emploiType === 'professeur') {
      const e = enseignants.find(e => String(e.id) === String(selectedItem));
      return e ? `${e.prenom} ${e.nom}`.trim() : '';
    }
    if (emploiType === 'salle') {
      const s = salles.find(s => String(s.id) === String(selectedItem));
      return s ? String(s.id) : '';
    }
    return '';
  };

  const getSemestreDB = () => selectedSemestre === '1' ? 'S1' : 'S2';

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#E5F0F8' }}>
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" style={{ color: '#237AFF' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto p-6" style={{ backgroundColor: '#E5F0F8' }}>
      <div className="max-w-full mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Emploi du temps</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez et consultez les emplois du temps par classe, enseignant ou salle
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6" style={{ borderColor: '#237AFF20' }}>
          <div className="px-5 py-3 border-b" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h2 className="text-sm font-semibold" style={{ color: '#237AFF' }}>Filtres</h2>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-4 items-end">

              {selectedConfig && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Configuration active</label>
                  <div className="px-3 py-2 text-sm bg-gray-50 rounded-lg border" style={{ borderColor: '#237AFF30', color: '#237AFF' }}>
                    {selectedConfig.nom} ({selectedConfig.annee} - {selectedConfig.semestre})
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Type d'affichage</label>
                <div className="flex gap-2">
                  {[
                    { key: 'classe',     label: 'Classes' },
                    { key: 'professeur', label: 'Enseignants' },
                    { key: 'salle',      label: 'Salles' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleTypeChange(key)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition
                        ${emploiType === key ? 'text-white shadow-sm' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                      style={emploiType === key ? { backgroundColor: '#237AFF' } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sélectionner {getItemLabel()}
                </label>
                <select
                  value={selectedItem}
                  onChange={e => handleItemSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF] bg-white"
                  style={{ borderColor: '#237AFF30' }}
                >
                  <option value="">-- Choisir --</option>
                  {emploiType === 'classe'     && classes.map(c     => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  {emploiType === 'professeur' && enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                  {emploiType === 'salle'      && salles.map(s      => <option key={s.id} value={s.id}>{s.id}</option>)}
                </select>
              </div>

              <div className="min-w-[150px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Semestre</label>
                <div className="flex gap-2">
                  {['1', '2'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSemestreChange(s)}
                      disabled={!selectedItem}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition
                        ${selectedSemestre === s ? 'text-white shadow-sm' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}
                        disabled:opacity-40 disabled:cursor-not-allowed`}
                      style={selectedSemestre === s ? { backgroundColor: '#237AFF' } : {}}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
                {!selectedItem && (
                  <p className="text-[10px] text-gray-400 mt-1">Sélectionnez un élément d'abord</p>
                )}
              </div>

            </div>
          </div>
        </div>

        {!selectedConfig && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center" style={{ borderColor: '#237AFF20' }}>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#237AFF10' }}>
                <svg className="w-8 h-8" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Aucune configuration trouvée</p>
              <p className="text-xs text-gray-400 mt-1">Allez dans Personnalisation pour en créer une</p>
            </div>
          </div>
        )}

        {selectedConfig && (
          <>
            {loading && (
              <div className="mb-4 p-3 rounded-lg text-center" style={{ backgroundColor: '#237AFF10', color: '#237AFF' }}>
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </div>
              </div>
            )}

            {!selectedItem && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center mb-4" style={{ borderColor: '#237AFF20' }}>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#237AFF10' }}>
                    <svg className="w-6 h-6" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Sélectionnez {getItemLabel()} pour voir l'emploi du temps</p>
                </div>
              </div>
            )}

            {selectedItem && (
              <EmploiTableau
                selectedConfig={selectedConfig}
                emploiData={emploiData}
                onCellClick={handleCellClick}
                emploiType={emploiType}
                selectedItem={selectedItem}
                availableSalles={salles}
                availableEnseignants={enseignants}
                allSeancesGlobal={allSeancesGlobal}
                onMoveSeance={handleMoveSeance}
                onDeleteSeance={handleDeleteSeance}
                selectedItemName={getSelectedItemName()}
              />
            )}
          </>
        )}

        <CoursePopup
          isOpen={showPopup}
          onClose={() => setShowPopup(false)}
          initialData={popupData}
          selectedItemId={selectedItem}
          selectedSemestre={selectedSemestre}
          onSuccess={handleSuccess}
        />

      </div>
    </div>
  );
}

export default Emploitemps;