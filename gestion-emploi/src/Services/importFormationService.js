// src/Services/importFormationService.js
import { addFormation } from "../database/formation";

export const importFormationsFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        console.log("Contenu du fichier:", content.substring(0, 500));
        
        const lines = content.split('\n');
        console.log("Nombre de lignes:", lines.length);
        
        let importedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          console.log(`Traitement ligne ${i}:`, line);
          
          // Méthode simple: remplacer les guillemets et diviser
          const cleanLine = line.replace(/""/g, '"');
          const match = cleanLine.match(/"([^"]+)","([^"]+)"/);
          
          if (match) {
            const id = match[1];
            const libelle = match[2];
            
            console.log(`Extrait - ID: "${id}", Libelle: "${libelle}"`);
            
            try {
              await addFormation(id, libelle);
              importedCount++;
              console.log(`✅ Succès (${importedCount}): ${id}`);
            } catch (err) {
              console.error(`❌ Échec pour ${id}:`, err);
            }
          } else {
            console.warn(`⚠️ Pas de match pour ligne ${i}`);
          }
        }
        
        console.log(`Import terminé: ${importedCount} formations`);
        resolve({ success: true, importedCount });
        
      } catch (error) {
        console.error("Erreur globale:", error);
        reject(error);
      }
    };
    
    reader.onerror = (err) => {
      console.error("Erreur lecture fichier:", err);
      reject(new Error('Erreur lecture fichier'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};