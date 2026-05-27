// src/Services/importParcoursService.js
import { addParcours } from "../database/parcours";
import { getDB } from "../database/formation";

export const importParcoursFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split('\n');
        let importedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        console.log("=== DÉBUT IMPORT PARCOURS ===");
        console.log(`Nombre total de lignes: ${lines.length}`);
        
        // Afficher l'en-tête
        console.log("\n--- EN-TÊTE CSV ---");
        console.log(lines[0]);
        
        const db = await getDB();
        const formations = await db.select("SELECT id, libelle FROM formations");
        const formationIds = new Set(formations.map(f => f.id));
        
        console.log("\n--- FORMATIONS DISPONIBLES ---");
        console.log(`Nombre de formations: ${formations.length}`);
        formations.forEach(f => {
          console.log(`  - ID: ${f.id}, Libelle: ${f.libelle}`);
        });
        
        // Analyser les 5 premières lignes de données
        console.log("\n--- ANALYSE DES PREMIÈRES LIGNES ---");
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          // Extraire les champs
          let fields = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              if (line[j + 1] === '"') {
                current += '"';
                j++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              fields.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current);
          
          fields = fields.map(f => f.trim());
          
          console.log(`\nLigne ${i}:`);
          console.log(`  Nombre de champs: ${fields.length}`);
          console.log(`  Champ 0 (id): "${fields[0]}"`);
          console.log(`  Champ 1 (code): "${fields[1]}"`);
          console.log(`  Champ 2 (domaine): "${fields[2]}"`);
          console.log(`  Champ 3 (mention): "${fields[3]}"`);
          console.log(`  Champ 4 (specialite): "${fields[4]}"`);
          console.log(`  Champ 5 (abr_parcours): "${fields[5]}"`);
          console.log(`  Champ 12 (type): "${fields[12]}"`);
          console.log(`  Champ 13 (formation): "${fields[13]}"`);
        }
        
        console.log("\n--- TRAITEMENT DES DONNÉES ---");
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) {
            skippedCount++;
            continue;
          }
          
          // Extraire les champs
          let fields = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              if (line[j + 1] === '"') {
                current += '"';
                j++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              fields.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          fields.push(current);
          
          fields = fields.map(f => f.trim());
          
          if (fields.length >= 14) {
            const id = fields[0];
            const code = fields[1];
            const domaine = fields[2];
            const mention = fields[3];
            const specialite = fields[4];
            const abrParcours = fields[5];
            const type = fields[12];
            let formationId = fields[13];
            
            formationId = formationId.replace(/^"|"$/g, '');
            
            console.log(`\n[Ligne ${i}] Traitement: ${code}`);
            console.log(`  - ID: ${id}`);
            console.log(`  - Code: ${code}`);
            console.log(`  - Domaine: ${domaine}`);
            console.log(`  - Mention: ${mention}`);
            console.log(`  - Specialite: ${specialite}`);
            console.log(`  - Abr: ${abrParcours}`);
            console.log(`  - Type: ${type}`);
            console.log(`  - Formation ID: "${formationId}"`);
            console.log(`  - Formation ID existe dans Set: ${formationIds.has(formationId)}`);
            
            if (!formationId || formationId === '') {
              console.log(`  ⚠️ SKIP: Formation ID vide`);
              skippedCount++;
            } else if (!formationIds.has(formationId)) {
              console.log(`  ⚠️ SKIP: Formation ID "${formationId}" non trouvée dans la base`);
              skippedCount++;
            } else if (!id || !code) {
              console.log(`  ⚠️ SKIP: ID ou Code manquant`);
              skippedCount++;
            } else {
              try {
                await addParcours(id, code, mention, specialite, abrParcours, type, domaine, formationId);
                importedCount++;
                console.log(`  ✅ IMPORTÉ: ${code} -> ${formationId}`);
              } catch (err) {
                errorCount++;
                console.log(`  ❌ ERREUR: ${code} - ${err.message}`);
              }
            }
          } else {
            console.log(`\n[Ligne ${i}] ⚠️ SKIP: Nombre de champs insuffisant (${fields.length} < 14)`);
            skippedCount++;
          }
          
          // Afficher un résumé toutes les 50 lignes
          if (importedCount > 0 && importedCount % 50 === 0) {
            console.log(`\n--- PROGRESS: ${importedCount} importés, ${errorCount} erreurs, ${skippedCount} ignorés ---`);
          }
        }
        
        console.log("\n=== RÉSUMÉ FINAL ===");
        console.log(`✅ Importés: ${importedCount}`);
        console.log(`❌ Erreurs: ${errorCount}`);
        console.log(`⚠️ Ignorés: ${skippedCount}`);
        console.log(`📊 Total traité: ${importedCount + errorCount + skippedCount}`);
        
        resolve({ success: true, importedCount, errorCount, skippedCount });
        
      } catch (error) {
        console.error("❌ Erreur fatale:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("❌ Erreur de lecture du fichier:", error);
      reject(error);
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};