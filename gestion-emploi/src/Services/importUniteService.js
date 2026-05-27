import { addUnite } from "../database/unite";
import { getDB } from "../database/parcours";

export const importUnitesFromCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split('\n');
        let importedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        console.log("=== DÉBUT IMPORT UNITÉS ===");
        console.log(`Nombre total de lignes: ${lines.length}`);
        
        // Récupérer tous les parcours pour faire la correspondance
        const db = await getDB();
        const parcours = await db.select("SELECT id, code, abr_parcours FROM parcours");
        const parcoursMap = new Map();
        parcours.forEach(p => {
          if (p.code) parcoursMap.set(p.code, p.id);
          if (p.abr_parcours) parcoursMap.set(p.abr_parcours, p.id);
          if (p.id) parcoursMap.set(p.id, p.id);
        });
        
        console.log("\n--- PARCOURS DISPONIBLES ---");
        console.log(`Nombre de parcours: ${parcours.length}`);
        parcours.forEach(p => {
          console.log(`  - ID: "${p.id}", Code: "${p.code}"`);
        });
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) {
            skippedCount++;
            continue;
          }
          
          // Extraire les champs CSV (gestion des guillemets)
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
          
          if (fields.length >= 18) {
            const id = fields[1];
            const code = fields[1];
            const abr = fields[0];
            const libelle = fields[3];
            let semestre = parseInt(fields[4]) || 1;
            const credit = parseFloat(fields[5]) || 0;
            const coef = parseFloat(fields[6]) || 0;
            const regime = fields[8] || "";
            const parcoursCode = fields[17] || "";
            
            const shouldLog = i <= 10;
            
            if (shouldLog) {
              console.log(`\n[Ligne ${i}] Traitement: ${code}`);
              console.log(`  - ID: ${id}`);
              console.log(`  - Semestre: ${semestre}`);
              console.log(`  - Credit: ${credit}`);
              console.log(`  - Coef: ${coef}`);
              console.log(`  - Regime: "${regime}"`);
              console.log(`  - Parcours Code: "${parcoursCode}"`);
            }
            
            // Nettoyer le semestre
            if (isNaN(semestre) || semestre === 0) {
              const match = fields[4].toString().match(/\d+/);
              semestre = match ? parseInt(match[0]) : 1;
              if (semestre > 2) semestre = 1;
            }
            
            // Nettoyer le code du parcours
            const cleanParcoursCode = parcoursCode.replace(/^"|"$/g, '').trim();
            
            // Chercher l'ID du parcours
            const parcoursId = cleanParcoursCode ? parcoursMap.get(cleanParcoursCode) : null;
            
            if (shouldLog) {
              console.log(`  - Parcours ID trouvé: ${parcoursId || 'NON TROUVÉ'}`);
            }
            
            if (id && code && parcoursId) {
              try {
                await addUnite(id, code, abr, libelle, semestre, credit, regime, coef, parcoursId);
                importedCount++;
                if (shouldLog) console.log(`  ✅ IMPORTÉE: ${code}`);
                if (importedCount % 50 === 0) {
                  console.log(`📊 PROGRESS: ${importedCount} unités importées...`);
                }
              } catch (err) {
                errorCount++;
                // Afficher l'erreur complète pour debug
                console.log(`  ❌ ERREUR pour ${code}:`, JSON.stringify(err), err);
              }
            } else {
              errorCount++;
              if (shouldLog) {
                if (!id) console.log(`  ⚠️ ID manquant`);
                if (!code) console.log(`  ⚠️ Code manquant`);
                if (!parcoursId) console.log(`  ⚠️ Parcours non trouvé: "${cleanParcoursCode}" pour UE ${code}`);
              }
            }
          } else {
            skippedCount++;
          }
        }
        
        console.log("\n=== RÉSUMÉ FINAL ===");
        console.log(`✅ Unités importées: ${importedCount}`);
        console.log(`❌ Erreurs: ${errorCount}`);
        console.log(`⚠️ Ignorées: ${skippedCount}`);
        
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
