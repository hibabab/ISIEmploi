// Components/Home/LoginModal.jsx
import React, { useState, useEffect } from 'react';
import { loginAdmin, initAdminTable } from '../../database/auth';
import logoImg from '/src/assets/image/logo.png';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNom('');
      setPassword('');
      setError('');
      initAdminTable();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const admin = await loginAdmin(nom, password);
      
      if (admin) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminName', admin.nom);
        
        if (onLoginSuccess) {
          onLoginSuccess(admin);
        }
      } else {
        setError('Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#237AFF]/20 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300 scale-100">
        
        {/* Logo et Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#237AFF10' }}>
              <img 
                src={logoImg} 
                alt="ISI Emploi Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>
            ISI Emploi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des emplois du temps
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom d'utilisateur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition bg-gray-50 focus:bg-white"
                style={{ borderColor: '#237AFF30', outlineColor: '#237AFF' }}
                placeholder="Entrez votre nom"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition bg-gray-50 focus:bg-white"
                style={{ borderColor: '#237AFF30' }}
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
          </div>

          {/* Informations de test */}
          <div className="mb-6 p-3 rounded-xl" style={{ backgroundColor: '#237AFF08', border: `1px solid #237AFF20` }}>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#237AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            style={{ backgroundColor: '#237AFF' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Connexion...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Se connecter
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t text-center" style={{ borderColor: '#237AFF15', backgroundColor: '#237AFF03' }}>
          <p className="text-[10px] text-gray-400">
            © 2026 ISI Emploi - Gestion des emplois du temps
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;