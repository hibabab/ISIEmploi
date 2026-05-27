import React, { useState, useEffect } from 'react';
import EnseignantForm from './EnseignantForm';
import EnseignantEmploi from './EnseignantEmploi';
import { getEnseignants, deleteEnseignant } from '../../database/enseignants';

const EnseignantTable = () => {
  // États pour les popups
  const [showFormPopup, setShowFormPopup] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmploiView, setShowEmploiView] = useState(false);
  
  // États pour les données
  const [enseignantToEdit, setEnseignantToEdit] = useState(null);
  const [enseignantToDeleteId, setEnseignantToDeleteId] = useState(null);
  const [enseignantToViewId, setEnseignantToViewId] = useState(null);
  const [enseignants, setEnseignants] = useState([]);
  const [message, setMessage] = useState('');
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Charger la liste des enseignants au montage
  useEffect(() => {
    chargerEnseignants();
  }, []);

  // Récupérer tous les enseignants
  const chargerEnseignants = async () => {
    const data = await getEnseignants();
    setEnseignants(data);
    setCurrentPage(1); // Revenir à la première page après chargement
  };

  // Pagination - calculer les indices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEnseignants = enseignants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(enseignants.length / itemsPerPage);

  // Changer de page
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Page précédente
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Page suivante
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Supprimer un enseignant
  const handleDelete = async () => {
    await deleteEnseignant(enseignantToDeleteId);
    setShowDeleteModal(false);
    setMessage('✅ Enseignant supprimé avec succès !');
    await chargerEnseignants();
    setTimeout(() => setMessage(''), 3000);
  };

  // Succès du formulaire
  const handleFormSuccess = async () => {
    setShowFormPopup(false);
    setMessage(enseignantToEdit ? '✅ Enseignant modifié !' : '✅ Enseignant ajouté !');
    await chargerEnseignants();
    setTimeout(() => setMessage(''), 3000);
  };

  // Ouvrir le formulaire pour ajouter
  const openAddForm = () => {
    setEnseignantToEdit(null);
    setShowFormPopup(true);
  };

  // Ouvrir le formulaire pour modifier
  const openEditForm = (enseignant) => {
    setEnseignantToEdit(enseignant);
    setShowFormPopup(true);
  };

  // Ouvrir la modal de suppression
  const openDeleteModal = (id) => {
    setEnseignantToDeleteId(id);
    setShowDeleteModal(true);
  };

  // Ouvrir la vue emploi du temps
  const openEmploiView = (id) => {
    setEnseignantToViewId(id);
    setShowEmploiView(true);
  };

  // Fermer la vue emploi du temps
  const closeEmploiView = () => {
    setShowEmploiView(false);
    setEnseignantToViewId(null);
  };

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  return (
    <div className="p-6">

      {/* Message de notification */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.includes('✅')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>
            Gestion des Enseignants
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {enseignants.length} enseignant{enseignants.length > 1 ? 's' : ''} enregistré{enseignants.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow transition hover:opacity-90"
          style={{ backgroundColor: '#237AFF' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un enseignant
        </button>
      </div>

      {/* Formulaire d'ajout/modification */}
      <EnseignantForm
        isOpen={showFormPopup}
        onClose={() => setShowFormPopup(false)}
        onSuccess={handleFormSuccess}
        enseignantToEdit={enseignantToEdit}
      />

      {/* Modal de confirmation suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Confirmer la suppression</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Cette action est irréversible. Voulez-vous vraiment supprimer cet enseignant ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vue Emploi du temps (plein écran) */}
      {showEmploiView && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <EnseignantEmploi
            enseignantId={enseignantToViewId}
            onBack={closeEmploiView}
          />
        </div>
      )}

      {/* Tableau des enseignants */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#237AFF20' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-sm font-semibold text-gray-800 text-left">
                  Enseignant
                </th>
                <th className="px-5 py-4 text-sm font-semibold text-gray-800 text-left">
                  Email
                </th>
                <th className="px-5 py-4 text-sm font-semibold text-gray-800 text-left">
                  Département
                </th>
                <th className="px-5 py-4 text-sm font-semibold text-gray-800 text-left">
                  Grade
                </th>
                <th className="px-5 py-4 text-sm font-semibold text-gray-800 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentEnseignants.map((enseignant) => (
                <tr key={enseignant.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-800">
                      {enseignant.prenom} {enseignant.nom}
                    </div>
                    <div className="text-xs text-gray-400">{enseignant.cin}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    <div className="truncate max-w-[200px]">{enseignant.email}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {enseignant.departement}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md`}>
                      {enseignant.grade}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        title="Consulter l'emploi du temps"
                        onClick={() => openEmploiView(enseignant.id)}
                        className="p-2 rounded-lg text-[#237AFF] hover:bg-blue-50 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        title="Modifier"
                        onClick={() => openEditForm(enseignant)}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        title="Supprimer"
                        onClick={() => openDeleteModal(enseignant.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Message si aucun enseignant */}
        {enseignants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <p className="text-sm font-medium">Aucun enseignant trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {enseignants.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#237AFF15', backgroundColor: '#237AFF08' }}>
            <span className="text-xs text-gray-500">
              Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, enseignants.length)} sur {enseignants.length} enseignants
            </span>
            
            <div className="flex items-center gap-2">
              {/* Bouton Précédent */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Numéros de page */}
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    currentPage === page
                      ? 'text-white'
                      : typeof page === 'number'
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-400 cursor-default'
                  }`}
                  style={currentPage === page ? { backgroundColor: '#237AFF' } : {}}
                  disabled={typeof page !== 'number'}
                >
                  {page}
                </button>
              ))}
              
              {/* Bouton Suivant */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnseignantTable;