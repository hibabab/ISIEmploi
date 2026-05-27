import React, { useState } from 'react';
import { addClasse } from '../../database/classes';

const ClasseForm = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nom: '',
    niveau: '',
    filiere: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      setError('Veuillez saisir le nom de la classe');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await addClasse({
        nom: formData.nom.trim(),
        niveau: formData.niveau || null,
        filiere: formData.filiere || null
      });
      
      setFormData({ nom: '', niveau: '', filiere: '' });
      onSuccess();
      onClose();
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        setError('❌ Cette classe existe déjà');
      } else {
        setError('❌ Erreur lors de l\'ajout de la classe');
      }
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[0.5px] bg-black/30"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border"
        style={{ borderColor: '#237AFF20' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#237AFF20' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: '#237AFF' }}>
              Ajouter une classe
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Formulaire */}
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">

              {error && (
                <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                  {error}
                </div>
              )}

              {/* Nom de la classe */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Nom de la classe *
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Ex: 1ING.01, LIC1.01, MGL2.01"
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Entrez le nom exact de la classe</p>
              </div>

              {/* Niveau */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Niveau (optionnel)
                </label>
                <select
                  name="niveau"
                  value={formData.niveau}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                >
                  <option value="">Sélectionner un niveau</option>
                  <option value="1">1ère année</option>
                  <option value="2">2ème année</option>
                  <option value="3">3ème année</option>
                  <option value="4">4ème année</option>
                  <option value="5">5ème année</option>
                </select>
              </div>

              {/* Filière */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Filière (optionnel)
                </label>
                <select
                  name="filiere"
                  value={formData.filiere}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                >
                  <option value="">Sélectionner une filière</option>
                  <option value="ingenieur">Cycle Ingénieur</option>
                  <option value="licence">Licence</option>
                  <option value="master">Master</option>
                  <option value="prepa">Prépa intégrée</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#237AFF15' }}>
              <button
                type="button"
                onClick={() => {
                  setFormData({ nom: '', niveau: '', filiere: '' });
                  setError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Effacer
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#237AFF' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ajout...
                  </>
                ) : (
                  'Ajouter la classe'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClasseForm;