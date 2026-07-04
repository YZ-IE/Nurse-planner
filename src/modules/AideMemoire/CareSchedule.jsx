/**
 * CareSchedule.jsx — Aide-Mémoire v4
 * - Constantes vitales regroupées (TA, T°, SpO2, FC)
 * - Valeur non obligatoire mais confirmation si validation sans valeur
 */

import { useState, useRef } from 'react';
import { T, tk, SOLID } from '../../theme.js';
import { timeStr, genId, EmptyState } from './utils.jsx';
import { CARE_TYPES, getCareType as getCT } from './careTypes.js';
import { Btn, IconBtn, Field, Input, Banner, Sheet, toast } from '../../ui/index.js';

// ─── Modal ajout ──────────────────────────────────────────────────────────────

function AddCareModal({ onAdd, onClose }) {
  const [type, setType]               = useState('constantes_vitales');
  const [label, setLabel]             = useState('');
  const [plannedTime, setPlannedTime] = useState(timeStr());
  const [note, setNote]               = useState('');
  const ct = getCT(type);

  return (
    <Sheet title="Ajouter un soin" onClose={onClose} zIndex={200}
      footer={
        <Btn color={ct.color} size="lg" full icon={ct.emoji}
          onClick={() => { onAdd({ type, label: label.trim() || ct.label, plannedTime, note: note.trim() }); onClose(); }}>
          Ajouter
        </Btn>
      }>
      <Field label="Type">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {CARE_TYPES.map(ct => {
            const active = type === ct.id;
            return (
              <button key={ct.id} onClick={() => { setType(ct.id); setLabel(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: tk.touch.min, background: active ? ct.color + '22' : T.bg, border: `1px solid ${active ? ct.color : T.border}`, borderLeft: `3px solid ${active ? ct.color : 'transparent'}`, borderRadius: tk.radius.sm, color: active ? ct.color : T.text, fontSize: tk.font.base, fontWeight: active ? 700 : 400, padding: '9px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{ct.emoji}</span>
                <span style={{ flex: 1 }}>{ct.label}</span>
                {ct.grouped && <span style={{ color: ct.color, fontSize: tk.font.xs, background: ct.color + '22', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>TA·SpO2·T°·FC</span>}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Libellé (optionnel)">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder={ct.label} />
      </Field>
      <Field label="Heure planifiée">
        <Input type="time" value={plannedTime} onChange={e => setPlannedTime(e.target.value)} style={{ width: 140 }} />
      </Field>
      <Field label="Note (optionnel)">
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte…" />
      </Field>
    </Sheet>
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
    <Sheet title={entry.label} icon={ct.emoji} onClose={onClose} zIndex={300}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outline" color={T.muted} onClick={onClose} style={{ flex: 1 }}>Annuler</Btn>
          <Btn color={SOLID.success} size="lg" onClick={handleValidate} style={{ flex: 2 }}>
            {confirmEmpty ? '✓ Confirmer sans valeur' : '✓ Valider'}
          </Btn>
        </div>
      }>
      <Field label="Heure de réalisation">
        <Input type="time" value={doneTime} onChange={e => setDoneTime(e.target.value)} style={{ width: 140 }} />
      </Field>

      {ct.grouped ? (
        <Field label="Valeurs mesurées">
          {ct.subFields.map(sf => (
            <Field key={sf.key} label={sf.label} style={{ marginBottom: 10 }}>
              <Input value={subVals[sf.key] || ''} onChange={e => { setSubVals(v => ({ ...v, [sf.key]: e.target.value })); setConfirmEmpty(false); }}
                placeholder={sf.placeholder} />
            </Field>
          ))}
        </Field>
      ) : (
        <Field label={ct.valueLabel || 'Note'}>
          <Input value={value} onChange={e => { setValue(e.target.value); setConfirmEmpty(false); }}
            placeholder={ct.valuePlaceholder || 'Optionnel…'} autoFocus />
        </Field>
      )}

      {confirmEmpty && (
        <Banner kind="warning" icon="⚠️">Aucune valeur saisie — confirmer quand même ?</Banner>
      )}
    </Sheet>
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: T.surface, border: `1px solid ${entry.done ? T.border : ct.color + '44'}`, borderLeft: `3px solid ${entry.done ? T.success : ct.color}`, borderRadius: tk.radius.sm, padding: '10px 12px', marginBottom: 7, opacity: entry.done ? 0.7 : 1 }}>
      {/* Case à cocher : visuel 28px, zone tactile 44px */}
      <button onClick={() => entry.done ? onUndo(entry.id) : onValidate(entry)}
        aria-label={entry.done ? 'Annuler la validation' : 'Valider le soin'}
        style={{ width: 44, height: 44, margin: '-7px -4px -7px -10px', padding: 0, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
        <span style={{ width: 28, height: 28, boxSizing: 'border-box', borderRadius: tk.radius.sm, border: `2px solid ${entry.done ? T.success : ct.color}`, background: entry.done ? SOLID.success : 'transparent', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {entry.done ? '✓' : ''}
        </span>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15 }}>{ct.emoji}</span>
          <span style={{ color: T.text, fontSize: tk.font.base, fontWeight: 600, textDecoration: entry.done ? 'line-through' : 'none' }}>{entry.label}</span>
          {entry.doneValue && <span style={{ background: T.successDim, color: T.success, fontSize: tk.font.xs, borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>{entry.doneValue}</span>}
        </div>
        {entry.note && !entry.done && <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 2, fontStyle: 'italic' }}>{entry.note}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {editTime ? (
            <Input type="time" size="compact" defaultValue={entry.plannedTime} autoFocus onBlur={e => { onTimeChange(entry.id, e.target.value); setEditTime(false); }} style={{ width: 120, fontSize: tk.font.sm }} />
          ) : (
            <button onClick={() => !entry.done && setEditTime(true)}
              style={{ background: 'none', border: 'none', padding: '12px 8px', margin: '-12px -8px', color: ct.color, fontSize: tk.font.sm, fontWeight: 700, fontVariantNumeric: 'tabular-nums', cursor: entry.done ? 'default' : 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              🕐 {entry.plannedTime}
            </button>
          )}
          {entry.done && entry.doneTime && <span style={{ color: T.success, fontSize: tk.font.xs, fontVariantNumeric: 'tabular-nums' }}>✓ {entry.doneTime}</span>}
        </div>
      </div>
      <IconBtn label="Supprimer le soin" size={44} onClick={handleDeleteTap}
        variant={confirmDel ? 'soft' : 'ghost'} color={confirmDel ? T.danger : T.muted}
        fontSize={confirmDel ? tk.font.xs : 20}
        style={{ margin: '-7px -8px -7px 0', fontWeight: confirmDel ? 700 : 400, transition: 'all 0.15s' }}>
        {confirmDel ? '✕ ?' : '×'}
      </IconBtn>
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
          <div style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: tk.weight.semi, letterSpacing: 0.2, marginTop: 10, marginBottom: 6 }}>Réalisés ({careEntries.filter(e => e.done).length})</div>
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
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: tk.touch.min, background: T.surface, border: `1px dashed ${T.border2}`, borderRadius: tk.radius.sm, color: T.muted, fontSize: tk.font.base, padding: '9px 14px', cursor: 'pointer', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
        <span style={{ fontSize: 18 }}>+</span><span>Ajouter un soin / surveillance</span>
      </button>

      {showAdd    && <AddCareModal    onAdd={e => onEntriesChange([...careEntries, { id: genId(), ...e, done: false, doneTime: null, doneValue: null }])} onClose={() => setShowAdd(false)} />}
      {validating && <ValidationModal entry={validating} onValidate={(id, doneTime, doneValue) => { onEntriesChange(careEntries.map(e => e.id === id ? { ...e, done: true, doneTime, doneValue } : e)); toast('Soin validé'); setValidating(null); }} onClose={() => setValidating(null)} />}
    </div>
  );
}
