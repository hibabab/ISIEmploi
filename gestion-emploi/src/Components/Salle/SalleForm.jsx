// src/components/Salle/SalleForm.jsx
import React, { useState, useEffect } from 'react';
import { addSalle, checkSalleExists, updateSalle } from '../../database/salles';

const TYPES = [
  { value: 'cours',  label: 'Salle Cours' },
  { value: 'tp',     label: 'Salle TP' },
  { value: 'amphi',  label: 'Amphi' },
];

const ETATS = [
  { value: 'ouverte',  label: 'Ouverte' },
  { value: 'fermee',   label: 'Fermée' },
  { value: 'travaux',  label: 'En travaux' },
];

const SalleForm = ({ isOpen, onClose, onSuccess, salleToEdit = null }) => {
  const isEdit = !!salleToEdit;

  const [form, setForm] = useState({
    id: '',
    capacite: '',
    capacite_ex: '',
    type: '',
    etat: 'ouverte',
    code_proemp: '',
    soutenance: false,
    salle_smartex: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && salleToEdit) {
      setForm({
        id:            salleToEdit.id            ?? '',
        capacite:      salleToEdit.capacite      ?? '',
        capacite_ex:   salleToEdit.capacite_ex   ?? '',
        type:          salleToEdit.type           ?? '',
        etat:          salleToEdit.etat           ?? 'ouverte',
        code_proemp:   salleToEdit.code_proemp   ?? '',
        soutenance:    !!salleToEdit.soutenance,
        salle_smartex: salleToEdit.salle_smartex ?? '',
      });
    } else {
      setForm({ id: '', capacite: '', capacite_ex: '', type: '', etat: 'ouverte', code_proemp: '', soutenance: false, salle_smartex: '' });
    }
    setError('');
  }, [salleToEdit, isOpen]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const salleId = form.id.trim();
    if (!salleId) return setError("L'ID ne peut pas être vide");

    setLoading(true);
    try {
      if (isEdit) {
        await updateSalle({ ...form, id: salleId, capacite: form.capacite || null, capacite_ex: form.capacite_ex || null });
      } else {
        const exists = await checkSalleExists(salleId);
        if (exists) return setError(`La salle "${salleId}" existe déjà`);
        await addSalle({ ...form, id: salleId, capacite: form.capacite || null, capacite_ex: form.capacite_ex || null });
      }
      onSuccess();
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[0.5px] bg-black/30" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border"
        style={{ borderColor: '#237AFF20' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#237AFF20' }}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: '#237AFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: '#237AFF' }}>
              {isEdit ? 'Modifier la salle' : 'Ajouter une salle'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg p-1.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form className="px-6 py-5 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">❌ {error}</div>
          )}

          {/* ID */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">ID de la salle *</label>
            <input
              type="text"
              value={form.id}
              onChange={set('id')}
              placeholder="Ex: A001, B102"
              className={inputCls}
              style={{ borderColor: '#237AFF30' }}
              disabled={isEdit}
              required
              autoFocus={!isEdit}
            />
            {isEdit && <p className="text-xs text-gray-400 mt-1">L'ID ne peut pas être modifié</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Type de salle</label>
            <div className="flex gap-2">
              {TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: p.type === value ? '' : value }))}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border-2 font-medium transition-all ${
                    form.type === value
                      ? 'text-white border-[#237AFF]'
                      : 'text-gray-600 border-gray-200 hover:border-[#237AFF] hover:text-[#237AFF]'
                  }`}
                  style={form.type === value ? { backgroundColor: '#237AFF' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Capacités */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Capacité normale</label>
              <input
                type="number"
                value={form.capacite}
                onChange={set('capacite')}
                placeholder="Ex: 35"
                min="0"
                className={inputCls}
                style={{ borderColor: '#237AFF30' }}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Capacité examen</label>
              <input
                type="number"
                value={form.capacite_ex}
                onChange={set('capacite_ex')}
                placeholder="Ex: 20"
                min="0"
                className={inputCls}
                style={{ borderColor: '#237AFF30' }}
              />
            </div>
          </div>

          {/* État */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">État</label>
            <select value={form.etat} onChange={set('etat')} className={inputCls} style={{ borderColor: '#237AFF30' }}>
              <option value="">-- Sélectionner --</option>
              {ETATS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Code ProEmp & Smartex */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Code ProEmp</label>
              <input
                type="text"
                value={form.code_proemp}
                onChange={set('code_proemp')}
                placeholder="Ex: A001"
                className={inputCls}
                style={{ borderColor: '#237AFF30' }}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Salle Smartex</label>
              <input
                type="text"
                value={form.salle_smartex}
                onChange={set('salle_smartex')}
                placeholder="Ex: A001"
                className={inputCls}
                style={{ borderColor: '#237AFF30' }}
              />
            </div>
          </div>

          {/* Soutenance */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative">
              <input type="checkbox" checked={form.soutenance} onChange={set('soutenance')} className="sr-only" />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${form.soutenance ? 'bg-[#237AFF]' : 'bg-gray-300'}`}
              />
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.soutenance ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">Disponible pour soutenances</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: '#237AFF15' }}>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#237AFF' }}
            >
              {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalleForm;