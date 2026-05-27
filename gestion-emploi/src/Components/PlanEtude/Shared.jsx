// ── INITIAL DATA ─────────────────────────────────────────────────────────────

const colorMap = {};


let nextId = 100;
export const uid = () => ++nextId;

export const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition";

// ── SHARED UI COMPONENTS ──────────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, onSave, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition text-xl leading-none"
          >&times;</button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Annuler</button>
          <button onClick={onSave}  className="px-4 py-2 text-sm rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteModal({ nom, onClose, onConfirm }) {
  return (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-100 mx-auto mb-4">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800 text-center mb-1">Confirmer la suppression</h3>
        <p className="text-sm text-slate-500 text-center mb-5">
          Voulez-vous supprimer <span className="font-semibold text-slate-700">"{nom}"</span> ?
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}   className="flex-1 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ label, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </svg>
      <p className="text-sm font-medium mb-1">Aucun élément</p>
      <button onClick={onAdd} className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">
        + {label}
      </button>
    </div>
  );
}

export function Card({ code, name, meta, onEdit, onDelete, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${getBadgeColor(code)}`}>{code}</span>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition text-xs"
          >✏</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 transition text-xs"
          >✕</button>
        </div>
      </div>
      <h2 className="font-semibold text-slate-800 text-base mb-2">{name}</h2>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">{meta}</div>
    </div>
  );
}

export function AddButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl shadow-sm transition"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
      </svg>
      Ajouter
    </button>
  );
}