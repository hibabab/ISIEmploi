import React, { useState } from 'react';
import { getSeancesByJour } from '../../database/seances';
import { getSalles } from '../../database/salles';

const DisponibiliteForm = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    jour: '',
    heureDebut: '',
    heureFin: '',
    typeRecherche: 'toutes', // 'toutes' ou 'specifique'
    salleSpecifique: ''
  });
  const [resultats, setResultats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  if (!isOpen) return null;

  const joursSemaine = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
  ];

  const heures = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Réinitialiser les résultats quand le formulaire change
    if (searchPerformed) {
      setSearchPerformed(false);
      setResultats(null);
    }
  };

  const verifierDisponibilite = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les salles
      const toutesSalles = await getSalles();
      
      // Récupérer les séances pour le jour sélectionné
      const seancesJour = await getSeancesByJour(formData.jour);
      
      // Convertir les heures en timestamp pour comparaison
      const heureDebutTimestamp = formData.heureDebut;
      const heureFinTimestamp = formData.heureFin;
      
      // Filtrer les salles disponibles
      let sallesDisponibles = [];
      
      if (formData.typeRecherche === 'specifique') {
        // Chercher uniquement la salle spécifique
        const salle = toutesSalles.find(s => 
          s.numero.toLowerCase() === formData.salleSpecifique.toLowerCase()
        );
        
        if (salle) {
          const estOccupee = seancesJour.some(seance => 
            seance.salle_id === salle.id && estConflit(seance)
          );
          
          sallesDisponibles = [{
            ...salle,
            disponible: !estOccupee,
            coursConflit: estOccupee ? trouverCoursConflit(seancesJour, salle.id) : null
          }];
        } else {
          sallesDisponibles = [{
            numero: formData.salleSpecifique,
            disponible: false,
            inexistante: true
          }];
        }
      } else {
        // Vérifier toutes les salles
        sallesDisponibles = toutesSalles.map(salle => {
          const estOccupee = seancesJour.some(seance => 
            seance.salle_id === salle.id && estConflit(seance)
          );
          
          return {
            ...salle,
            disponible: !estOccupee,
            coursConflit: estOccupee ? trouverCoursConflit(seancesJour, salle.id) : null
          };
        });
      }
      
      setResultats({
        salles: sallesDisponibles,
        critere: {
          jour: formData.jour,
          heureDebut: formData.heureDebut,
          heureFin: formData.heureFin,
          type: formData.typeRecherche
        }
      });
      setSearchPerformed(true);
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setResultats({
        error: 'Erreur lors de la vérification des disponibilités'
      });
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si une séance est en conflit avec le créneau demandé
  const estConflit = (seance) => {
    // Cette fonction nécessite que les séances aient des heures
    // Pour l'instant, on retourne false car les heures ne sont pas stockées dans seances
    // À améliorer quand la structure des données sera plus complète
    return false;
  };

  const trouverCoursConflit = (seances, salleId) => {
    const seanceConflit = seances.find(s => s.salle_id === salleId);
    return seanceConflit ? {
      matiere: seanceConflit.matiere_nom,
      professeur: seanceConflit.prof_nom,
      horaire: seanceConflit.seance
    } : null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifierDisponibilite();
  };

  const getDisponibiliteColor = (disponible, inexistante) => {
    if (inexistante) return 'bg-red-100 text-red-800 border-red-300';
    if (disponible) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getDisponibiliteIcone = (disponible, inexistante) => {
    if (inexistante) return '❌';
    if (disponible) return '✅';
    return '⚠️';
  };

  const getDisponibiliteTexte = (disponible, inexistante) => {
    if (inexistante) return 'Salle inexistante';
    if (disponible) return 'Disponible';
    return 'Occupée';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[0.5px] bg-black/30"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border"
        style={{ borderColor: '#237AFF20' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#237AFF20' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: '#237AFF' }}>
              Vérifier la disponibilité des salles
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Jour de la semaine */}
            <div className="sm:col-span-2">
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Jour de la semaine *
              </label>
              <select
                name="jour"
                value={formData.jour}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                style={{ borderColor: '#237AFF30' }}
                required
              >
                <option value="">Sélectionner un jour</option>
                {joursSemaine.map(jour => (
                  <option key={jour} value={jour}>{jour}</option>
                ))}
              </select>
            </div>

            {/* Heure début et heure fin */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Heure de début *
              </label>
              <select
                name="heureDebut"
                value={formData.heureDebut}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                style={{ borderColor: '#237AFF30' }}
                required
              >
                <option value="">Sélectionner l'heure</option>
                {heures.map(heure => (
                  <option key={heure} value={heure}>{heure}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Heure de fin *
              </label>
              <select
                name="heureFin"
                value={formData.heureFin}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                style={{ borderColor: '#237AFF30' }}
                required
              >
                <option value="">Sélectionner l'heure</option>
                {heures.map(heure => (
                  <option key={heure} value={heure}>{heure}</option>
                ))}
              </select>
            </div>

            {/* Type de recherche */}
            <div className="sm:col-span-2">
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Type de recherche
              </label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="typeRecherche"
                    value="toutes"
                    checked={formData.typeRecherche === 'toutes'}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: '#237AFF' }}
                  />
                  <span className="text-sm text-gray-700">Toutes les salles</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="typeRecherche"
                    value="specifique"
                    checked={formData.typeRecherche === 'specifique'}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: '#237AFF' }}
                  />
                  <span className="text-sm text-gray-700">Salle spécifique</span>
                </label>
              </div>
            </div>

            {/* Salle spécifique (conditionnel) */}
            {formData.typeRecherche === 'specifique' && (
              <div className="sm:col-span-2">
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  Numéro de la salle *
                </label>
                <input
                  type="text"
                  name="salleSpecifique"
                  value={formData.salleSpecifique}
                  onChange={handleChange}
                  placeholder="ex: 101, B101, Amphi A, etc."
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition focus:ring-2 focus:ring-[#237AFF] focus:border-[#237AFF]"
                  style={{ borderColor: '#237AFF30' }}
                  required={formData.typeRecherche === 'specifique'}
                />
              </div>
            )}
          </div>

          {/* Information supplémentaire */}
          <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: '#237AFF10', borderColor: '#237AFF20' }}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ color: '#237AFF' }}>
                La vérification prendra en compte les réservations existantes et les emplois du temps.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#237AFF15' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#237AFF' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Vérification...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Vérifier la disponibilité
                </>
              )}
            </button>
          </div>
        </form>

        {/* Résultats de la recherche */}
        {searchPerformed && resultats && (
          <div className="border-t px-6 py-5" style={{ borderColor: '#237AFF20', backgroundColor: '#F9FAFB' }}>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Résultats pour le {resultats.critere.jour} de {resultats.critere.heureDebut} à {resultats.critere.heureFin}
            </h4>
            
            {resultats.error ? (
              <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg">
                {resultats.error}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resultats.salles.map((salle, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getDisponibiliteColor(salle.disponible, salle.inexistante)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getDisponibiliteIcone(salle.disponible, salle.inexistante)}</span>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {salle.numero || salle.numero}
                          </div>
                          {salle.type && (
                            <div className="text-xs text-gray-500">{salle.type}</div>
                          )}
                          {salle.capacite && (
                            <div className="text-xs text-gray-500">Capacité: {salle.capacite} places</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {getDisponibiliteTexte(salle.disponible, salle.inexistante)}
                      </div>
                    </div>
                    {salle.coursConflit && (
                      <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded">
                        Occupé par: {salle.coursConflit.matiere} avec {salle.coursConflit.professeur} ({salle.coursConflit.horaire})
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Résumé */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Salles disponibles:</span>
                    <span className="font-bold" style={{ color: '#237AFF' }}>
                      {resultats.salles.filter(s => s.disponible && !s.inexistante).length} / {resultats.salles.filter(s => !s.inexistante).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisponibiliteForm;