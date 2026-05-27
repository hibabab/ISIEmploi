import React, { useState } from 'react';
import { importEnseignantsFromCSV } from '../../Services/importService';
import { importClassesFromCSV } from '../../Services/importClasseService';
import { importFormationsFromCSV } from '../../Services/importFormationService';
import { importParcoursFromCSV } from '../../Services/importParcoursService';
import { importUnitesFromCSV } from '../../Services/importUniteService';
import { importMatieresFromCSV } from '../../Services/importMatiereService';
import { importSallesFromCSV } from '../../Services/importSalleService';
import { importEmploiFromCSV } from '../../Services/importEmploiService';

const ImportCSVPage = () => {
  const [importStatus, setImportStatus] = useState({});
  const [isImporting, setIsImporting] = useState({
    enseignant: false,
    classe: false,
    formation: false,
    parcours: false,
    unite: false,
    matiere: false,
    salle: false,
    emploi: false,
  });

  const handleImportEnseignants = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, enseignant: true }));
    try {
      const result = await importEnseignantsFromCSV(file);
      setImportStatus(prev => ({ ...prev, enseignant: { success: true, message: `✅ ${result.importedCount} enseignants importés` } }));
      document.getElementById('file-enseignant').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, enseignant: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, enseignant: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, enseignant: null })), 5000);
    }
  };

  const handleImportClasses = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, classe: true }));
    try {
      const result = await importClassesFromCSV(file);
      setImportStatus(prev => ({ ...prev, classe: { success: true, message: `✅ ${result.importedCount} classes importées` } }));
      document.getElementById('file-classe').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, classe: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, classe: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, classe: null })), 5000);
    }
  };

  const handleImportFormations = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, formation: true }));
    try {
      const result = await importFormationsFromCSV(file);
      setImportStatus(prev => ({ ...prev, formation: { success: true, message: `✅ ${result.importedCount} formations importées` } }));
      document.getElementById('file-formation').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, formation: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, formation: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, formation: null })), 5000);
    }
  };

  const handleImportParcours = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, parcours: true }));
    try {
      const result = await importParcoursFromCSV(file);
      setImportStatus(prev => ({ ...prev, parcours: { success: true, message: `✅ ${result.importedCount} parcours importés` } }));
      document.getElementById('file-parcours').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, parcours: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, parcours: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, parcours: null })), 5000);
    }
  };

  const handleImportUnites = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, unite: true }));
    try {
      const result = await importUnitesFromCSV(file);
      setImportStatus(prev => ({ ...prev, unite: { success: true, message: `✅ ${result.importedCount} unités importées` } }));
      document.getElementById('file-unite').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, unite: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, unite: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, unite: null })), 5000);
    }
  };

  const handleImportMatieres = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, matiere: true }));
    try {
      const result = await importMatieresFromCSV(file);
      setImportStatus(prev => ({ ...prev, matiere: { success: true, message: `✅ ${result.importedCount} matières importées` } }));
      document.getElementById('file-matiere').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, matiere: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, matiere: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, matiere: null })), 5000);
    }
  };

  const handleImportSalles = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, salle: true }));
    try {
      const result = await importSallesFromCSV(file);
      setImportStatus(prev => ({ ...prev, salle: { success: true, message: `✅ ${result.importedCount} salles importées` } }));
      document.getElementById('file-salle').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, salle: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, salle: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, salle: null })), 5000);
    }
  };

  const handleImportEmploi = async (file) => {
    if (!file) return;
    setIsImporting(prev => ({ ...prev, emploi: true }));
    try {
      const result = await importEmploiFromCSV(file, true);
      setImportStatus(prev => ({ ...prev, emploi: { success: true, message: `✅ ${result.importedCount} séances importées${result.errorCount ? ` (${result.errorCount} erreurs)` : ''}` } }));
      document.getElementById('file-emploi').value = '';
    } catch (error) {
      setImportStatus(prev => ({ ...prev, emploi: { error: true, message: `❌ Erreur: ${error.message}` } }));
    } finally {
      setIsImporting(prev => ({ ...prev, emploi: false }));
      setTimeout(() => setImportStatus(prev => ({ ...prev, emploi: null })), 5000);
    }
  };

  const ImportCard = ({ id, label, importingKey, handler, accept = ".csv" }) => (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <h2 className="text-lg font-semibold"style={{ color: '#237AFF' }}>{label}</h2>
      </div>
      <input type="file" accept={accept} id={id} className="hidden" onChange={(e) => handler(e.target.files[0])} />
      <label htmlFor={id} className="flex items-center justify-center px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer border-blue-300 hover:border-blue-500 text-sm transition">
        <span>{isImporting[importingKey] ? 'Import...' : `Choisir ${accept === '.csv' ? 'CSV' : 'Excel/CSV'}`}</span>
      </label>
      {importStatus[importingKey] && (
        <div className={`mt-2 p-2 rounded text-xs ${importStatus[importingKey].success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {importStatus[importingKey].message}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#237AFF' }}>Import des Données</h1>
        <p className="text-gray-600">Importez vos fichiers CSV pour remplir les bases de données</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ImportCard id="file-enseignant" label="Enseignants"       importingKey="enseignant" handler={handleImportEnseignants} />
        <ImportCard id="file-classe"     label="Classes"           importingKey="classe"      handler={handleImportClasses} />
        <ImportCard id="file-formation"  label="Formations"        importingKey="formation"   handler={handleImportFormations} />
        <ImportCard id="file-parcours"   label="Parcours"          importingKey="parcours"    handler={handleImportParcours} />
        <ImportCard id="file-unite"      label="Unités"            importingKey="unite"       handler={handleImportUnites} />
        <ImportCard id="file-matiere"    label="Matières"          importingKey="matiere"     handler={handleImportMatieres} />
        <ImportCard id="file-salle"      label="Salles"            importingKey="salle"       handler={handleImportSalles} />
        <ImportCard id="file-emploi"     label="Emploi du temps"   importingKey="emploi"      handler={handleImportEmploi} accept=".csv,.xlsx,.xls" />
      </div>
    </div>
  );
};

export default ImportCSVPage;