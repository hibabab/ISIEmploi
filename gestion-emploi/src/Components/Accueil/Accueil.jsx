import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEnseignants } from '../../database/enseignants';
import { getClasses } from '../../database/classes';
import { getSalles } from '../../database/salles';
import { getFormations } from '../../database/formation';


import professeurImg from '/src/assets/image/professeur.png';
import classeImg from '/src/assets/image/classe.png';
import matiereImg from '/src/assets/image/matiere.png';
import salleImg from '/src/assets/image/salle.png';
const Accueil = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    enseignants: 0,
    classes: 0,
    salles: 0,
    formations: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [enseignants, classes, salles, formations] = await Promise.all([
        getEnseignants(),
        getClasses(),
        getSalles(),
        getFormations()
      ]);

      setStats({
        enseignants: enseignants.length,
        classes: classes.length,
        salles: salles.length,
        formations: formations.length
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const menuItems = [
    { 
      name: 'Professeurs', 
      path: '/profs', 
      count: stats.enseignants,
      image: professeurImg,
      bgColor: 'bg-blue-50',
      color: 'text-blue-600'
    },
    { 
      name: 'Classes', 
      path: '/classes', 
      count: stats.classes,
      image: classeImg,
      bgColor: 'bg-green-50',
      color: 'text-green-600'
    },
    { 
      name: 'Pedagogie', 
      path: '/pedagogie', 
      count: stats.formations,
      image: matiereImg,
      bgColor: 'bg-purple-50',
      color: 'text-purple-600'
    },
    { 
      name: 'Salles', 
      path: '/salles', 
      count: stats.salles,
      image: salleImg,
      bgColor: 'bg-orange-50',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="p-6  min-h-screen">
      
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#237AFF' }}>
          Gestion d'Emploi du Temps
        </h1>
        <p className="text-gray-600 mt-1">
          Bienvenue dans votre système de gestion
        </p>
        <div className="text-sm text-gray-500 mt-2">
          {formatDate(currentDate)} • {currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#237AFF' }} viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
      ) : (
        <>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {menuItems.map((item, index) => (
    <div
      key={index}
      onClick={() => navigate(item.path)}
      className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all"
    >
      {/* Image en background */}
      <img
        src={item.image}
        alt={item.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all"></div>

      {/* Contenu */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4 text-white">
        <div className="flex justify-end">
          <span className="text-3xl font-bold">
            {item.count}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <p className="text-xs opacity-80">Cliquer pour gérer</p>
        </div>
      </div>
    </div>
  ))}
</div>

          {/* Pied de page */}
          <div className="mt-8 text-center text-xs text-gray-400 border-t pt-6">
            <p>© 2026 - Système de Gestion d'Emploi du Temps | Version 1.0</p>
          </div>
        </>
      )}
    </div>
  );
};

export default Accueil;