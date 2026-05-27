import { useState, useEffect } from "react";
import { inputCls, Field, Modal, DeleteModal, EmptyState, AddButton } from "./shared";
import { getFormations, addFormation, deleteFormation } from "../../database/formation";

const EMPTY = { id: "", libelle: "" };

export default function Formations({ onSelectFormation }) {
  const [formations, setFormations]     = useState([]);
  const [modal, setModal]               = useState(false);
  const [formData, setFormData]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => { fetchFormations(); }, []);

  const fetchFormations = async () => {
    try {
      const data = await getFormations();
      setFormations(data);
    } catch (err) {
      console.error("Erreur chargement formations:", err);
    } finally {
      setLoading(false);
    }
  };

  const f = key => e => setFormData(d => ({ ...d, [key]: e.target.value }));

  const openAdd = () => { setFormData(EMPTY); setError(""); setModal(true); };

  const handleSave = async () => {
    if (!formData.id || !formData.libelle.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (formations.some(f => f.id === Number(formData.id))) {
      setError("Cet ID existe déjà.");
      return;
    }
    try {
      await addFormation(Number(formData.id), formData.libelle.trim());
      await fetchFormations();
      setModal(false);
    } catch (err) {
      console.error("Erreur ajout formation:", err);
      setError("Erreur lors de l'ajout.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFormation(deleteTarget.id);
      await fetchFormations();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erreur suppression formation:", err);
    }
  };

  if (loading) return <p className="text-center text-slate-400 mt-10">Chargement...</p>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1  className="text-2xl font-bold" style={{ color: '#237AFF' }}>Formations</h1>
          <p className="text-sm text-gray-500 mt-1">{formations.length} formation{formations.length !== 1 ? "s" : ""}</p>
        </div>
        
        <AddButton onClick={openAdd} />
      </div>

      {/* Tableau */}
      {formations.length === 0 ? (
        <EmptyState label="Ajouter une formation" onAdd={openAdd} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  <td className="px-4 py-3 font-mono text-slate-600">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.libelle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onSelectFormation?.(item)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-medium"
                      >
                        Parcours
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
          title="Ajouter une formation"
          onClose={() => setModal(false)}
          onSave={handleSave}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID">
              <input
                type="number"
                className={inputCls}
                value={formData.id}
                onChange={f("id")}
                placeholder="Ex: 1"
                autoFocus
              />
            </Field>
            <Field label="Libellé">
              <input
                className={inputCls}
                value={formData.libelle}
                onChange={f("libelle")}
                placeholder="Ex: Cycle Ingénieur"
              />
            </Field>
          </div>
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