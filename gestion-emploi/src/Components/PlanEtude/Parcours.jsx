import { useState, useEffect } from "react";
import { inputCls, Field, Modal, DeleteModal, EmptyState, AddButton } from "./shared";
import { getParcours, getParcoursById, addParcours, deleteParcours } from "../../database/parcours";
import { getFormations } from "../../database/formation";

const EMPTY = {
  id: "",
  code: "",
  mention: "",
  specialite: "",
  abr_parcours: "",
  type: "Ingénierie",
  formation_id: "",
};

const TYPES = ["Ingénierie", "Licence", "Master"];

export default function Parcours({ formation, onConsulter, onBack }) {
  const [parcoursList, setParcoursList] = useState([]);
  const [formations, setFormations]     = useState([]);
  const [modal, setModal]               = useState(false);
  const [formData, setFormData]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => { fetchAll(); }, [formation]);

  const fetchAll = async () => {
    try {
      const [p, f] = await Promise.all([
        formation ? getParcoursById(formation.id) : getParcours(),
        getFormations(),
      ]);
      setParcoursList(p);
      setFormations(f);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const f = key => e => setFormData(d => ({ ...d, [key]: e.target.value }));

  const openAdd = () => {
    setFormData({ ...EMPTY, formation_id: formation?.id ?? formations[0]?.id ?? "" });
    setError("");
    setModal(true);
  };

  const handleSave = async () => {
    const { id, code, mention, specialite, abr_parcours, type, formation_id } = formData;
    if (!id || !code || !mention || !specialite || !abr_parcours || !type || !formation_id) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (parcoursList.some(p => p.id === id)) {
      setError("Cet ID existe déjà.");
      return;
    }
    try {
      await addParcours(id, code, mention, specialite, abr_parcours, type, formation_id);
      await fetchAll();
      setModal(false);
    } catch (err) {
      console.error("Erreur ajout parcours:", err);
      setError("Erreur lors de l'ajout.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteParcours(deleteTarget.id);
      await fetchAll();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  // Résoudre la formation parente d'un parcours
  const resolveFormation = (item) => {
    return formation ?? formations.find(fo => fo.id === item.formation_id) ?? null;
  };

  if (loading) return <p className="text-center text-slate-400 mt-10">Chargement...</p>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 ">

      {/* Breadcrumb */}
      {formation && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-slate-600 transition"
          >
            Formations
          </button>
          <span className="text-slate-300">›</span>
          <span className="text-sm font-semibold text-blue-600">{formation.libelle}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#237AFF' }}>Parcours</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formation ? `${formation.libelle} · ` : ""}
            {parcoursList.length} parcours
          </p>
        </div>
       
        <AddButton onClick={openAdd} />
      </div>

      {/* Tableau */}
      {parcoursList.length === 0 ? (
        <EmptyState label="Ajouter un parcours" onAdd={openAdd} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Abréviation</th>
                <th className="px-4 py-3">Mention</th>
                <th className="px-4 py-3">Spécialité</th>
                <th className="px-4 py-3">Type</th>
                {!formation && <th className="px-4 py-3">Formation</th>}
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcoursList.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  <td className="px-4 py-3 font-mono text-slate-600">{item.id}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{item.code}</td>
                  <td className="px-4 py-3 text-slate-600">{item.abr_parcours}</td>
                  <td className="px-4 py-3 text-slate-700">{item.mention}</td>
                  <td className="px-4 py-3 text-slate-700">{item.specialite}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.type === "Ingénierie" ? "bg-blue-100 text-blue-700" :
                      item.type === "Master"     ? "bg-purple-100 text-purple-700" :
                                                   "bg-green-100 text-green-700"
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  {!formation && (
                    <td className="px-4 py-3 text-slate-600">{item.formation_libelle}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onConsulter?.(item, resolveFormation(item))}
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
          title="Ajouter un parcours"
          onClose={() => setModal(false)}
          onSave={handleSave}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID">
              <input className={inputCls} value={formData.id} onChange={f("id")} placeholder="Ex: PARC-001" autoFocus />
            </Field>
            <Field label="Code">
              <input className={inputCls} value={formData.code} onChange={f("code")} placeholder="Ex: GL" />
            </Field>
            <Field label="Abréviation">
              <input className={inputCls} value={formData.abr_parcours} onChange={f("abr_parcours")} placeholder="Ex: GL-ISI" />
            </Field>
            <Field label="Type">
              <select className={inputCls} value={formData.type} onChange={f("type")}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Mention">
              <input className={inputCls} value={formData.mention} onChange={f("mention")} placeholder="Ex: Informatique" />
            </Field>
            <Field label="Spécialité">
              <input className={inputCls} value={formData.specialite} onChange={f("specialite")} placeholder="Ex: Génie Logiciel" />
            </Field>
          </div>
          <Field label="Formation">
            <select
              className={inputCls}
              value={formData.formation_id}
              onChange={f("formation_id")}
              disabled={!!formation}
            >
              {formations.map(fo => (
                <option key={fo.id} value={fo.id}>{fo.id} — {fo.libelle}</option>
              ))}
            </select>
          </Field>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </Modal>
      )}

      {/* Modal Suppression */}
      {deleteTarget && (
        <DeleteModal
          nom={deleteTarget.code}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}