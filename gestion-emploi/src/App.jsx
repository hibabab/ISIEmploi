import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SideBar from './Components/Home/SideBar';
import EnseignantTable from "./Components/Enseignant/EnseignantTable";
import Salle from "./Components/Salle/Salle";

import Classe from "./Components/Classe/Classe";
import Personalisation from "./Components/Emploi/Personalisation";
import Emploitemps from "./Components/Emploi/Emploitemps";
import Accueil from './Components/Accueil/Accueil';
import LoginModal from './Components/Home/LoginModal';
import { initAdminTable } from './database/auth';
import ImportCSVPage from './Components/Import/Import';
import ExportCSVPage from './Components/Export/ExportCSVPage';
import PlanEtude from './Components/PlanEtude/PlanEtude';
import SalleVueGenerale from './Components/Statisque/SalleVueGenerale';
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingPath, setPendingPath] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      await initAdminTable();
      const loggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
      const name = sessionStorage.getItem('adminName');
      if (loggedIn && name) {
        setIsAuthenticated(true);
        setAdminName(name);
      } else {
        setShowLogin(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Appliquer le fond au body quand l'app est chargée
  useEffect(() => {
    document.body.style.backgroundColor = '#E5F0F8';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.minHeight = '100vh';
    
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleLoginSuccess = (admin) => {
    setIsAuthenticated(true);
    setAdminName(admin.nom);
    setShowLogin(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminName');
    setIsAuthenticated(false);
    setAdminName('');
    setPendingPath(null);
    setShowLogin(true);
  };

  const handleNavRequest = (path) => {
    if (!isAuthenticated) {
      setPendingPath(path);
      setShowLogin(true);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#E5F0F8'
      }}>
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" style={{ color: '#237AFF' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <LoginModal
        isOpen={showLogin}
        onClose={() => {}}
        onLoginSuccess={handleLoginSuccess}
        pendingPath={pendingPath}
      />

      {isAuthenticated && (
        <SideBar
          onLogout={handleLogout}
          adminName={adminName}
          onNavRequest={handleNavRequest}
        />
      )}

      {/* Container principal avec le fond E5F0F8 */}
      <div 
        style={{ 
          backgroundColor: '#E5F0F8',
          minHeight: '100vh',
          marginLeft: isAuthenticated ? '240px' : '0',
          padding: isAuthenticated ? '24px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Accueil /> : <Navigate to="/" />} />
            <Route path="/home" element={isAuthenticated ? <Accueil /> : <Navigate to="/" />} />
            <Route path="/profs" element={isAuthenticated ? <EnseignantTable /> : <Navigate to="/" />} />
            <Route path="/salles" element={isAuthenticated ? <Salle /> : <Navigate to="/" />} />
           
            <Route path="/classes" element={isAuthenticated ? <Classe /> : <Navigate to="/" />} />
            <Route path="/personalisation" element={isAuthenticated ? <Personalisation /> : <Navigate to="/" />} />
            <Route path="/Emploitemps" element={isAuthenticated ? <Emploitemps /> : <Navigate to="/" />} />
            {/* Correction ici : utiliser ImportCSVPage au lieu de Classe */}
            <Route path="/Import" element={isAuthenticated ? <ImportCSVPage /> : <Navigate to="/" />} />
             <Route path="/pedagogie" element={isAuthenticated ? <PlanEtude /> : <Navigate to="/" />} />
             <Route path="/Export" element={isAuthenticated ? <ExportCSVPage /> : <Navigate to="/" />} />
              <Route path="/SalleVueGenerale" element={isAuthenticated ? <SalleVueGenerale/> : <Navigate to="/" />} />
         
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;