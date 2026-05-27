import React, { useState, useEffect } from 'react';
import ClasseForm from './ClasseForm';
import ClasseEmploi from './ClasseEmploi';
import { getClasses, deleteClasse } from '../../database/classes';

const Classes = () => {
  const [hoveredClass, setHoveredClass] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classeToDelete, setClasseToDelete] = useState(null);
  const [showEmploiView, setShowEmploiView] = useState(false);
  const [classeToView, setClasseToView] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    chargerClasses();
  }, []);

  const chargerClasses = async () => {
    const data = await getClasses();
    setClasses(data);
  };

  // Nettoyer le nom : enlever guillemets, espaces, caractères spéciaux au début
  const cleanNom = (nom) => {
    if (!nom) return '';
    return nom.replace(/^[^a-zA-Z0-9]+/, '').trim();
  };

  // Détecter la filière à partir du nom nettoyé
  const getFiliereFromNom = (nom) => {
    if (!nom || nom.length === 0) return 'ingenieur';

    const cleaned = cleanNom(nom);
    const firstChar = cleaned.charAt(0).toUpperCase();

    if (firstChar === 'M') return 'master';
    if (firstChar === 'L') return 'licence';
    return 'ingenieur';
  };

  // Afficher le nom sans guillemets ni caractères spéciaux au début et à la fin
  const getDisplayNom = (nom) => {
    if (!nom) return nom;
    return nom.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9.]+$/g, '').trim();
  };

  // Grouper par filière
  const classesData = classes.reduce((acc, cls) => {
    const filiere = getFiliereFromNom(cls.nom);
    if (!acc[filiere]) acc[filiere] = [];
    acc[filiere].push(cls);
    return acc;
  }, {});

  const totalClasses = classes.length;
  const totalFilieres = Object.keys(classesData).length;

  const getFiliereLabel = (filiere) => {
    const labels = {
      'ingenieur': 'Cycle Ingénieur',
      'licence': ' Licence',
      'master': ' Master',
      'prepa': '📖 Prépa intégrée',
    };
    return labels[filiere] || filiere;
  };

  const getFiliereColor = (filiere) => {
    const colors = {
      'ingenieur': '#237AFF',
      'licence': '#10B981',
      'master': '#8B5CF6',
      'prepa': '#F59E0B',
      'bts': '#EF4444',
      'autre': '#6B7280'
    };
    return colors[filiere] || '#237AFF';
  };

  const handleDeleteConfirm = async () => {
    await deleteClasse(classeToDelete.id);
    setShowDeleteModal(false);
    setClasseToDelete(null);
    setMessage('✅ Classe supprimée avec succès !');
    await chargerClasses();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSuccess = async () => {
    setIsFormOpen(false);
    setMessage('✅ Classe ajoutée avec succès !');
    await chargerClasses();
    setTimeout(() => setMessage(''), 3000);
  };

  const openEmploiView = (classe) => {
    setClasseToView(classe);
    setShowEmploiView(true);
  };

  const closeEmploiView = () => {
    setShowEmploiView(false);
    setClasseToView(null);
  };

  const sortClassesByNom = (classesGroup) => {
    return [...classesGroup].sort((a, b) => a.nom.localeCompare(b.nom));
  };

  const filiereOrder = ['ingenieur', 'master', 'licence', 'prepa', 'bts', 'autre'];

  return (
    <div className="p-4" style={{ backgroundColor: '#E5F0F8' }}>

      {/* Message */}
      {message && (
        <div className="mb-3 p-3 rounded-lg text-sm font-medium bg-green-50 text-green-800 border border-green-200">
          {message}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>
              Gestion des Classes
            </h1>
            <div className="flex gap-4 mt-1">
              <p className="text-sm text-gray-500">
                Total: <span className="font-semibold" style={{ color: '#237AFF' }}>{totalClasses}</span> classe{totalClasses > 1 ? 's' : ''}
              </p>
              {totalFilieres > 0 && (
                <p className="text-sm text-gray-500">
                  Filières: <span className="font-semibold" style={{ color: '#237AFF' }}>{totalFilieres}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow transition hover:opacity-90"
            style={{ backgroundColor: '#237AFF' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter Classe
          </button>
        </div>
      </div>

      {/* Sections par filière */}
      <div className="space-y-6">
        {filiereOrder.map((filiere) => {
          const classesGroup = classesData[filiere];
          if (!classesGroup || classesGroup.length === 0) return null;

          const sortedClasses = sortClassesByNom(classesGroup);

          return (
            <div key={filiere}>
              {/* Titre avec lignes décoratives */}
              <div className="flex items-center justify-center mb-4 gap-4">
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${getFiliereColor(filiere)}30)` }}></div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-700">
                    {getFiliereLabel(filiere)}
                  </h2>
                </div>
                <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${getFiliereColor(filiere)}30, transparent)` }}></div>
              </div>

              {/* Grille des classes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredClass(cls.id)}
                    onMouseLeave={() => setHoveredClass(null)}
                  >
                    <div
                      className="bg-white rounded-lg shadow-sm p-3 text-center border-2 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                      style={{
                        borderColor: hoveredClass === cls.id ? getFiliereColor(filiere) : `${getFiliereColor(filiere)}20`,
                        backgroundColor: hoveredClass === cls.id ? `${getFiliereColor(filiere)}05` : 'white'
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-blue-500">
                          {getDisplayNom(cls.nom)}
                        </span>
                      </div>
                    </div>

                    {/* Options au survol */}
                    {hoveredClass === cls.id && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        <button
                          onClick={() => openEmploiView(cls)}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                          title="Voir emploi du temps"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setClasseToDelete(cls); setShowDeleteModal(true); }}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                          title="Supprimer"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Aucune classe */}
        {classes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm font-medium">Aucune classe enregistrée</p>
            <p className="text-xs text-gray-400 mt-1">Cliquez sur le bouton ci-dessus pour ajouter des classes</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-4 px-4 py-2 text-sm rounded-lg text-white transition hover:opacity-90"
              style={{ backgroundColor: '#237AFF' }}
            >
              Ajouter votre première classe
            </button>
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Confirmer la suppression</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Voulez-vous vraiment supprimer la classe <strong className="text-gray-700">{classeToDelete?.nom}</strong> ?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Annuler
              </button>
              <button onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout */}
      <ClasseForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={handleSuccess} />

      {/* Vue Emploi du temps */}
      {showEmploiView && classeToView && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <ClasseEmploi
            classeId={classeToView.id}
            classeNom={classeToView.nom}
            onBack={closeEmploiView}
          />
        </div>
      )}
    </div>
  );
};

export default Classes;
