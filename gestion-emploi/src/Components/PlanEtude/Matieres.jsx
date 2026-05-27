// Dans Matieres.jsx — remplace le tableau existant par celui-ci

import { useState, useEffect } from "react";
import { inputCls, Field, Modal, DeleteModal, EmptyState, AddButton } from "./shared";
import { getMatieresByUnite, addMatiere, deleteMatiere } from "../../database/matiere";

const EMPTY = {
  id: "", code: "", abr: "", libelle: "",
  coef: "", heure_cours: "", heure_td: "", heure_tp: "",
};

export default function Matieres({ formation, parcours, unite, onBackFormation, onBackParcours, onBackUnite }) {
  const [matieres, setMatieres]         = useState([]);
  const [modal, setModal]               = useState(false);
  const [formData, setFormData]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => { fetchMatieres(); }, [unite]);

  const fetchMatieres = async () => {
    try {
      const data = await getMatieresByUnite(unite?.id);
      setMatieres(data);
    } catch (err) {
      console.error("Erreur chargement matières:", err);
    } finally {
      setLoading(false);
    }
  };

  const f = key => e => setFormData(d => ({ ...d, [key]: e.target.value }));
  const openAdd = () => { setFormData(EMPTY); setError(""); setModal(true); };

  const handleSave = async () => {
    const { id, code, abr, libelle, coef, heure_cours, heure_td, heure_tp } = formData;
    if (!id || !code || !abr || !libelle || !coef || !heure_cours || !heure_td || !heure_tp) {
      setError("Tous les champs sont obligatoires."); return;
    }
    if (matieres.some(m => m.id === id)) { setError("Cet ID existe déjà."); return; }
    try {
      await addMatiere(id, code, abr, libelle,
        Number(coef), Number(heure_cours), Number(heure_td), Number(heure_tp), unite?.id);
      await fetchMatieres();
      setModal(false);
    } catch { setError("Erreur lors de l'ajout."); }
  };

  const handleDelete = async () => {
    try {
      await deleteMatiere(deleteTarget.id);
      await fetchMatieres();
      setDeleteTarget(null);
    } catch (err) { console.error("Erreur suppression:", err); }
  };

  // Totaux
  const totalDuree  = matieres.reduce((s, m) => s + (m.heure_cours + m.heure_td + m.heure_tp), 0);
  const totalCours  = matieres.reduce((s, m) => s + m.heure_cours, 0);
  const totalTD     = matieres.reduce((s, m) => s + m.heure_td, 0);
  const totalTP     = matieres.reduce((s, m) => s + m.heure_tp, 0);
  const totalCoefGM = matieres.reduce((s, m) => s + m.coef, 0);

  if (loading) return <p className="text-center text-slate-400 mt-10">Chargement...</p>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button onClick={onBackFormation} className="text-sm text-slate-400 hover:text-slate-600 transition">Formations</button>
        <span className="text-slate-300">›</span>
        <button onClick={onBackParcours} className="text-sm text-slate-400 hover:text-slate-600 transition">{formation?.libelle}</button>
        <span className="text-slate-300">›</span>
        <button onClick={onBackUnite} className="text-sm text-slate-400 hover:text-slate-600 transition">{parcours?.code}</button>
        <span className="text-slate-300">›</span>
        <span className="text-sm font-semibold text-blue-600">{unite?.code} — {unite?.libelle}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Matières</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unite?.libelle} · {matieres.length} matière{matieres.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddButton onClick={openAdd} />
      </div>

      {matieres.length === 0 ? (
        <EmptyState label="Ajouter une matière" onAdd={openAdd} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Ligne 1 : en-têtes groupés */}
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-left w-40">
                  Unités d'enseignements
                </th>
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-left">
                  Modules
                </th>
                <th colSpan={4} className="px-4 py-2 border border-slate-200 text-center">
                  Forme des enseignements et volumes horaires
                </th>
                <th colSpan={2} className="px-4 py-2 border border-slate-200 text-center">
                  Coefficients
                </th>
                <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-center">
                  Action
                </th>
              </tr>
              {/* Ligne 2 : sous-colonnes */}
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 border border-slate-200 text-center">Durée</th>
                <th className="px-3 py-2 border border-slate-200 text-center">C</th>
                <th className="px-3 py-2 border border-slate-200 text-center">TD</th>
                <th className="px-3 py-2 border border-slate-200 text-center">TP</th>
                <th className="px-3 py-2 border border-slate-200 text-center">Coef. Mod.</th>
                <th className="px-3 py-2 border border-slate-200 text-center">Coef. GM</th>
              </tr>
            </thead>
            <tbody>
              {/* Toutes les matières appartiennent à la même UE (unite) */}
              {matieres.map((item, i) => {
                const duree = item.heure_cours + item.heure_td + item.heure_tp;
                return (
                  <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    {/* Cellule UE fusionnée sur la première ligne */}
                    {i === 0 && (
                      <td
                        rowSpan={matieres.length}
                        className="px-4 py-3 border border-slate-200 font-semibold text-blue-700 bg-blue-50 text-center align-middle"
                      >
                        {unite?.libelle}
                      </td>
                    )}
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.libelle}</td>
                    <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{duree || "—"}</td>
                    <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{item.heure_cours || "—"}</td>
                    <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{item.heure_td || "—"}</td>
                    <td className="px-3 py-3 border border-slate-200 text-center text-slate-600">{item.heure_tp || "—"}</td>
                    <td className="px-3 py-3 border border-slate-200 text-center">
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {item.coef}
                      </span>
                    </td>
                    {/* Coef GM : fusionné sur toutes les lignes, affiché une fois */}
                    {i === 0 && (
                      <td
                        rowSpan={matieres.length}
                        className="px-3 py-3 border border-slate-200 text-center align-middle"
                      >
                        <span className="bg-green-50 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                          {totalCoefGM}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-3 border border-slate-200 text-center">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Ligne Total */}
              <tr className="bg-slate-100 font-semibold text-slate-700 text-sm">
                <td colSpan={2} className="px-4 py-3 border border-slate-200">Total</td>
                <td className="px-3 py-3 border border-slate-200 text-center">{totalDuree}</td>
                <td className="px-3 py-3 border border-slate-200 text-center">{totalCours}</td>
                <td className="px-3 py-3 border border-slate-200 text-center">{totalTD}</td>
                <td className="px-3 py-3 border border-slate-200 text-center">{totalTP}</td>
                <td colSpan={2} className="px-3 py-3 border border-slate-200 text-center">
                  <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                    {totalCoefGM}
                  </span>
                </td>
                <td className="border border-slate-200" />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajout */}
      {modal && (
        <Modal title="Ajouter une matière" onClose={() => setModal(false)} onSave={handleSave}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID"><input className={inputCls} value={formData.id} onChange={f("id")} placeholder="Ex: MAT-001" autoFocus /></Field>
            <Field label="Code"><input className={inputCls} value={formData.code} onChange={f("code")} placeholder="Ex: MATH1" /></Field>
            <Field label="Abréviation"><input className={inputCls} value={formData.abr} onChange={f("abr")} placeholder="Ex: MATH" /></Field>
            <Field label="Coefficient"><input type="number" className={inputCls} value={formData.coef} onChange={f("coef")} placeholder="Ex: 2" /></Field>
            <Field label="Heures Cours"><input type="number" className={inputCls} value={formData.heure_cours} onChange={f("heure_cours")} placeholder="Ex: 21" /></Field>
            <Field label="Heures TD"><input type="number" className={inputCls} value={formData.heure_td} onChange={f("heure_td")} placeholder="Ex: 15" /></Field>
            <Field label="Heures TP"><input type="number" className={inputCls} value={formData.heure_tp} onChange={f("heure_tp")} placeholder="Ex: 10" /></Field>
          </div>
          <Field label="Libellé"><input className={inputCls} value={formData.libelle} onChange={f("libelle")} placeholder="Ex: Mathématiques 1" /></Field>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal nom={deleteTarget.libelle} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}