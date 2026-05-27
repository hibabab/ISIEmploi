// src/Services/importService.js
import { addEnseignant } from "../database/enseignants";

export const importEnseignantsFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.trim().split('\n');
        
        console.log('=== DÉBUT IMPORT CSV ===');
        console.log('Nombre total de lignes:', lines.length);
        
        let importedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Afficher les 3 premières lignes pour analyse
        console.log('\n--- APERÇU DES LIGNES ---');
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          console.log(`Ligne ${i}:`, lines[i].substring(0, 200));
        }
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') {
            console.log(`\nLigne ${i}: vide, ignorée`);
            continue;
          }
          
          const columns = line.split(',');
          
          console.log(`\n--- LIGNE ${i} ---`);
          console.log(`Nombre de colonnes: ${columns.length}`);
          console.log('Toutes les colonnes:');
          
          // Afficher chaque colonne avec son index
          for (let j = 0; j < columns.length; j++) {
            console.log(`  Colonne [${j}]: "${columns[j]?.trim() || '(vide)'}"`);
          }
          
          // Extraire les valeurs avec les indices
          const nom = columns[1]?.trim() || '';
          const prenom = columns[2]?.trim() || '';
          const email = columns[6]?.trim() || '';
          const grade = columns[12]?.trim() || '';
          const departement = columns[16]?.trim() || '';
          
          console.log('\nValeurs extraites:');
          console.log(`  - Nom (colonne 2): "${nom}"`);
          console.log(`  - Prénom (colonne 3): "${prenom}"`);
          console.log(`  - Email (colonne 7): "${email}"`);
          console.log(`  - Grade (colonne 14): "${grade}"`);
          console.log(`  - Département (colonne 18): "${departement}"`);
          
          const enseignant = {
            nom: nom,
            prenom: prenom,
            email: email,
            grade: grade,
            departement: departement,
            cin: null,
            telephone: null,
            nature: null
          };
          
          // Vérifier les champs obligatoires
          if (enseignant.nom && enseignant.prenom && enseignant.email) {
            try {
              await addEnseignant(enseignant);
              importedCount++;
              console.log(`✅ RÉSULTAT: Ligne ${i} importée avec succès`);
            } catch (err) {
              errorCount++;
              errors.push(`Ligne ${i}: ${err.message}`);
              console.error(`❌ RÉSULTAT: Ligne ${i} erreur - ${err.message}`);
            }
          } else {
            errorCount++;
            const missingFields = [];
            if (!enseignant.nom) missingFields.push('nom');
            if (!enseignant.prenom) missingFields.push('prenom');
            if (!enseignant.email) missingFields.push('email');
            errors.push(`Ligne ${i}: Champs manquants - ${missingFields.join(', ')}`);
            console.log(`❌ RÉSULTAT: Ligne ${i} ignorée - champs manquants: ${missingFields.join(', ')}`);
          }
        }
        
        console.log('\n=== RÉSUMÉ IMPORT ===');
        console.log(`✅ Importés: ${importedCount}`);
        console.log(`❌ Erreurs: ${errorCount}`);
        console.log(`📊 Total lignes traitées: ${lines.length - 1}`);
        
        if (errors.length > 0) {
          console.log('\n--- DÉTAIL DES ERREURS ---');
          errors.forEach(err => console.log(`  - ${err}`));
        }
        
        resolve({
          success: true,
          importedCount,
          errorCount,
          totalCount: lines.length - 1,
          errors,
          message: `✅ ${importedCount} enseignants importés | ❌ ${errorCount} erreurs`
        });
        
      } catch (error) {
        console.error('Erreur globale:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      console.error('Erreur lecture fichier');
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};