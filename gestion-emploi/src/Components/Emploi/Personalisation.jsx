import React, { useState, useEffect } from 'react';
import { getConfiguration, saveConfiguration, updateSeance, deleteSeance } from '../../database/personalisation';

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

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
  annee: '2025-2026',
  dateDebutS1: '2025-09-01',
  dateFinS1: '2026-01-31',
  dateDebutS2: '2026-02-01',
  dateFinS2: '2026-06-30',
  jours: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
  sequence: DEFAULT_SEQUENCE,
  dureeSeance: 90,
};

// Calcul heure fin depuis heure début + durée
const calcHeureFin = (heureDebut, dureeMin) => {
  const [h, m] = heureDebut.split(':').map(Number);
  const total = h * 60 + m + dureeMin;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

// Calcul durée en minutes entre deux heures
const calcDuree = (debut, fin) => {
  const [dh, dm] = debut.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  return (fh * 60 + fm) - (dh * 60 + dm);
};

function Personalisation() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // État pour le modal d'édition de séance
  const [editModal, setEditModal] = useState({ open: false, index: null, heureDebut: '', heureFin: '' });

  useEffect(() => {
    chargerConfig();
  }, []);

  const chargerConfig = async () => {
    try {
      const data = await getConfiguration();
      if (data && Object.keys(data).length > 0) {
        setConfig(data);
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setConfig(DEFAULT_CONFIG);
    }
  };

  const showMessage = (msg, duration = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  const handleField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleJourToggle = (jour) => {
    setConfig(prev => ({
      ...prev,
      jours: prev.jours.includes(jour)
        ? prev.jours.filter(j => j !== jour)
        : [...prev.jours, jour]
    }));
  };

  // ── Modifier heure directement dans la liste ──
  const handleSequenceChange = (index, field, value) => {
    setConfig(prev => {
      const newSeq = [...prev.sequence];
      const item = { ...newSeq[index], [field]: value };

      if (field === 'heureDebut' && item.element !== 'PAUSE') {
        item.heureFin = calcHeureFin(value, prev.dureeSeance);
        item.duree = prev.dureeSeance;
      }
      if (field === 'heureFin') {
        item.duree = calcDuree(item.heureDebut, value);
      }

      newSeq[index] = item;
      return { ...prev, sequence: newSeq };
    });
  };

  // ── Ajouter une séance ──
  const addSeance = () => {
    const seanceElements = config.sequence.filter(s => s.element.startsWith('SEANCE'));
    const count = seanceElements.length + 1;
    const dernierElement = config.sequence[config.sequence.length - 1];
    const heureDebut = dernierElement?.heureFin || '08:00';
    const heureFin = calcHeureFin(heureDebut, config.dureeSeance);

    setConfig(prev => ({
      ...prev,
      sequence: [
        ...prev.sequence,
        { element: `SEANCE_${count}`, heureDebut, heureFin, duree: config.dureeSeance }
      ]
    }));
  };

  // ── Ajouter une pause ──
  const addPause = () => {
    const dernierElement = config.sequence[config.sequence.length - 1];
    const heureDebut = dernierElement?.heureFin || '12:00';
    const heureFin = calcHeureFin(heureDebut, 50);

    setConfig(prev => ({
      ...prev,
      sequence: [
        ...prev.sequence,
        { element: 'PAUSE', heureDebut, heureFin, duree: 50 }
      ]
    }));
  };

  // ── Supprimer une séance ──
  const removeElement = async (index) => {
    const item = config.sequence[index];
    try {
      if (item.id && config.id) {
        await deleteSeance(item.id);
      }
    } catch (e) {
      console.error('Erreur suppression séance:', e);
    }
    setConfig(prev => ({
      ...prev,
      sequence: prev.sequence.filter((_, i) => i !== index)
    }));
  };

  // ── Ouvrir modal d'édition ──
  const openEditModal = (index) => {
    const item = config.sequence[index];
    setEditModal({ open: true, index, heureDebut: item.heureDebut, heureFin: item.heureFin });
  };

  // ── Sauvegarder l'édition du modal ──
  const saveEditModal = async () => {
    const { index, heureDebut, heureFin } = editModal;
    const item = config.sequence[index];
    const duree = calcDuree(heureDebut, heureFin);

    try {
      if (item.id && config.id) {
        await updateSeance(item.id, heureDebut, heureFin, duree);
      }
    } catch (e) {
      console.error('Erreur mise à jour séance:', e);
    }

    setConfig(prev => {
      const newSeq = [...prev.sequence];
      newSeq[index] = { ...newSeq[index], heureDebut, heureFin, duree };
      return { ...prev, sequence: newSeq };
    });
    setEditModal({ open: false, index: null, heureDebut: '', heureFin: '' });
    showMessage('✅ Séance mise à jour.');
  };

  // ── Reset ──
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setMessage('');
  };

  // ── Sauvegarder ──
  const handleSave = async () => {
    if (!config.nom?.trim()) return showMessage('❌ Veuillez donner un nom à la configuration.');
    if (config.jours.length === 0) return showMessage('❌ Veuillez sélectionner au moins un jour.');
    if (!config.dateDebutS1 || !config.dateFinS1) return showMessage('❌ Veuillez renseigner les dates du Semestre 1.');
    if (!config.dateDebutS2 || !config.dateFinS2) return showMessage('❌ Veuillez renseigner les dates du Semestre 2.');

    setLoading(true);
    try {
      await saveConfiguration(config);
      await chargerConfig(); // Recharger pour avoir les IDs
      showMessage(`✅ Configuration "${config.nom}" sauvegardée !`);
    } catch (err) {
      console.error(err);
      showMessage('❌ Erreur lors de la sauvegarde.');
    }
    setLoading(false);
  };

  const isPause = (element) => element === 'PAUSE';

  const getElementLabel = (element) => {
    if (isPause(element)) return ' Pause';
    return element.replace('_', ' ');
  };

  const getElementBadgeColor = (element) => {
    if (isPause(element)) return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
  };

  return (
    <div className=" p-6" style={{ backgroundColor: '#E5F0F8' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Personnalisation</h1>
          <p className="text-sm text-gray-500 mt-1">Configurez l'emploi du temps selon vos besoins</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${
            message.includes('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-5">

          {/* Nom */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
              <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-900">Nom de la configuration</h2>
            </div>
            <div className="p-5">
              <input
                type="text"
                value={config.nom || ''}
                onChange={(e) => handleField('nom', e.target.value)}
                placeholder="Ex: Emploi du temps 2024-2025"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                style={{ borderColor: '#237AFF30' }}
              />
              <p className="text-xs text-gray-400 mt-1">Donnez un nom unique à cette configuration</p>
            </div>
          </div>

          {/* Année + Durée séance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900">Année académique</h2>
              </div>
              <div className="p-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
                <input
  type="number"
  min="2020"
  max="2100"
  value={parseInt(config.annee.split('-')[0])}
  onChange={(e) => {
    const start = parseInt(e.target.value);
    handleField("annee", `${start}-${start + 1}`);
  }}
  className="w-full px-3 py-2 border rounded-lg"
/>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900">Durée des séances</h2>
              </div>
              <div className="p-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">Durée par défaut</label>
                <select
                  value={config.dureeSeance}
                  onChange={(e) => handleField('dureeSeance', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                </select>
              </div>
            </div>
          </div>

          {/* Semestres - S1 et S2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Semestre 1 */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <h2 className="text-sm font-semibold text-blue-800">Semestre 1</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={config.dateDebutS1 || ''}
                    onChange={(e) => handleField('dateDebutS1', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                    style={{ borderColor: '#237AFF30' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={config.dateFinS1 || ''}
                    onChange={(e) => handleField('dateFinS1', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                    style={{ borderColor: '#237AFF30' }}
                  />
                </div>
              </div>
            </div>

            {/* Semestre 2 */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <h2 className="text-sm font-semibold text-green-800">Semestre 2</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={config.dateDebutS2 || ''}
                    onChange={(e) => handleField('dateDebutS2', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                    style={{ borderColor: '#237AFF30' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={config.dateFinS2 || ''}
                    onChange={(e) => handleField('dateFinS2', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                    style={{ borderColor: '#237AFF30' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Jours */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
              <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-900">Jours ouvrés</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {JOURS_SEMAINE.map((jour, index) => (
                  <label
                    key={index}
                    className={`flex items-center px-4 py-2 rounded-lg cursor-pointer transition font-medium text-xs ${
                      config.jours.includes(jour)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={config.jours.includes(jour) ? { backgroundColor: '#237AFF' } : {}}
                  >
                    <input type="checkbox" checked={config.jours.includes(jour)} onChange={() => handleJourToggle(jour)} className="hidden" />
                    {jour}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Séances */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ backgroundColor: '#237AFF08', borderColor: '#237AFF20' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900">Séances & Pauses</h2>
              </div>
              <span className="text-xs text-gray-400">{config.sequence.length} éléments</span>
            </div>
            <div className="p-5">

              {/* En-tête tableau */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-2">
                <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Élément</div>
                <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Heure début</div>
                <div className="col-span-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Heure fin</div>
                <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Durée</div>
                <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Actions</div>
              </div>

              {/* Lignes séances */}
              <div className="space-y-2">
                {config.sequence.map((item, index) => {
                  const colors = getElementBadgeColor(item.element);
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg border transition"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      {/* Label */}
                      <div className="col-span-3">
                        <span className="text-xs font-semibold" style={{ color: colors.text }}>
                          {getElementLabel(item.element)}
                        </span>
                      </div>

                      {/* Heure début */}
                      <div className="col-span-3">
                        <input
                          type="time"
                          value={item.heureDebut}
                          onChange={(e) => handleSequenceChange(index, 'heureDebut', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#237AFF] bg-white"
                          style={{ borderColor: '#237AFF30' }}
                        />
                      </div>

                      {/* Heure fin */}
                      <div className="col-span-3">
                        <input
                          type="time"
                          value={item.heureFin}
                          onChange={(e) => handleSequenceChange(index, 'heureFin', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#237AFF] bg-white"
                          style={{ borderColor: '#237AFF30' }}
                        />
                      </div>

                      {/* Durée calculée */}
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-gray-500">
                          {item.duree ? `${item.duree} min` : `${calcDuree(item.heureDebut, item.heureFin)} min`}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        {/* Bouton édition modal */}
                        <button
                          onClick={() => openEditModal(index)}
                          title="Modifier"
                          className="p-1 rounded hover:bg-white text-blue-400 hover:text-blue-600 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Bouton suppression */}
                        <button
                          onClick={() => removeElement(index)}
                          title="Supprimer"
                          className="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Boutons ajouter */}
              <div className="flex gap-2 pt-4 mt-2 border-t" style={{ borderColor: '#237AFF15' }}>
                <button
                  onClick={addSeance}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 flex items-center gap-1.5"
                  style={{ backgroundColor: '#237AFF' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une séance
                </button>
                <button
                  onClick={addPause}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 flex items-center gap-1.5"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une pause
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions globales */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg transition hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#237AFF' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* ── Modal édition séance ── */}
      {editModal.open && (
        <div className="fixed inset-0  flex items-center justify-center ">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier la séance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure de début</label>
                <input
                  type="time"
                  value={editModal.heureDebut}
                  onChange={(e) => setEditModal(prev => ({ ...prev, heureDebut: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heure de fin</label>
                <input
                  type="time"
                  value={editModal.heureFin}
                  onChange={(e) => setEditModal(prev => ({ ...prev, heureFin: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                />
              </div>
              {editModal.heureDebut && editModal.heureFin && (
                <p className="text-xs text-gray-400">
                  Durée : <span className="font-semibold text-gray-600">{calcDuree(editModal.heureDebut, editModal.heureFin)} min</span>
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditModal({ open: false, index: null, heureDebut: '', heureFin: '' })}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveEditModal}
                className="flex-1 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: '#237AFF' }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Personalisation;
