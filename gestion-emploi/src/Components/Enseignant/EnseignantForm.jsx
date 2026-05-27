import React, { useState, useEffect } from 'react';
import { addEnseignant, updateEnseignant } from '../../database/enseignants';

const EnseignantForm = ({ isOpen, onClose, onSuccess, title, enseignantToEdit }) => {
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', cin: '',
    telephone: '', departement: '', grade: '', nature: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (enseignantToEdit) {
      // Mapper les valeurs existantes vers les options disponibles
      const mappedDepartement = mapDepartementValue(enseignantToEdit.departement);
      const mappedGrade = mapGradeValue(enseignantToEdit.grade);
      const mappedNature = mapNatureValue(enseignantToEdit.nature);
      
      setFormData({
        nom: enseignantToEdit.nom || '',
        prenom: enseignantToEdit.prenom || '',
        email: enseignantToEdit.email || '',
        cin: enseignantToEdit.cin || '',
        telephone: enseignantToEdit.telephone || '',
        departement: mappedDepartement,
        grade: mappedGrade,
        nature: mappedNature
      });
    } else {
      setFormData({ 
        nom: '', prenom: '', email: '', cin: '', 
        telephone: '', departement: '', grade: '', nature: '' 
      });
    }
    setError('');
  }, [enseignantToEdit, isOpen]);

  // Fonction pour mapper les valeurs de département
  const mapDepartementValue = (value) => {
    const mapping = {
      'IT': 'IT',
      'Informatique': 'IT',
      'GE': 'GE',
      'Génie Électrique': 'GE',
      'GM': 'GM',
      'Génie Mécanique': 'GM',
      'GEII': 'GEII',
      'GLSI': 'GLSI',
      'MA': 'MA',
      'FAD': 'FAD',
      'ASR': 'ASR'
    };
    return mapping[value] || value || '';
  };

  // Fonction pour mapper les valeurs de grade
  const mapGradeValue = (value) => {
    const mapping = {
      'assistant': 'assistant',
      'Assistant': 'assistant',
      'maitre_assistant': 'maitre_assistant',
      'Maître Assistant': 'maitre_assistant',
      'maitre_conf': 'maitre_conf',
      'Maître de Conférences': 'maitre_conf',
      'prof': 'prof',
      'Professeur': 'prof',
      'expert': 'expert',
      'Expert': 'expert',
      'ingenieur': 'ingenieur',
      'Ingénieur': 'ingenieur',
      'PTC': 'PTC',
      'MA': 'MA',
      'V': 'V',
      'PR': 'PR',
      'AC': 'AC',
      'PES': 'PES'
    };
    return mapping[value] || value || '';
  };

  // Fonction pour mapper les valeurs de nature
  const mapNatureValue = (value) => {
    const mapping = {
      'permanent': 'permanent',
      'Permanent': 'permanent',
      'contractuelle': 'contractuelle',
      'Contractuelle': 'contractuelle',
      'vacataire': 'vacataire',
      'Vacataire': 'vacataire'
    };
    return mapping[value] || value || '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (enseignantToEdit) {
        await updateEnseignant(enseignantToEdit.id, formData);
      } else {
        await addEnseignant(formData);
      }
      onSuccess();
    } catch (err) {
      console.error("Erreur complète:", err);
      
      if (err?.message?.includes("UNIQUE")) {
        setError('❌ Email ou CIN déjà existant.');
      } else {
        setError(`❌ Erreur : ${err?.message || JSON.stringify(err)}`);
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[0.5px]"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border"
        style={{ borderColor: '#0A497E20' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between bg-white items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: '#237AFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: '#237AFF' }}>
              {enseignantToEdit ? "Modifier l'enseignant" : (title || "Ajouter un enseignant")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <hr style={{ borderColor: '#0A497E20' }} />

        {/* Formulaire */}
        <form className="px-6 py-5" onSubmit={handleSubmit}>
          {/* Message erreur */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Nom</label>
              <input type="text" name="nom" value={formData.nom} onChange={handleChange}
                placeholder="Nom de l'enseignant"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} required />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Prénom</label>
              <input type="text" name="prenom" value={formData.prenom} onChange={handleChange}
                placeholder="Prénom de l'enseignant"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} required />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Email professionnel</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="nom.prenom@institution.tn"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} required />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">N° CIN</label>
              <input type="text" name="cin" value={formData.cin} onChange={handleChange}
                maxLength="8" placeholder="Ex: 08765432"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Téléphone</label>
              <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange}
                placeholder="+216 -- --- ---"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} />
            </div>

            <div className="sm:col-span-2">
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Département</label>
              <select name="departement" value={formData.departement} onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} required>
                <option value="">Sélectionner un département</option>
               
                <option value="GEII">GEII</option>
                <option value="GLSI">GLSI</option>
                <option value="MA">MA</option>
                <option value="FAD">FAD</option>
                <option value="ASR">ASR</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Grade</label>
              <select name="grade" value={formData.grade} onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} required>
                <option value="">Sélectionner</option>
                <option value="assistant">Assistant</option>
                <option value="maitre_assistant">Maître Assistant</option>
                <option value="maitre_conf">Maître de Conférences</option>
                <option value="prof">Professeur</option>
                <option value="expert">Expert</option>
                <option value="Vacataire">Vacataire</option>
                <option value="PTC">Professeur Tronc Commun</option>
                <option value="PES">Professeur Enseignement Secondaire </option>
                   <option value="AC">Assistant Contractuel </option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Nature</label>
              <select name="nature" value={formData.nature} onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-gray-50 focus:bg-white transition"
                style={{ borderColor: '#0A497E30' }} >
                <option value="">Sélectionner</option>
                <option value="permanent">Permanent</option>
                <option value="contractuelle">Contractuelle</option>
                <option value="vacataire">Vacataire</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#237AFF20' }}>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
              style={{ backgroundColor: '#237AFF' }}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnseignantForm;