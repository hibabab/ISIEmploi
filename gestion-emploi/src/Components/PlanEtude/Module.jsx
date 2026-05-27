import { useState, useEffect } from "react";
import { inputCls, Field, Modal, DeleteModal, EmptyState, AddButton } from "./shared";
import { getUnitesByParcours, addUnite, deleteUnite } from "../../database/unite";

const EMPTY = {
  id: "", code: "", abr: "", libelle: "",
  semestre: 1, credit: "", coef: "",
};

export default function Modules({ formation, parcours, onBackFormation, onBackParcours, onConsulter }) {
  const [unites, setUnites]             = useState([]);
  const [semestre, setSemestre]         = useState(1);
  const [modal, setModal]               = useState(false);
  const [formData, setFormData]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => { fetchUnites(); }, [parcours]);

  const fetchUnites = async () => {
    try {
      const data = await getUnitesByParcours(parcours?.id);
      setUnites(data);
    } catch (err) {
      console.error("Erreur chargement unités:", err);
    } finally {
      setLoading(false);
    }
  };

  const f = key => e => setFormData(d => ({ ...d, [key]: e.target.value }));

  const openAdd = () => {
    setFormData({ ...EMPTY, semestre });
    setError("");
    setModal(true);
  };

  const handleSave = async () => {
    const { id, code, abr, libelle, semestre: sem, credit, coef } = formData;
    if (!id || !code || !abr || !libelle || !credit || !coef) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (unites.some(u => u.id === id)) {
      setError("Cet ID existe déjà.");
      return;
    }
    try {
      await addUnite(id, code, abr, libelle, Number(sem), Number(credit), Number(coef), parcours?.id);
      await fetchUnites();
      setModal(false);
    } catch (err) {
      console.error("Erreur ajout unité:", err);
      setError("Erreur lors de l'ajout.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUnite(deleteTarget.id);
      await fetchUnites();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  const filtered = unites.filter(u => u.semestre === semestre);

  if (loading) return <p className="text-center text-slate-400 mt-10">Chargement...</p>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Unités d'enseignement</h1>
          <p  className="text-sm text-gray-500 mt-1">
            {parcours?.code} · {filtered.length} unité{filtered.length !== 1 ? "s" : ""} en S{semestre}
          </p>
        </div>
       
        <AddButton onClick={openAdd} />
      </div>

      {/* Filtre S1 / S2 */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map(s => (
          <button
            key={s}
            onClick={() => setSemestre(s)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              semestre === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semestre {s}
          </button>
        ))}
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <EmptyState label="Ajouter une unité" onAdd={openAdd} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Abréviation</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3 text-center">Crédit</th>
                <th className="px-4 py-3 text-center">Coef</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{item.id}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{item.code}</td>
                  <td className="px-4 py-3 text-slate-600">{item.abr}</td>
                  <td className="px-4 py-3 text-slate-700">{item.libelle}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.credit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.coef}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onConsulter?.(item)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-medium"
                      >
                        Consulter
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          
          </table>
        </div>
      )}

      {/* Modal Ajout */}
      {modal && (
        <Modal
          title="Ajouter une unité d'enseignement"
          onClose={() => setModal(false)}
          onSave={handleSave}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID">
              <input className={inputCls} value={formData.id} onChange={f("id")} placeholder="Ex: UE-001" autoFocus />
            </Field>
            <Field label="Code">
              <input className={inputCls} value={formData.code} onChange={f("code")} placeholder="Ex: MATH1" />
            </Field>
            <Field label="Abréviation">
              <input className={inputCls} value={formData.abr} onChange={f("abr")} placeholder="Ex: MATH" />
            </Field>
            <Field label="Semestre">
              <select className={inputCls} value={formData.semestre} onChange={f("semestre")}>
                <option value={1}>Semestre 1</option>
                <option value={2}>Semestre 2</option>
              </select>
            </Field>
            <Field label="Crédit">
              <input type="number" className={inputCls} value={formData.credit} onChange={f("credit")} placeholder="Ex: 3" />
            </Field>
            <Field label="Coefficient">
              <input type="number" className={inputCls} value={formData.coef} onChange={f("coef")} placeholder="Ex: 2" />
            </Field>
          </div>
          <Field label="Libellé">
            <input className={inputCls} value={formData.libelle} onChange={f("libelle")} placeholder="Ex: Mathématiques 1" />
          </Field>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </Modal>
      )}

      {/* Modal Suppression */}
      {deleteTarget && (
        <DeleteModal
          nom={deleteTarget.libelle}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}