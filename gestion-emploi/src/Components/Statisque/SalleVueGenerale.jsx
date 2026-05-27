// src/pages/SalleVueGenerale.jsx - Version avec nom et prénom de l'enseignant
import React, { useState, useEffect } from 'react';
import { getSeances } from '../../database/seances';

const SalleVueGenerale = () => {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semestre, setSemestre] = useState('S1');

  const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const seancesList = ['1', '2', '3', '4', '5', '6'];

  useEffect(() => {
    chargerDonnees();
  }, [semestre]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      // Récupérer TOUTES les séances d'un coup
      const toutesLesSeances = await getSeances();
      
      // Filtrer par semestre
      const seancesFiltrees = toutesLesSeances.filter(s => s.semestre === semestre);
      
      setSeances(seancesFiltrees);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir le nom complet de l'enseignant
  const getEnseignantNomComplet = (seance) => {
    const nom = seance.prof_nom || seance.enseignant_nom || '';
    const prenom = seance.prof_prenom || seance.enseignant_prenom || '';
    
    if (nom && prenom) {
      return `${prenom} ${nom}`;
    } else if (nom) {
      return nom;
    } else if (prenom) {
      return prenom;
    }
    return 'Non assigné';
  };

  // Grouper les séances par salle
  const sallesUniques = [...new Set(seances.map(s => s.salle_numero || s.salle_id))].sort();
  
  // Grouper par jour, séance et salle
  const seancesParJourSeanceSalle = {};
  
  joursOrdre.forEach(jour => {
    seancesParJourSeanceSalle[jour] = {};
    seancesList.forEach(seance => {
      seancesParJourSeanceSalle[jour][seance] = {};
      sallesUniques.forEach(salle => {
        seancesParJourSeanceSalle[jour][seance][salle] = [];
      });
    });
  });

  // Remplir la structure avec les séances
  seances.forEach(seance => {
    const jour = seance.jour;
    const numSeance = seance.seance;
    const salle = seance.salle_numero || seance.salle_id;
    
    if (seancesParJourSeanceSalle[jour] && 
        seancesParJourSeanceSalle[jour][numSeance] && 
        seancesParJourSeanceSalle[jour][numSeance][salle]) {
      seancesParJourSeanceSalle[jour][numSeance][salle].push(seance);
    }
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <pre style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          ⏳ CHARGEMENT DES DONNÉES...
        </pre>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '20px' }}>
      
      {/* EN-TÊTE PRINCIPAL STYLISÉ - Version complète */}
<div style={{ marginBottom: '24px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#237AFF' }}>
       Statistique Séances
    </h1>
    
    <div style={{ display: 'flex', gap: '12px' }}>
      <button
        onClick={() => setSemestre('S1')}
        style={{
          background: semestre === 'S1' ? '#237AFF' : '#f3f4f6',
          color: semestre === 'S1' ? 'white' : '#374151',
          border: 'none',
          padding: '8px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          transition: 'all 0.2s'
        }}
      >
         S1
      </button>
      <button
        onClick={() => setSemestre('S2')}
        style={{
          background: semestre === 'S2' ? '#237AFF' : '#f3f4f6',
          color: semestre === 'S2' ? 'white' : '#374151',
          border: 'none',
          padding: '8px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          transition: 'all 0.2s'
        }}
      >
         S2
      </button>
    </div>
  </div>
  
 
</div>

      {/* AFFICHAGE PAR JOUR */}
      {joursOrdre.map(jour => {
        const aDesSeances = seancesList.some(seance => 
          Object.values(seancesParJourSeanceSalle[jour][seance]).some(cours => cours.length > 0)
        );
        
        if (!aDesSeances) return null;
        
        return (
          <div key={jour} style={{ marginBottom: '30px' }}>
            
            {/* EN-TÊTE DU JOUR */}
            <div style={{
              background: '#2c3e50',
              color: 'white',
              padding: '12px 15px',
              borderRadius: '8px 8px 0 0',
              fontSize: '18px',
              fontWeight: 'bold',
              borderLeft: '5px solid #f39c12'
            }}>
              📅 {jour.toUpperCase()}
            </div>
            
            {/* SÉANCES DU JOUR */}
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              overflow: 'hidden'
            }}>
              {seancesList.map(seance => {
                const seancesParSalle = seancesParJourSeanceSalle[jour][seance];
                const hasSeances = Object.values(seancesParSalle).some(cours => cours.length > 0);
                
                if (!hasSeances) {
                  return (
                    <div key={seance} style={{
                      padding: '10px 15px',
                      borderBottom: '1px solid #e9ecef',
                      color: '#adb5bd',
                      fontStyle: 'italic'
                    }}>
                      ⏰ Séance {seance} → Aucun cours
                    </div>
                  );
                }
                
                return (
                  <div key={seance} style={{
                    borderBottom: '2px solid #dee2e6',
                    background: 'white'
                  }}>
                    {/* EN-TÊTE DE LA SÉANCE */}
                    <div style={{
                      background: '#e9ecef',
                      padding: '8px 15px',
                      fontWeight: 'bold',
                      color: '#495057',
                      borderLeft: '3px solid #007bff'
                    }}>
                      ⏰ SÉANCE {seance}
                    </div>
                    
                    {/* LISTE DES COURS PAR SALLE */}
                    <div style={{ padding: '10px 15px' }}>
                      {sallesUniques.map(salle => {
                        const coursDansSalle = seancesParSalle[salle];
                        
                        if (coursDansSalle.length === 0) return null;
                        
                        return (
                          <div key={salle} style={{
                            marginBottom: '15px',
                            padding: '10px',
                            background: '#f8f9fa',
                            borderRadius: '5px',
                            borderLeft: '3px solid #28a745'
                          }}>
                            <div style={{
                              fontWeight: 'bold',
                              color: '#dc3545',
                              marginBottom: '8px',
                              fontSize: '14px'
                            }}>
                              🚪 Salle: {salle}
                            </div>
                            
                            {coursDansSalle.map((s, idx) => (
                              <div key={idx} style={{
                                marginTop: idx > 0 ? '10px' : '0',
                                padding: '8px',
                                background: 'white',
                                borderRadius: '4px'
                              }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>
                                  📖 {s.matiere_nom || s.matiere_code}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '12px', color: '#555', marginTop: '5px' }}>
                                  <span>👨‍🏫 {getEnseignantNomComplet(s)}</span>
                                  <span>👥 {s.classe_nom}</span>
                                  {s.type && <span>🏷️ {s.type}</span>}
                                  {s.semaine_type && s.semaine_type !== 'toutes' && <span>📅 Semaine: {s.semaine_type}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* SECTION RÉCAPITULATIVE */}
      <div style={{
        marginTop: '40px',
        background: '#f1f3f5',
        padding: '20px',
        borderRadius: '10px',
        borderLeft: '5px solid #007bff'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
          📋 RÉCAPITULATIF COMPLET PAR SALLE
        </div>
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          background: 'white', 
          padding: '15px', 
          borderRadius: '5px'
        }}>
          {sallesUniques.map(salle => (
            <div key={salle} style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', color: '#dc3545', marginBottom: '10px' }}>
   Salle {salle} {salle.type && `(${salle.type})`}
</div>
              {seances
                .filter(s => (s.salle_numero || s.salle_id) === salle)
                .sort((a,b) => {
                  const jourOrdre = {'Lundi':1,'Mardi':2,'Mercredi':3,'Jeudi':4,'Vendredi':5,'Samedi':6};
                  if (jourOrdre[a.jour] !== jourOrdre[b.jour]) return jourOrdre[a.jour] - jourOrdre[b.jour];
                  return parseInt(a.seance) - parseInt(b.seance);
                })
                .map((s, idx) => (
                  <div key={idx} style={{ 
                    padding: '5px 0 5px 20px', 
                    borderBottom: '1px solid #dee2e6'
                  }}>
                    {s.jour} | S{s.seance} | {s.matiere_nom || s.matiere_code} | {getEnseignantNomComplet(s)} | {s.classe_nom}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default SalleVueGenerale;