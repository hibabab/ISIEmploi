// src/components/Salles/Salle.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SalleForm from './SalleForm';
import DisponibiliteForm from './DisponibiliteForm';
import SalleEmploi from './SalleEmploi';  

import { getSalles, deleteSalle } from '../../database/salles';

const TYPE_CONFIG = {
  amphi:  { label: 'Amphithéâtres', color: '#7C3AED', bg: '#7C3AED15', border: '#7C3AED40' },
  tp:     { label: 'Salles TP',      color: '#059669', bg: '#05966915', border: '#05966940' },
  cours:  { label: 'Salles de cours', color: '#237AFF', bg: '#237AFF15', border: '#237AFF40' },
  null:   { label: 'Non classées',   color: '#6B7280', bg: '#6B728015', border: '#6B728040' },
};

const Salle = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDispoOpen, setIsDispoOpen] = useState(false);
  const [salles, setSalles] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [salleToDelete, setSalleToDelete] = useState(null);
  const [showEmploiView, setShowEmploiView] = useState(false);
  const [salleToView, setSalleToView] = useState(null);
  const [salleToEdit, setSalleToEdit] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null); // id de la salle dont le menu est ouvert
  const [message, setMessage] = useState({ text: '', type: 'success' });
  const [loading, setLoading] = useState(false);
const openEmploi = (salle) => {
  setSalleToView(salle);
  setShowEmploiView(true);
  setActiveMenu(null);
};
  const chargerSalles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSalles();
      setSalles(data || []);
    } catch (error) {
      showMessage('Erreur lors du chargement des salles', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { chargerSalles(); }, [chargerSalles]);

  // Fermer menu si clic ailleurs
  useEffect(() => {
    const close = () => setActiveMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
  };

  const handleDeleteConfirm = async () => {
    if (!salleToDelete) return;
    setLoading(true);
    try {
      await deleteSalle(salleToDelete.id);
      setShowDeleteModal(false);
      setSalleToDelete(null);
      showMessage(`✅ Salle "${salleToDelete.id}" supprimée avec succès !`);
      await chargerSalles();
    } catch {
      showMessage('❌ Erreur lors de la suppression', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (isEdit = false) => {
    setIsFormOpen(false);
    setSalleToEdit(null);
    showMessage(isEdit ? '✅ Salle modifiée avec succès !' : '✅ Salle ajoutée avec succès !');
    await chargerSalles();
  };

  const openEdit = (salle) => {
    setSalleToEdit(salle);
    setIsFormOpen(true);
    setActiveMenu(null);
  };

  // Grouper les salles par type
  const grouped = salles.reduce((acc, salle) => {
    const key = salle.type || 'null';
    if (!acc[key]) acc[key] = [];
    acc[key].push(salle);
    return acc;
  }, {});

  // Ordre d'affichage des groupes
  const groupOrder = ['amphi', 'cours', 'tp', 'null'];
  const groupsToRender = groupOrder.filter(k => grouped[k]?.length > 0);

  return (
    <div className=" p-4" onClick={() => setActiveMenu(null)}>
      {/* Notification */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium shadow-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Gestion des Salles</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total: <span className="font-semibold" style={{ color: '#237AFF' }}>{salles.length}</span> salle{salles.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDispoOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md transition-all hover:opacity-90"
              style={{ backgroundColor: '#237AFF' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Vérifier disponibilité
            </button>
            <button
              onClick={() => { setSalleToEdit(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md transition-all hover:opacity-90"
              style={{ backgroundColor: '#237AFF' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter Salle
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {loading && salles.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : salles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-400 font-medium mb-4">Aucune salle enregistrée</p>
          <button onClick={() => setIsFormOpen(true)} className="px-6 py-2 text-sm rounded-lg text-white hover:opacity-90" style={{ backgroundColor: '#237AFF' }}>
            + Ajouter votre première salle
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupsToRender.map(typeKey => {
            const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG['null'];
            const list = grouped[typeKey];
            return (
              <div key={typeKey}>
                {/* Titre du groupe */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    {config.label}
                  </div>
                  <span className="text-xs text-gray-400">{list.length} salle{list.length > 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Grille */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {list.map(salle => (
                    <div key={salle.id} className="relative" onClick={e => e.stopPropagation()}>
                      {/* Carte */}
                      <div
                        onClick={() => setActiveMenu(activeMenu === salle.id ? null : salle.id)}
                        className="bg-white rounded-xl shadow-sm p-4 text-center border-2 transition-all cursor-pointer hover:shadow-md hover:scale-105 select-none"
                        style={{
                          borderColor: activeMenu === salle.id ? config.color : 'transparent',
                          boxShadow: activeMenu === salle.id ? `0 4px 12px ${config.color}25` : '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span className="text-sm font-semibold block" style={{ color: config.color }}>
                          {salle.id}
                        </span>
                        {salle.capacite && (
                          <span className="text-xs text-gray-400 mt-0.5 block">{salle.capacite} places</span>
                        )}
                      </div>

                      {/* Menu contextuel */}
                      {activeMenu === salle.id && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-100">
                          <button
      onClick={() => openEmploi(salle)}
      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Consulter emploi
    </button>
                          <button
                            onClick={() => openEdit(salle)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            onClick={() => { setSalleToDelete(salle); setShowDeleteModal(true); setActiveMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && salleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Confirmer la suppression</h3>
            <p className="text-gray-500 text-center mb-6">
              Supprimer la salle <span className="font-semibold text-gray-700">"{salleToDelete.id}"</span> ?
              <br /><span className="text-xs">Cette action est irréversible.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Annuler</button>
              <button onClick={handleDeleteConfirm} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {loading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SalleForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSalleToEdit(null); }}
        onSuccess={handleSuccess}
        salleToEdit={salleToEdit}
      />
      <DisponibiliteForm isOpen={isDispoOpen} onClose={() => setIsDispoOpen(false)} />

      {showEmploiView && salleToView && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto animate-in slide-in-from-right duration-300">
    <SalleEmploi 
      salleId={salleToView.id} 
      salleNumero={salleToView.id} 
      onBack={() => { 
        setShowEmploiView(false); 
        setSalleToView(null); 
      }} 
    />
  </div>
      )}
    </div>
  );
};

export default Salle;