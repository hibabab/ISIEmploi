import { useState, useEffect } from "react";
import { inputCls, Field, Modal, DeleteModal, EmptyState, AddButton } from "./shared";
import { getUnitesByParcours, addUnite, updateUnite, deleteUnite } from "../../database/unite";
import { getMatieresByUnite, addMatiere, updateMatiere, deleteMatiere } from "../../database/matiere";

const EMPTY_UNITE = {
  id: "", code: "", abr: "", libelle: "",
  semestre: 1, credit: "", coef: "", regime: "",
};

const EMPTY_MATIERE = {
  id: "", code: "", abr: "", libelle: "",
  coef: "", heure_cours: "", heure_td: "", heure_tp: "",
};

export default function ParcoursModules({ formation, parcours, onBackFormation, onBackParcours }) {
  const [allUnites, setAllUnites] = useState([]);
  const [selectedSemestre, setSelectedSemestre] = useState(null);
  const [modalUnite, setModalUnite] = useState(false);
  const [modalMatiere, setModalMatiere] = useState(false);
  const [formDataUnite, setFormDataUnite] = useState(EMPTY_UNITE);
  const [formDataMatiere, setFormDataMatiere] = useState(EMPTY_MATIERE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [editingMatiere, setEditingMatiere] = useState(null); // null = ajout, object = édition
  const [editingUnite, setEditingUnite] = useState(null); // null = ajout, object = édition
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matieresData, setMatieresData] = useState({});
  const [availableSemesters, setAvailableSemesters] = useState([]);

  useEffect(() => { fetchAllData(); }, [parcours]);

  const fetchAllData = async () => {
    try {
      const unitesData = await getUnitesByParcours(parcours?.id);
      setAllUnites(unitesData);
      const semesters = [...new Set(unitesData.map(u => u.semestre))].sort((a, b) => a - b);
      setAvailableSemesters(semesters);
      if (semesters.length > 0) setSelectedSemestre(semesters[0]);
      const matieresMap = {};
      for (const unite of unitesData) {
        matieresMap[unite.id] = await getMatieresByUnite(unite.id);
      }
      setMatieresData(matieresMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnites = async (forceSemestre = null) => {
    const data = await getUnitesByParcours(parcours?.id);
    setAllUnites(data);
    const semesters = [...new Set(data.map(u => u.semestre))].sort((a, b) => a - b);
    setAvailableSemesters(semesters);
    // Toujours mettre à jour selectedSemestre pour que le filtre soit correct
    if (forceSemestre !== null) {
      setSelectedSemestre(forceSemestre);
    } else {
      setSelectedSemestre(prev =>
        semesters.includes(prev) ? prev : (semesters[0] ?? null)
      );
    }
    const matieresMap = {};
    for (const unite of data) {
      matieresMap[unite.id] = await getMatieresByUnite(unite.id);
    }
    setMatieresData(matieresMap);
  };

  const fetchMatieresForUnite = async (uniteId) => {
    const matieres = await getMatieresByUnite(uniteId);
    setMatieresData(prev => ({ ...prev, [uniteId]: matieres }));
  };

  const fUnite = key => e => setFormDataUnite(d => ({ ...d, [key]: e.target.value }));
  const openAddUnite = () => {
    setEditingUnite(null);
    setFormDataUnite({ ...EMPTY_UNITE, semestre: selectedSemestre ?? 1 });
    setError("");
    setModalUnite(true);
  };

  const openEditUnite = (unite) => {
    setEditingUnite(unite);
    setFormDataUnite({
      id: unite.id,
      code: unite.code,
      abr: unite.abr,
      libelle: unite.libelle,
      semestre: String(unite.semestre),
      credit: String(unite.credit),
      coef: String(unite.coef),
      regime: unite.regime ?? "",
    });
    setError("");
    setModalUnite(true);
  };

  const handleSaveUnite = async () => {
    const { id, code, abr, libelle, semestre: sem, credit, coef, regime } = formDataUnite;
    if (!id || !code || !abr || !libelle || !credit || !coef) { setError("Tous les champs sont obligatoires."); return; }
    try {
      if (editingUnite) {
        await updateUnite(id, code, abr, libelle, Number(sem), Number(credit), regime, Number(coef));
      } else {
        if (allUnites.some(u => u.id === id)) { setError("Cet ID existe déjà."); return; }
        await addUnite(id, code, abr, libelle, Number(sem), Number(credit), regime, Number(coef), parcours?.id);
      }
      await fetchUnites(Number(sem));
      setModalUnite(false);
      setEditingUnite(null);
    } catch { setError("Erreur lors de l'enregistrement."); }
  };

  const fMatiere = key => e => setFormDataMatiere(d => ({ ...d, [key]: e.target.value }));

  // Ouvrir modal pour AJOUTER une matière
  const openAddMatiere = (unite) => {
    setSelectedUnite(unite);
    setEditingMatiere(null);
    setFormDataMatiere(EMPTY_MATIERE);
    setError("");
    setModalMatiere(true);
  };

  // Ouvrir modal pour ÉDITER une matière existante
  const openEditMatiere = (unite, matiere) => {
    setSelectedUnite(unite);
    setEditingMatiere(matiere);
    setFormDataMatiere({
      id: matiere.id,
      code: matiere.code,
      abr: matiere.abr,
      libelle: matiere.libelle,
      coef: String(matiere.coef),
      heure_cours: String(matiere.heure_cours),
      heure_td: String(matiere.heure_td),
      heure_tp: String(matiere.heure_tp),
    });
    setError("");
    setModalMatiere(true);
  };

  const handleSaveMatiere = async () => {
    const { id, code, abr, libelle, coef, heure_cours, heure_td, heure_tp } = formDataMatiere;
    if (!id || !code || !abr || !libelle || !coef || !heure_cours || !heure_td || !heure_tp) {
      setError("Tous les champs sont obligatoires."); return;
    }

    try {
      if (editingMatiere) {
        // Mode édition
        await updateMatiere(id, code, abr, libelle, Number(coef), Number(heure_cours), Number(heure_td), Number(heure_tp));
      } else {
        // Mode ajout
        const currentMatieres = matieresData[selectedUnite.id] || [];
        if (currentMatieres.some(m => m.id === id)) { setError("Cet ID existe déjà."); return; }
        await addMatiere(id, code, abr, libelle, Number(coef), Number(heure_cours), Number(heure_td), Number(heure_tp), selectedUnite.id);
      }
      await fetchMatieresForUnite(selectedUnite.id);
      setModalMatiere(false);
      setEditingMatiere(null);
    } catch { setError("Erreur lors de l'enregistrement."); }
  };

  const handleDelete = async () => {
    try {
      if (deleteTarget.type === 'unite') {
        await deleteUnite(deleteTarget.data.id);
        await fetchUnites();
      } else {
        await deleteMatiere(deleteTarget.data.id);
        await fetchMatieresForUnite(deleteTarget.uniteId);
      }
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
  };

  const unites = allUnites.filter(u => u.semestre === selectedSemestre);

  const calculateTotals = () => {
    let totalDuree = 0, totalCours = 0, totalTD = 0, totalTP = 0, totalCoefGM = 0;
    unites.forEach(unite => {
      (matieresData[unite.id] || []).forEach(m => {
        totalDuree += Number(m.heure_cours) + Number(m.heure_td) + Number(m.heure_tp);
        totalCours += Number(m.heure_cours);
        totalTD += Number(m.heure_td);
        totalTP += Number(m.heure_tp);
        totalCoefGM += Number(m.coef);
      });
    });
    return { totalDuree, totalCours, totalTD, totalTP, totalCoefGM };
  };

  const totals = calculateTotals();
  const totalUniteCoef = unites.reduce((s, u) => s + Number(u.coef), 0);

  if (loading) return <p className="text-center text-slate-400 mt-10">Chargement...</p>;

  return (
    <div className="max-w-full mx-auto px-6 py-8 overflow-x-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBackFormation} className="text-sm text-slate-400 hover:text-slate-600 transition">
          Formations
        </button>
        <span className="text-slate-300">›</span>
        <button onClick={onBackParcours} className="text-sm text-slate-400 hover:text-slate-600 transition">
          {formation?.libelle}
        </button>
        <span className="text-slate-300">›</span>
        <span className="text-sm font-semibold text-blue-600">
          {parcours?.code} — {parcours?.specialite}
        </span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>
            Programme du {parcours?.specialite}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedSemestre ? `Semestre ${selectedSemestre}` : "—"} · {unites.length} unité(s) d'enseignement
          </p>
        </div>
        <AddButton onClick={openAddUnite} label="Ajouter UE" />
      </div>

      {/* Onglets semestres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {availableSemesters.length === 0 ? (
          <span className="text-sm text-slate-400">Aucun semestre — ajoutez une UE pour commencer.</span>
        ) : (
          availableSemesters.map(sem => (
            <button
              key={sem}
              onClick={() => setSelectedSemestre(sem)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                selectedSemestre === sem
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              S{sem}
            </button>
          ))
        )}
      </div>

      {/* Table */}
      {unites.length === 0 ? (
        <EmptyState label="Ajouter une unité d'enseignement" onAdd={openAddUnite} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-left min-w-[200px]">
                  Unités d'enseignement
                </th>
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-left min-w-[200px]">
                  Modules
                </th>
                <th colSpan={4} className="px-4 py-2 border border-slate-200 text-center">
                  Forme des enseignements et volumes horaires
                </th>
                <th colSpan={2} className="px-4 py-2 border border-slate-200 text-center">
                  Coefficients
                </th>
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-center min-w-[140px]">
                  Actions
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 border border-slate-200 text-center w-[70px]">Durée</th>
                <th className="px-3 py-2 border border-slate-200 text-center w-[50px]">C</th>
                <th className="px-3 py-2 border border-slate-200 text-center w-[50px]">TD</th>
                <th className="px-3 py-2 border border-slate-200 text-center w-[50px]">TP</th>
                <th className="px-3 py-2 border border-slate-200 text-center w-[90px]">Coef. Mod.</th>
                <th className="px-3 py-2 border border-slate-200 text-center w-[90px]">Coef. GM</th>
              </tr>
            </thead>
            <tbody>
              {unites.map((unite, uniteIndex) => {
                const matieres = matieresData[unite.id] || [];
                const uniteCoefGM = matieres.reduce((s, m) => s + Number(m.coef), 0);

                if (matieres.length === 0) {
                  return (
                    <tr key={`${unite.id}-empty`} className={uniteIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      {/* UE cell */}
                      <td className="px-4 py-3 border border-slate-200 font-semibold text-blue-700 bg-blue-50 align-middle">
                        <div>{unite.libelle}</div>
                        <div className="text-xs text-slate-500 mt-1">Coef: {unite.coef} | Crédit: {unite.credit}</div>
                      </td>
                      {/* Module vide */}
                      <td className="px-4 py-3 border border-slate-200 text-center text-slate-400 italic" colSpan={6}>
                        Aucune matière
                      </td>
                      {/* Coef GM vide */}
                      <td className="px-3 py-3 border border-slate-200 text-center">—</td>
                      {/* Actions */}
                      <td className="px-3 py-3 border border-slate-200 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => openAddMatiere(unite)}
                            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 w-full"
                          >
                            + Module
                          </button>
                          <button
                            onClick={() => openEditUnite(unite)}
                            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 w-full"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'unite', data: unite })}
                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 w-full"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return matieres.map((matiere, matiereIndex) => {
                  const duree = Number(matiere.heure_cours) + Number(matiere.heure_td) + Number(matiere.heure_tp);
                  const isFirstRow = matiereIndex === 0;

                  return (
                    <tr key={`${unite.id}-${matiere.id}`} className={uniteIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      {/* Cellule UE fusionnée */}
                      {isFirstRow && (
                        <td rowSpan={matieres.length} className="px-4 py-3 border border-slate-200 font-semibold text-blue-700 bg-blue-50 align-middle">
                          <div>{unite.libelle}</div>
                          <div className="text-xs text-slate-500 mt-1">Coef: {unite.coef} | Crédit: {unite.credit}</div>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            <button onClick={() => openEditUnite(unite)} className="text-xs text-blue-500 hover:text-blue-700">
                              Modifier
                            </button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setDeleteTarget({ type: 'unite', data: unite })} className="text-xs text-red-500 hover:text-red-700">
                              Supprimer
                            </button>
                          </div>
                          <button onClick={() => openAddMatiere(unite)} className="text-xs text-green-600 mt-1 hover:text-green-800 block">
                            + Ajouter
                          </button>
                        </td>
                      )}

                      {/* Matière */}
                      <td className="px-4 py-3 border border-slate-200 text-slate-700">{matiere.libelle}</td>

                      {/* Volumes horaires */}
                      <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{duree || "—"}</td>
                      <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{matiere.heure_cours || "—"}</td>
                      <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{matiere.heure_td || "—"}</td>
                      <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{matiere.heure_tp || "—"}</td>

                      {/* Coef module */}
                      <td className="px-3 py-3 border border-slate-200 text-center">
                        <span className="text-blue-700 text-xs font-semibold px-2 py-0.5">
                          {matiere.coef}
                        </span>
                      </td>

                      {/* Coef GM fusionné */}
                      {isFirstRow && (
                        <td rowSpan={matieres.length} className="px-3 py-3 border border-slate-200 text-center align-middle">
                          <span className="text-green-600 text-sm font-bold px-3 py-1">
                            {uniteCoefGM}
                          </span>
                        </td>
                      )}

                      {/* Actions matière : Modifier + Supprimer uniquement */}
                      <td className="px-3 py-3 border border-slate-200 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => openEditMatiere(unite, matiere)}
                            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 w-full"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'matiere', data: matiere, uniteId: unite.id })}
                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 w-full"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}

              {/* Ligne totaux */}
              {totals.totalCoefGM > 0 && (
                <tr className="bg-slate-200 font-bold text-slate-800 text-sm">
                  <td colSpan={3} className="px-4 py-3 border border-slate-200 text-center">TOTAL</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">{totals.totalDuree}</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">{totals.totalCours}</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">{totals.totalTD}</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">{totals.totalTP}</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">{totalUniteCoef}</td>
                  <td className="px-3 py-3 border border-slate-200 text-center">
                    <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                      {totals.totalCoefGM}
                    </span>
                  </td>
                  <td className="border border-slate-200"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Unité */}
      {modalUnite && (
        <Modal title={editingUnite ? `Modifier — ${editingUnite.libelle}` : "Ajouter une unité d'enseignement"} onClose={() => { setModalUnite(false); setEditingUnite(null); }} onSave={handleSaveUnite}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID"><input className={inputCls} value={formDataUnite.id} onChange={fUnite("id")} placeholder="Ex: UE-001" autoFocus disabled={!!editingUnite} /></Field>
            <Field label="Code"><input className={inputCls} value={formDataUnite.code} onChange={fUnite("code")} placeholder="Ex: MATH1" /></Field>
            <Field label="Abréviation"><input className={inputCls} value={formDataUnite.abr} onChange={fUnite("abr")} placeholder="Ex: MATH" /></Field>
            <Field label="Semestre"><input type="number" className={inputCls} value={formDataUnite.semestre} onChange={fUnite("semestre")} placeholder="Ex: 1" /></Field>
            <Field label="Crédit"><input type="number" className={inputCls} value={formDataUnite.credit} onChange={fUnite("credit")} placeholder="Ex: 3" /></Field>
            <Field label="Coefficient"><input type="number" className={inputCls} value={formDataUnite.coef} onChange={fUnite("coef")} placeholder="Ex: 2" /></Field>
            <Field label="Régime"><input className={inputCls} value={formDataUnite.regime} onChange={fUnite("regime")} placeholder="Ex: Commun" /></Field>
          </div>
          <Field label="Libellé"><input className={inputCls} value={formDataUnite.libelle} onChange={fUnite("libelle")} placeholder="Ex: Mathématiques 1" /></Field>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </Modal>
      )}

      {/* Modal Matière (Ajout + Édition) */}
      {modalMatiere && selectedUnite && (
        <Modal
          title={editingMatiere ? `Modifier — ${editingMatiere.libelle}` : `Ajouter une matière à ${selectedUnite.libelle}`}
          onClose={() => { setModalMatiere(false); setEditingMatiere(null); }}
          onSave={handleSaveMatiere}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID">
              <input
                className={inputCls}
                value={formDataMatiere.id}
                onChange={fMatiere("id")}
                placeholder="Ex: MAT-001"
                autoFocus
                disabled={!!editingMatiere} // L'ID ne doit pas changer en mode édition
              />
            </Field>
            <Field label="Code"><input className={inputCls} value={formDataMatiere.code} onChange={fMatiere("code")} placeholder="Ex: MATH1" /></Field>
            <Field label="Abréviation"><input className={inputCls} value={formDataMatiere.abr} onChange={fMatiere("abr")} placeholder="Ex: MATH" /></Field>
            <Field label="Coefficient"><input type="number" className={inputCls} value={formDataMatiere.coef} onChange={fMatiere("coef")} placeholder="Ex: 2" /></Field>
            <Field label="Heures Cours"><input type="number" className={inputCls} value={formDataMatiere.heure_cours} onChange={fMatiere("heure_cours")} placeholder="Ex: 21" /></Field>
            <Field label="Heures TD"><input type="number" className={inputCls} value={formDataMatiere.heure_td} onChange={fMatiere("heure_td")} placeholder="Ex: 15" /></Field>
            <Field label="Heures TP"><input type="number" className={inputCls} value={formDataMatiere.heure_tp} onChange={fMatiere("heure_tp")} placeholder="Ex: 10" /></Field>
          </div>
          <Field label="Libellé"><input className={inputCls} value={formDataMatiere.libelle} onChange={fMatiere("libelle")} placeholder="Ex: Mathématiques 1" /></Field>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </Modal>
      )}

      {/* Modal Suppression */}
      {deleteTarget && (
        <DeleteModal
          nom={deleteTarget.data.libelle}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}