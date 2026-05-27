import React, { useState, useRef, useEffect, useCallback } from 'react';

const T = {
  blue:      '#1a56db',
  blueSoft:  '#eff6ff',
  blueLight: '#bfdbfe',
  red:       '#dc2626',
  redSoft:   '#fef2f2',
  green:     '#16a34a',
  purple:    '#7c3aed',
  amber:     '#d97706',
  gray50:    '#f8fafc',
  gray100:   '#f1f5f9',
  gray200:   '#e2e8f0',
  gray400:   '#94a3b8',
  gray500:   '#64748b',
  gray700:   '#334155',
  gray900:   '#0f172a',
  white:     '#ffffff',
};

const TYPE_STYLES = {
  Cours: { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  TD:    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  TP:    { bg: '#f3e8ff', color: '#7e22ce', dot: '#a855f7' },
  _def:  { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
};
const typeStyle = (t) => TYPE_STYLES[t] || TYPE_STYLES._def;

const fullName = (prenom, nom) => {
  const p = (prenom || '').trim();
  const n = (nom || '').trim();
  if (!p && !n) return null;
  return p && n ? `${p} ${n}` : p || n;
};

function EmploiTableau({
  selectedConfig,
  emploiData,
  onCellClick,
  emploiType,
  selectedItem,
  onDeleteSeance,
  onMoveSeance,
  selectedItemName,
  availableSalles = [],
  availableEnseignants = [],
  allSeancesGlobal = [],   // ✅ NOUVELLE PROP — toutes les séances de toutes les classes
}) {
  const [dragOverCell,  setDragOverCell]  = useState(null);
  const [dragging,      setDragging]      = useState(null);
  const [conflictModal, setConflictModal] = useState(null);
  const [deleteModal,   setDeleteModal]   = useState(null);

  const dragState      = useRef(null);
  const ghostRef       = useRef(null);
  const emploiDataRef  = useRef(emploiData);

  useEffect(() => { emploiDataRef.current = emploiData; }, [emploiData]);

  const isPause = (el) => el === 'PAUSE' || el.includes('PAUSE');

  const seancesMatin = !selectedConfig ? [] : (() => {
    const pi = selectedConfig.sequence.findIndex(s => isPause(s.element));
    return pi === -1 ? selectedConfig.sequence : selectedConfig.sequence.slice(0, pi);
  })();

  const seancesApresMidi = !selectedConfig ? [] : (() => {
    const pi = selectedConfig.sequence.findIndex(s => isPause(s.element));
    return pi === -1 ? [] : selectedConfig.sequence.slice(pi + 1);
  })();

  const pauseElement = selectedConfig?.sequence.find(s => isPause(s.element));

  const getCellSeances = (jour, seance) => {
    const d = emploiData[jour]?.[seance];
    if (!d) return [];
    return Array.isArray(d) ? d : [d];
  };

  const groupCellSeances = (seances) => {
    const groups = [];
    seances.forEach(s => {
      const key = [
        s.matiere_id, s.enseignant_id, s.enseignant2_id ?? '',
        s.salle_id, s.type, s.semaine_type || 'toutes',
        s.rattrapage ? 1 : 0,
      ].join('|');
      const ex = groups.find(g => g.key === key);
      if (ex) {
        if (s.date_seance && !ex.dates.includes(s.date_seance)) ex.dates.push(s.date_seance);
        ex.ids.push(s.id);
      } else {
        groups.push({ key, ...s, dates: s.date_seance ? [s.date_seance] : [], ids: [s.id] });
      }
    });
    groups.forEach(g => g.dates.sort());
    return groups;
  };

  const categorize = (groups) => ({
    toutes:    groups.filter(g => !g.date_seance && g.semaine_type === 'toutes'),
    paire:     groups.filter(g => !g.date_seance && g.semaine_type === 'paire'),
    impair:    groups.filter(g => !g.date_seance && g.semaine_type === 'impair'),
    planifiee: groups.filter(g => g.dates.length > 0),
  });

 const checkConflicts = (dragGroup, toJour, toSeance) => {
  const conflicts = [];
  const busySalleIds = new Set();
  const busyEnseignantIds = new Set();

  const dragSemaine = dragGroup.semaine_type || 'toutes';
  const dragEnseignants = [dragGroup.enseignant_id, dragGroup.enseignant2_id].filter(Boolean);

  // ✅ Cherche dans TOUTES les séances globales (pas juste emploiData)
  const source = allSeancesGlobal.length > 0 ? allSeancesGlobal : 
    Object.values(emploiDataRef.current)
      .flatMap(jourData => Object.values(jourData).flat());

  const seancesCreneau = source.filter(s => 
    s.jour === toJour && 
    s.seance === toSeance && 
    !dragGroup.ids.includes(s.id)
  );

  for (const existing of seancesCreneau) {
    const existingSemaine = existing.semaine_type || 'toutes';

    // ✅ Fix paire/impaire : deux séances de semaines différentes ne se chevauchent PAS
    const semaineEnConflit = 
      dragSemaine === 'toutes' || 
      existingSemaine === 'toutes' || 
      dragSemaine === existingSemaine;

    if (!semaineEnConflit) continue; // ← paire vs impaire = pas de conflit

    if (existing.salle_id) busySalleIds.add(existing.salle_id);
    [existing.enseignant_id, existing.enseignant2_id]
      .filter(Boolean)
      .forEach(id => busyEnseignantIds.add(id));

    const existingEnseignants = [existing.enseignant_id, existing.enseignant2_id].filter(Boolean);
    const enseignantEnConflit = dragEnseignants.some(id => existingEnseignants.includes(id));

    if (enseignantEnConflit) {
      const nomProf = 
        fullName(dragGroup.enseignant_prenom, dragGroup.enseignant_nom) ||
        fullName(dragGroup.prof_prenom, dragGroup.prof_nom) || 
        'Ce professeur';
      // Dédoublonner
      if (!conflicts.find(c => c.type === 'enseignant' && c.message.includes(nomProf))) {
        conflicts.push({ type: 'enseignant', message: `${nomProf} est déjà occupé sur ce créneau` });
      }
    }

    if (existing.salle_id && existing.salle_id === dragGroup.salle_id) {
      const salleLabel = dragGroup.salle_nom || dragGroup.salle_id;
      if (!conflicts.find(c => c.type === 'salle')) {
        conflicts.push({ type: 'salle', message: `La salle ${salleLabel} est déjà occupée sur ce créneau` });
      }
    }
  }

  return { conflicts, busySalleIds, busyEnseignantIds };
};

  const getCellUnderCursor = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    let target = el;
    while (target && target !== document.body) {
      if (target.dataset?.jour && target.dataset?.seance) {
        return { jour: target.dataset.jour, seance: target.dataset.seance };
      }
      target = target.parentElement;
    }
    return null;
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState.current) return;
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX + 16}px`;
      ghostRef.current.style.top  = `${e.clientY + 16}px`;
    }
    const cell = getCellUnderCursor(e.clientX, e.clientY);
    setDragOverCell(prev => {
      if (!cell) return null;
      if (prev?.jour === cell.jour && prev?.seance === cell.seance) return prev;
      return cell;
    });
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!dragState.current) return;
    const { group, jour: fromJour, seance: fromSeance } = dragState.current;

    dragState.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setDragging(null);
    setDragOverCell(null);

    const cell = getCellUnderCursor(e.clientX, e.clientY);
    if (!cell) return;
    const { jour: toJour, seance: toSeance } = cell;
    if (fromJour === toJour && fromSeance === toSeance) return;

    const id = group.ids[0];
    const { conflicts, busySalleIds, busyEnseignantIds } = checkConflicts(group, toJour, toSeance);

    if (conflicts.length > 0) {
      const hasEnseignantConflict = conflicts.some(c => c.type === 'enseignant');
      const hasSalleConflict      = conflicts.some(c => c.type === 'salle');

      // ✅ Calculer les alternatives disponibles
      const sallesAlternatives = hasSalleConflict
        ? availableSalles.filter(s => !busySalleIds.has(s.id) && s.id !== group.salle_id)
        : [];

      const enseignantsAlternatifs = hasEnseignantConflict
        ? availableEnseignants.filter(e => !busyEnseignantIds.has(e.id) && e.id !== group.enseignant_id)
        : [];

      setConflictModal({
        conflicts,
        hasEnseignantConflict,
        hasSalleConflict,
        sallesAlternatives,
        enseignantsAlternatifs,
        selectedSalle:      null,
        selectedEnseignant: null,
        onConfirm: (overrides) => {
          setConflictModal(null);
          onMoveSeance?.(id, fromJour, fromSeance, toJour, toSeance, overrides);
        },
        onForce: () => {
          setConflictModal(null);
          onMoveSeance?.(id, fromJour, fromSeance, toJour, toSeance, {});
        },
        onCancel: () => setConflictModal(null),
      });
    } else {
      onMoveSeance?.(id, fromJour, fromSeance, toJour, toSeance, {});
    }
  }, [onMoveSeance, availableSalles, availableEnseignants]);

  const handleCardMouseDown = (e, group, jour, seance) => {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = { group, jour, seance };
    setDragging({ group, jour, seance, ghostX: e.clientX, ghostY: e.clientY });
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTdClick = (e, jour, seance) => {
    if (dragState.current) return;
    onCellClick(jour, seance, emploiType, selectedItem);
  };

  const askDelete = (e, group) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteModal({ ids: group.ids, label: group.matiere_nom || group.matiere_libelle || 'Séance' });
  };

  const confirmDelete = () => {
    if (onDeleteSeance && deleteModal) deleteModal.ids.forEach(id => onDeleteSeance(id));
    setDeleteModal(null);
  };

  const renderCard = (group, jour, seance, isGhost = false) => {
    const ts = typeStyle(group.type);
    const prof1 = fullName(group.enseignant_prenom, group.enseignant_nom) || fullName(group.prof_prenom, group.prof_nom);
    const prof2 = fullName(group.prof2_prenom, group.prof2_nom) || fullName(group.enseignant2_prenom, group.enseignant2_nom);
    const salleLabel = group.salle_nom ?? (group.salle_id ? String(group.salle_id) : null);
    const showClasse = (emploiType === 'professeur' || emploiType === 'salle') && group.classe_nom;

    return (
      <div
        key={group.key}
        onMouseDown={isGhost ? undefined : (e) => handleCardMouseDown(e, group, jour, seance)}
        onClick={(e) => e.stopPropagation()}
        className={`${isGhost ? 'card-ghost animate-pulse' : 'seance-card hover:shadow-md hover:border-blue-200 hover:-translate-y-px'} relative mb-1 p-2 pr-6 rounded-lg cursor-grab select-none transition-all duration-200`}
        style={{
          background:  isGhost ? '#f0f7ff' : T.white,
          border:      `1.5px solid ${isGhost ? T.blueLight : T.gray200}`,
          borderLeft:  `3px solid ${ts.dot}`,
          boxShadow:   isGhost ? '0 12px 32px rgba(26,86,219,0.22), 0 2px 8px rgba(0,0,0,0.08)' : '0 1px 3px rgba(15,23,42,0.06)',
        }}
      >
        {!isGhost && onDeleteSeance && (
          <button
            onClick={(e) => askDelete(e, group)}
            onMouseDown={(e) => e.stopPropagation()}
            className="card-del absolute top-1 right-1 w-4 h-4 rounded-full bg-red-50 border border-red-200 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 hover:scale-110 transition-all duration-150 p-0 z-10"
          >
            <svg width="8" height="8" fill="none" stroke={T.red} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {(group.rattrapage === 1 || group.rattrapage === true) && (
          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[7px] text-white font-bold z-5 shadow-md">R</div>
        )}

        <div className="font-bold text-slate-900 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis text-[11px] tracking-tight">
          {group.matiere_nom || group.matiere_libelle}
        </div>

        {showClasse && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] font-semibold text-blue-600 truncate">{group.classe_nom}</span>
          </div>
        )}

        {emploiType !== 'professeur' && prof1 && !prof2 && (
          <div className="text-slate-500 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis font-medium">{prof1}</div>
        )}
        {emploiType !== 'professeur' && prof1 && prof2 && (
          <div className="flex flex-col gap-px mt-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: T.blue }}>1</span>
              <span className="text-slate-500 text-[10px] truncate font-medium">{prof1}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: T.purple }}>2</span>
              <span className="text-slate-500 text-[10px] truncate font-medium">{prof2}</span>
            </div>
          </div>
        )}
        {emploiType !== 'professeur' && !prof1 && prof2 && (
          <div className="flex items-center gap-1 min-w-0 mt-0.5">
            <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: T.purple }}>2</span>
            <span className="text-slate-500 text-[10px] truncate font-medium">{prof2}</span>
          </div>
        )}

        {salleLabel && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-slate-400 text-[9px] font-medium">{salleLabel}</span>
          </div>
        )}

        <div className="flex gap-1 mt-1 flex-wrap">
          <span className="px-1.5 py-px rounded-full text-[8px] font-bold tracking-wide" style={{ background: ts.bg, color: ts.color }}>
            {group.type || 'Cours'}
          </span>
          {group.semaine_type && group.semaine_type !== 'toutes' && (
            <span className="px-1.5 py-px rounded-full text-[8px] font-bold bg-indigo-100 text-indigo-800">
              S.{group.semaine_type}
            </span>
          )}
        </div>

        {group.dates?.length > 0 && emploiType === 'classe' && (
          <div className="flex gap-0.5 flex-wrap mt-1">
            {group.dates.map(d => (
              <span key={d} className="px-1 py-px rounded-full text-[8px] bg-orange-50 text-orange-800 font-semibold border border-orange-200">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCell = (jour, seance) => {
    const seances = getCellSeances(jour, seance);
    const isOver    = dragOverCell?.jour === jour && dragOverCell?.seance === seance;
    const isDragSrc = dragging?.jour === jour && dragging?.seance === seance;

    if (seances.length === 0) {
      return (
        <div className={`min-h-[70px] rounded-lg p-1 transition-all duration-150 flex items-center justify-center ${isOver ? 'bg-blue-50 shadow-inner shadow-blue-500/30' : ''}`}>
          {isOver
            ? <div className="text-center text-blue-600 text-[10px] font-bold"><div className="text-lg leading-none mb-0.5">⊕</div>Déposer</div>
            : <div className="text-center text-gray-200 text-[9px] font-medium"><div className="text-lg leading-none mb-0.5"></div></div>
          }
        </div>
      );
    }

    const groups = groupCellSeances(seances);
    const cat    = categorize(groups);

    const wrapCard = (g, extraClass = '') => (
      <div key={g.key} className={`transition-opacity duration-200 ${isDragSrc && dragging?.group?.key === g.key ? 'opacity-20' : ''} ${extraClass}`}>
        {renderCard(g, jour, seance)}
      </div>
    );

    return (
      <div className={`rounded-lg p-1 transition-all duration-150 ${isOver ? 'bg-blue-50 shadow-inner shadow-blue-500/30' : ''}`}>
        {isOver && (
          <div className="text-center text-[9px] text-blue-600 font-bold bg-blue-100 rounded-md py-0.5 px-0 mb-1">↓ Déposer ici</div>
        )}

        {cat.toutes.length > 0 && (
          <>
            {cat.toutes.map(g => wrapCard(g))}
            {cat.planifiee.map(g => wrapCard(g, 'border-t border-amber-200 pt-1 mt-1'))}
          </>
        )}

        {cat.toutes.length === 0 && (cat.paire.length > 0 || cat.impair.length > 0) && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <div className="border-r border-gray-200 pr-1">
                {cat.paire.length > 0
                  ? cat.paire.map(g => wrapCard(g))
                  : <div className="text-gray-200 text-[9px] text-center py-1.5">—</div>}
                <div className="text-[7px] text-gray-400 text-center mt-0.5 font-semibold tracking-wide uppercase">Paires</div>
              </div>
              <div className="pl-1">
                {cat.impair.length > 0
                  ? cat.impair.map(g => wrapCard(g))
                  : <div className="text-gray-200 text-[9px] text-center py-1.5">—</div>}
                <div className="text-[7px] text-gray-400 text-center mt-0.5 font-semibold tracking-wide uppercase">Impaires</div>
              </div>
            </div>
            {cat.planifiee.map(g => wrapCard(g, 'border-t border-amber-200 pt-1 mt-1'))}
          </>
        )}

        {cat.toutes.length === 0 && cat.paire.length === 0 && cat.impair.length === 0 &&
          cat.planifiee.map((g, i) => wrapCard(g, i > 0 ? 'border-t border-amber-200 pt-1 mt-1' : ''))}
      </div>
    );
  };

  if (!selectedConfig) return null;

  const renderRows = (list, prefix) => list.map((seance, idx) => (
    <tr key={`${prefix}-${idx}`} className="border-b border-gray-100 last:border-none">
      <td className="p-2.5 pr-3.5 border-r border-gray-100 bg-gray-50 align-top w-[110px]">
        <div className="font-bold text-[10px] text-slate-700 tracking-tight">{seance.element.replace('_', ' ')}</div>
        <div className="text-[9px] text-gray-400 mt-0.5 font-medium">{seance.heureDebut} – {seance.heureFin}</div>
      </td>
      {selectedConfig.jours.map((jour, ji) => (
        <td
          key={`${ji}-${idx}`}
          data-jour={jour}
          data-seance={seance.element}
          className="p-1.5 border-r border-gray-100 align-top min-w-[150px] transition-colors duration-100 hover:bg-gray-50 cursor-pointer"
          onClick={(e) => handleTdClick(e, jour, seance.element)}
        >
          {renderCell(jour, seance.element)}
        </td>
      ))}
    </tr>
  ));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        .emploi-root * { font-family: 'DM Sans', system-ui, sans-serif; box-sizing: border-box; }
        .seance-card:hover .card-del { opacity: 1 !important; transform: scale(1.1); }
        .emploi-scroll::-webkit-scrollbar { height: 5px; }
        .emploi-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 99px; }
        .emploi-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 99px; }
        .modal-bg { backdrop-filter: blur(4px); }
        @keyframes ghost-pulse { 0%,100%{opacity:.9} 50%{opacity:1} }
        .card-ghost { animation: ghost-pulse 1s ease-in-out infinite; }
        .alt-row { transition: background 0.15s, border-color 0.15s; }
        .alt-row:hover { background: #eff6ff; }
        .alt-row.selected { background: #eff6ff; border-color: #1a56db !important; }
      `}</style>

      <div className="emploi-root">
        {dragging && (
          <div ref={ghostRef} className="fixed z-[9999] pointer-events-none"
            style={{ left: dragging.ghostX + 16, top: dragging.ghostY + 16, width: 170 }}>
            {renderCard(dragging.group, dragging.jour, dragging.seance, true)}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke={T.gray400} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px] text-slate-500 font-medium">
                {onMoveSeance ? 'Cliquer pour ajouter · Glisser pour déplacer' : 'Consultation'}
              </span>
            </div>

            {selectedItemName && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: T.blueSoft, color: T.blue, border: `1px solid ${T.blueLight}` }}>
                {emploiType === 'professeur' && (
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {emploiType === 'salle' && (
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {emploiType === 'classe' && (
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                {selectedItemName}
              </div>
            )}
          </div>

          <div className="emploi-scroll overflow-x-auto">
            <table className="w-full border-collapse text-xs bg-white">
              <thead>
                <tr>
                  <th className="px-3.5 py-2.5 text-left bg-blue-500 text-white text-[10px] font-bold tracking-wide uppercase border-r border-blue-600 w-[110px]">
                    Horaires
                  </th>
                  {selectedConfig.jours.map((jour, i) => (
                    <th key={i} className="px-3.5 py-2.5 text-left bg-blue-500 text-white text-[10px] font-semibold border-r border-blue-600 min-w-[150px]">
                      <span className="font-bold text-[11px]">{jour}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderRows(seancesMatin, 'matin')}

                {pauseElement && (
                  <tr className="bg-gradient-to-r from-gray-50 via-amber-50 to-gray-50">
                    <td colSpan={selectedConfig.jours.length + 1}>
                      <div className="flex items-center gap-2 py-0.5 justify-center">
                        <div className="flex-1 h-px bg-amber-200" />
                        <div className="flex-1 h-px bg-amber-200" />
                      </div>
                    </td>
                  </tr>
                )}

                {renderRows(seancesApresMidi, 'apres')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Modal conflit enrichie avec alternatives */}
      {conflictModal && (
        <ConflictModal
          modal={conflictModal}
          onClose={() => setConflictModal(null)}
        />
      )}

      {/* Modal suppression */}
      {deleteModal && (
        <div className="modal-bg fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
            <div className="pt-7 pb-5 px-6 text-center">
              <div className="w-[60px] h-[60px] rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-200">
                <svg width="28" height="28" fill="none" stroke={T.red} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="font-bold text-base text-slate-900 mb-2">Supprimer la séance ?</div>
              <div className="text-[13px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">{deleteModal.label}</span> sera définitivement supprimée.
              </div>
            </div>
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex gap-2.5">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 text-[13px] font-semibold text-slate-700 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                Annuler
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-red-600 border-none rounded-xl cursor-pointer shadow-md hover:opacity-90 transition-opacity">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ✅ Sous-composant modal de conflit avec sélection d'alternatives
function ConflictModal({ modal, onClose }) {
  const [selectedSalle,      setSelectedSalle]      = useState(null);
  const [selectedEnseignant, setSelectedEnseignant] = useState(null);

  const canApply =
    (!modal.hasSalleConflict      || selectedSalle      !== null || modal.sallesAlternatives.length === 0) &&
    (!modal.hasEnseignantConflict || selectedEnseignant !== null || modal.enseignantsAlternatifs.length === 0);

  const handleApply = () => {
    const overrides = {};
    if (selectedSalle)      overrides.salle_id      = selectedSalle.id;
    if (selectedEnseignant) overrides.enseignant_id = selectedEnseignant.id;
    modal.onConfirm(overrides);
  };

  return (
    <div
      className="modal-bg fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="bg-white  w-full max-w-3xl mx-4 overflow-hidden shadow-2xl" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

        {/* En-tête */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200">
            <svg width="22" height="22" fill="none" stroke={T.amber} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-[15px] text-slate-900">Conflits détectés</div>
            <div className="text-xs text-slate-500 mt-0.5">Sélectionnez une alternative ou forcez le déplacement.</div>
          </div>
        </div>

        {/* Conflits */}
        <div className="px-6 py-4 flex flex-col gap-2">
          {modal.conflicts.map((c, i) => (
            <div key={i} className="flex gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${c.type === 'enseignant' ? 'bg-blue-500' : 'bg-purple-500'}`} />
              <div>
                <div className="text-[10px] font-bold text-red-600 mb-0.5 uppercase tracking-wide">
                  {c.type === 'enseignant' ? 'Enseignant' : 'Salle'}
                </div>
                <div className="text-xs text-red-800">{c.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alternatives enseignants */}
        {modal.hasEnseignantConflict && modal.enseignantsAlternatifs.length > 0 && (
          <div className="px-6 pb-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              Enseignants disponibles
            </div>
            <div className="flex flex-col gap-1.5">
              {modal.enseignantsAlternatifs.map(ens => {
                const nom = fullName(ens.prenom, ens.nom) || ens.nom || String(ens.id);
                const selected = selectedEnseignant?.id === ens.id;
                return (
                  <div
                    key={ens.id}
                    onClick={() => setSelectedEnseignant(selected ? null : ens)}
                    className={`alt-row flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer ${selected ? 'selected border-blue-400' : 'border-gray-200'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg width="13" height="13" fill="none" stroke="#1a56db" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 truncate">{nom}</div>
                      <div className="text-[10px] text-slate-400">Disponible sur ce créneau</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {selected && (
                        <svg width="8" height="8" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {modal.hasEnseignantConflict && modal.enseignantsAlternatifs.length === 0 && (
          <div className="px-6 pb-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Enseignants</div>
            <div className="text-[12px] text-slate-400 italic py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
              Aucun enseignant disponible sur ce créneau.
            </div>
          </div>
        )}

        {/* Alternatives salles */}
        {modal.hasSalleConflict && modal.sallesAlternatives.length > 0 && (
          <div className="px-6 pb-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              Salles disponibles
            </div>
            <div className="flex flex-col gap-1.5">
              {modal.sallesAlternatives.map(salle => {
                const label = salle.nom || String(salle.id);
                const selected = selectedSalle?.id === salle.id;
                return (
                  <div
                    key={salle.id}
                    onClick={() => setSelectedSalle(selected ? null : salle)}
                    className={`alt-row flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer ${selected ? 'selected border-blue-400' : 'border-gray-200'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg width="13" height="13" fill="none" stroke="#7c3aed" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 truncate">{label}</div>
                      <div className="text-[10px] text-slate-400">Disponible sur ce créneau</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {selected && (
                        <svg width="8" height="8" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {modal.hasSalleConflict && modal.sallesAlternatives.length === 0 && (
          <div className="px-6 pb-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Salles</div>
            <div className="text-[12px] text-slate-400 italic py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
              Aucune salle disponible sur ce créneau.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex gap-2.5 justify-end">
          <button
            onClick={modal.onCancel}
            className="px-4 py-2 text-[13px] font-semibold text-slate-700 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
         
          {canApply && (
            <button
              onClick={handleApply}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 border-none rounded-xl cursor-pointer shadow-md hover:opacity-90 transition-opacity"
            >
              Appliquer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmploiTableau;