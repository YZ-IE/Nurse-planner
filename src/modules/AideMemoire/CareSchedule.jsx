/**
 * CareSchedule.jsx — Aide-Mémoire v4
 * - Constantes vitales regroupées (TA, T°, SpO2, FC)
 * - Valeur non obligatoire mais confirmation si validation sans valeur
 */

import { useState, useRef } from 'react';
import { T } from '../../theme.js';
import { timeStr, genId, EmptyState } from './utils.jsx';
import { CARE_TYPES, getCareType as getCT } from './careTypes.js';

const BG  = T.bg;
const SRF = T.surface;
const BRD = T.surface;
const TXT = T.text;
const MUT = T.muted;

const INP = { background: BG, border: `1px solid ${BRD}`, borderRadius: 8, color: TXT, fontSize: 15, padding: '10px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' };

// ─── Modal ajout ──────────────────────────────────────────────────────────────

function AddCareModal({ onAdd, onClose }) {
  const [type, setType]               = useState('constantes_vitales');
  const [label, setLabel]             = useState('');
  const [plannedTime, setPlannedTime] = useState(timeStr());
  const [note, setNote]               = useState('');
  const ct = getCT(type);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: SRF, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: TXT, fontSize: 17, fontWeight: 700 }}>Ajouter un soin</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUT, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Type</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
          {CARE_TYPES.map(ct => {
            const active = type === ct.id;
            return (
              <button key={ct.id} onClick={() => { setType(ct.id); setLabel(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: active ? ct.color + '22' : BG, border: `1px solid ${active ? ct.color : BRD}`, borderLeft: `3px solid ${active ? ct.color : 'transparent'}`, borderRadius: 8, color: active ? ct.color : TXT, fontSize: 14, fontWeight: active ? 700 : 400, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{ct.emoji}</span>
                <span style={{ flex: 1 }}>{ct.label}</span>
                {ct.grouped && <span style={{ color: ct.color, fontSize: 10, background: ct.color + '22', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>TA·SpO2·T°·FC</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Libellé (optionnel)</div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={ct.label} style={INP} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Heure planifiée</div>
          <input type="time" value={plannedTime} onChange={e => setPlannedTime(e.target.value)} style={{ ...INP, width: 130 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Note (optionnel)</div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte…" style={INP} />
        </div>

        <button onClick={() => { onAdd({ type, label: label.trim() || ct.label, plannedTime, note: note.trim() }); onClose(); }}
          style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, background: ct.color, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
          {ct.emoji} Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Modal validation ─────────────────────────────────────────────────────────

function ValidationModal({ entry, onValidate, onClose }) {
  const ct = getCT(entry.type);
  const [doneTime,      setDoneTime]      = useState(timeStr());
  const [value,         setValue]         = useState('');
  const [subVals,       setSubVals]       = useState({});
  const [confirmEmpty,  setConfirmEmpty]  = useState(false);

  function hasValue() {
    return ct.grouped
      ? Object.values(subVals).some(v => v?.trim())
      : value.trim().length > 0;
  }

  function buildValue() {
    if (ct.grouped) {
      const parts = (ct.subFields || []).filter(sf => subVals[sf.key]?.trim()).map(sf => `${sf.label.split(' ')[0]}: ${subVals[sf.key]}`);
      return parts.join(' | ');
    }
    return value.trim();
  }

  function handleValidate() {
    if (!hasValue() && !confirmEmpty) { setConfirmEmpty(true); return; }
    onValidate(entry.id, doneTime, buildValue());
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 300 }}>
      <div style={{ background: SRF, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ color: TXT, fontSize: 17, fontWeight: 700 }}>{ct.emoji} {entry.label}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUT, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Heure de réalisation</div>
          <input type="time" value={doneTime} onChange={e => setDoneTime(e.target.value)} style={{ ...INP, width: 130 }} />
        </div>

        {ct.grouped ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Valeurs mesurées</div>
            {ct.subFields.map(sf => (
              <div key={sf.key} style={{ marginBottom: 10 }}>
                <div style={{ color: MUT, fontSize: 12, marginBottom: 5 }}>{sf.label}</div>
                <input value={subVals[sf.key] || ''} onChange={e => { setSubVals(v => ({ ...v, [sf.key]: e.target.value })); setConfirmEmpty(false); }}
                  placeholder={sf.placeholder} style={INP} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{ct.valueLabel || 'Note'}</div>
            <input value={value} onChange={e => { setValue(e.target.value); setConfirmEmpty(false); }}
              placeholder={ct.valuePlaceholder || 'Optionnel…'} autoFocus style={INP} />
          </div>
        )}

        {confirmEmpty && (
          <div style={{ background: '#f9731622', border: '1px solid #f9731644', borderRadius: 8, padding: '10px 12px', marginBottom: 16, color: '#f97316', fontSize: 13 }}>
            ⚠️ Aucune valeur saisie — confirmer quand même ?
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${BRD}`, borderRadius: 10, color: MUT, fontSize: 14, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleValidate} style={{ flex: 2, padding: '13px', fontSize: 15, fontWeight: 700, background: '#22c55e', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
            {confirmEmpty ? '✓ Confirmer sans valeur' : '✓ Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ligne ────────────────────────────────────────────────────────────────────

function CareRow({ entry, onValidate, onUndo, onRemove, onTimeChange }) {
  const ct = getCT(entry.type);
  const [editTime,    setEditTime]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const confirmTimer = useRef(null);

  function handleDeleteTap() {
    if (confirmDel) {
      clearTimeout(confirmTimer.current);
      onRemove(entry.id);
    } else {
      setConfirmDel(true);
      confirmTimer.current = setTimeout(() => setConfirmDel(false), 2000);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: SRF, border: `1px solid ${entry.done ? BRD : ct.color + '44'}`, borderLeft: `3px solid ${entry.done ? '#22c55e' : ct.color}`, borderRadius: 9, padding: '10px 12px', marginBottom: 7, opacity: entry.done ? 0.7 : 1 }}>
      <button onClick={() => entry.done ? onUndo(entry.id) : onValidate(entry)}
        style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1, border: `2px solid ${entry.done ? '#22c55e' : ct.color}`, background: entry.done ? '#22c55e' : 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
        {entry.done ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14 }}>{ct.emoji}</span>
          <span style={{ color: TXT, fontSize: 13, fontWeight: 600, textDecoration: entry.done ? 'line-through' : 'none' }}>{entry.label}</span>
          {entry.doneValue && <span style={{ background: '#22c55e22', color: '#22c55e', fontSize: 11, borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>{entry.doneValue}</span>}
        </div>
        {entry.note && !entry.done && <div style={{ color: MUT, fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{entry.note}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {editTime ? (
            <input type="time" defaultValue={entry.plannedTime} autoFocus onBlur={e => { onTimeChange(entry.id, e.target.value); setEditTime(false); }} style={{ ...INP, fontSize: 12, padding: '2px 6px', width: 110 }} />
          ) : (
            <span onClick={() => !entry.done && setEditTime(true)} style={{ color: ct.color, fontSize: 12, fontWeight: 700, cursor: entry.done ? 'default' : 'pointer' }}>🕐 {entry.plannedTime}</span>
          )}
          {entry.done && entry.doneTime && <span style={{ color: '#22c55e', fontSize: 11 }}>✓ {entry.doneTime}</span>}
        </div>
      </div>
      <button onClick={handleDeleteTap}
        style={{ background: confirmDel ? '#f43f5e22' : 'none', border: confirmDel ? '1px solid #f43f5e66' : 'none', borderRadius: 6, color: confirmDel ? '#f43f5e' : MUT, fontSize: confirmDel ? 11 : 18, fontWeight: confirmDel ? 700 : 400, cursor: 'pointer', padding: confirmDel ? '3px 6px' : 0, lineHeight: 1, flexShrink: 0, transition: 'all 0.15s' }}>
        {confirmDel ? '✕ ?' : '×'}
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CareSchedule({ careEntries = [], onEntriesChange }) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [validating, setValidating] = useState(null);

  return (
    <div>
      {careEntries.length === 0 && <EmptyState icon="💊" text="Aucun soin programmé" sub="Appuyez sur + pour ajouter un soin" />}

      {[...careEntries].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime))
        .filter(e => !e.done)
        .map(e => <CareRow key={e.id} entry={e}
          onValidate={setValidating}
          onUndo={id => onEntriesChange(careEntries.map(e => e.id === id ? { ...e, done: false, doneTime: null, doneValue: null } : e))}
          onRemove={id => onEntriesChange(careEntries.filter(e => e.id !== id))}
          onTimeChange={(id, val) => onEntriesChange(careEntries.map(e => e.id === id ? { ...e, plannedTime: val } : e))} />)}

      {careEntries.some(e => e.done) && (
        <>
          <div style={{ color: MUT, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Réalisés ({careEntries.filter(e => e.done).length})</div>
          {[...careEntries].sort((a, b) => a.plannedTime.localeCompare(b.plannedTime))
            .filter(e => e.done)
            .map(e => <CareRow key={e.id} entry={e}
              onValidate={setValidating}
              onUndo={id => onEntriesChange(careEntries.map(e => e.id === id ? { ...e, done: false, doneTime: null, doneValue: null } : e))}
              onRemove={id => onEntriesChange(careEntries.filter(e => e.id !== id))}
              onTimeChange={(id, val) => onEntriesChange(careEntries.map(e => e.id === id ? { ...e, plannedTime: val } : e))} />)}
        </>
      )}

      <button onClick={() => setShowAdd(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: SRF, border: `1px dashed ${BRD}`, borderRadius: 9, color: MUT, fontSize: 14, padding: '9px 14px', cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent' }}>
        <span style={{ fontSize: 18 }}>+</span><span>Ajouter un soin / surveillance</span>
      </button>

      {showAdd    && <AddCareModal    onAdd={e => onEntriesChange([...careEntries, { id: genId(), ...e, done: false, doneTime: null, doneValue: null }])} onClose={() => setShowAdd(false)} />}
      {validating && <ValidationModal entry={validating} onValidate={(id, doneTime, doneValue) => { onEntriesChange(careEntries.map(e => e.id === id ? { ...e, done: true, doneTime, doneValue } : e)); setValidating(null); }} onClose={() => setValidating(null)} />}
    </div>
  );
}
