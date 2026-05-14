/**
 * QuickEntry.jsx — Aide-Mémoire
 * Saisie rapide à la prise de poste :
 * tous les patients du service, constantes + note rapide par patient
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { getSpecialty, getAllFieldsAlpha } from './templates.js';
import { todayStr, timeStr, genId, isFlagActive, activeFlagsEmoji, FieldInput, isReadOnly, formatDateLabel } from './utils.jsx';
import { computeSlots } from './ServiceView.jsx';
import { CARE_TYPES, getCareType } from './careTypes.js';

// ─── Modal ajout soin ─────────────────────────────────────────────────────────

function AddCareModal({ patient, onAdd, onClose }) {
  const [type,        setType]        = useState('constantes_vitales');
  const [label,       setLabel]       = useState('');
  const [plannedTime, setPlannedTime] = useState(timeStr());
  const [note,        setNote]        = useState('');
  const ct = getCareType(type);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div onTouchMove={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '20px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>💊 Planifier un soin</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{patient.initials}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
          {CARE_TYPES.map(ct => {
            const active = type === ct.id;
            return (
              <button key={ct.id} onClick={() => { setType(ct.id); setLabel(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: active ? ct.color + '22' : T.bg, border: `1px solid ${active ? ct.color : T.border}`, borderLeft: `3px solid ${active ? ct.color : 'transparent'}`, borderRadius: 8, color: active ? ct.color : T.text, fontSize: 14, fontWeight: active ? 700 : 400, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ fontSize: 18 }}>{ct.emoji}</span>
                <span>{ct.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Heure planifiée</div>
          <input type="time" value={plannedTime} onChange={e => setPlannedTime(e.target.value)}
            style={{ ...s.input, width: 130, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Libellé (optionnel)</div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={ct.label}
            style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Note (optionnel)</div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte…"
            style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
        </div>

        <button onClick={() => { onAdd({ type, label: label.trim() || ct.label, plannedTime, note: note.trim() }); onClose(); }}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: ct.color, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>
          {ct.emoji} Planifier
        </button>
      </div>
    </div>
  );
}

// ─── Modal ajout RDV/info ─────────────────────────────────────────────────────

function AddRdvModal({ patient, infoFields, onAdd, onClose }) {
  const [fieldId, setFieldId] = useState(infoFields[0]?.id || '');
  const [value,   setValue]   = useState('');

  if (!infoFields.length) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div onTouchMove={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '20px 20px 44px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📅 RDV / Information</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{patient.initials}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Champ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {infoFields.map(f => (
              <button key={f.id} onClick={() => setFieldId(f.id)}
                style={{ background: fieldId === f.id ? '#6366f122' : T.bg, border: `1px solid ${fieldId === f.id ? '#6366f1' : T.border}`, borderRadius: 8, color: fieldId === f.id ? '#6366f1' : T.text, fontSize: 14, fontWeight: fieldId === f.id ? 700 : 400, padding: '8px 12px', cursor: 'pointer', textAlign: 'left' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Valeur</div>
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="Ex: Scanner 14h, Kiné J3…"
            style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
        </div>

        <button onClick={() => { if (fieldId && value.trim()) { onAdd(fieldId, value.trim()); onClose(); } }}
          disabled={!fieldId || !value.trim()}
          style={{ ...s.btn('#6366f1'), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: (fieldId && value.trim()) ? 1 : 0.4 }}>
          📅 Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Modal centres d'intérêt (QuickEntry) ────────────────────────────────────

function CentreInteretModal({ patient, service, dailyData, onFieldChange, onAddField, onClose }) {
  const [view,   setView]   = useState('list'); // 'list' | 'add'
  const [search, setSearch] = useState('');

  const customFields = patient.customFields || [];
  const daily        = dailyData[patient.id] || { fieldValues: {} };

  if (view === 'add') {
    const existingIds = new Set([
      ...service.fields.map(f => f.id),
      ...customFields.map(f => f.id),
    ]);
    const allFields = getAllFieldsAlpha().filter(f => !existingIds.has(f.id));
    const filtered  = search.trim()
      ? allFields.filter(f => f.label.toLowerCase().includes(search.toLowerCase()))
      : allFields;

    function catColor(f) {
      if (f.category === 'flag')        return '#f43f5e';
      if (f.category === 'info')        return '#6366f1';
      if (f.category === 'observation') return '#06b6d4';
      if (f.category === 'constante')   return '#22c55e';
      return T.muted;
    }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
        <div onTouchMove={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '20px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => { setView('list'); setSearch(''); }} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer' }}>←</button>
            <span style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>➕ Ajouter un centre d'intérêt</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer' }}>×</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
          {filtered.length === 0 && (
            <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 16 }}>Aucun champ disponible</div>
          )}
          {filtered.map(f => (
            <button key={f.id} onClick={() => { onAddField(f); setView('list'); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 7, background: T.bg, border: `1px solid ${T.border}`, borderLeft: `3px solid ${catColor(f)}`, borderRadius: 10, color: T.text, padding: '11px 14px', textAlign: 'left', fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              <span>{f.label}</span>
              <span style={{ color: T.muted, fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{f.persistent ? '📌 séjour' : '🔄 journalier'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div onTouchMove={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '20px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>🎯 Centres d'intérêt</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{patient.initials}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer' }}>×</button>
        </div>

        {customFields.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 14, textAlign: 'center' }}>
            Aucun centre d'intérêt — ajoutez-en ci-dessous
          </div>
        )}

        {customFields.map(f => (
          <div key={f.id} style={{ marginBottom: 14 }}>
            <div style={{ color: T.muted, fontSize: 11, marginBottom: 5 }}>{f.label}</div>
            <FieldInput
              field={f}
              value={f.persistent ? (patient.fieldValues || {})[f.id] : daily.fieldValues[f.id]}
              onChange={v => onFieldChange(patient, f.id, v)}
              accentColor="#a78bfa"
            />
          </div>
        ))}

        <button onClick={() => setView('add')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: '1px dashed rgba(167,139,250,0.5)', borderRadius: 12, color: '#a78bfa', fontSize: 14, padding: '11px 14px', cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ fontSize: 18 }}>+</span>
          <span>Ajouter un centre d'intérêt</span>
        </button>
      </div>
    </div>
  );
}

export default function QuickEntry({ service, cryptoKey, accentColor, onBack, selectedDate: selDate, onNavigate }) {
  const C  = accentColor;
  const sp = getSpecialty(service.specialty);

  const [patients,  setPatients]  = useState([]);
  const [dailyData, setDailyData] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [eventInputs, setEventInputs] = useState({});
  const [addCareFor,       setAddCareFor]       = useState(null);
  const [addRdvFor,        setAddRdvFor]        = useState(null);
  const [centreInteretFor, setCentreInteretFor] = useState(null);

  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  // ─── Chargement ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey),
      ]);
      setPatients((pts || []).filter(p => p.present));
      setDailyData(daily || {});
    } finally {
      setLoading(false);
    }
  }, [service.id, cryptoKey, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Sauvegarde champ journalier ────────────────────────────────────────

  async function saveDailyField(patientId, fieldId, value) {
    const current = dailyData;
    const entry   = current[patientId] || { fieldValues: {}, events: [], observations: '' };
    const next    = { ...entry, fieldValues: { ...entry.fieldValues, [fieldId]: value } };
    const nextAll = { ...current, [patientId]: next };
    setDailyData(nextAll);
    if (!readOnly) await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
  }

  // ─── Ajout événement rapide ──────────────────────────────────────────────

  async function addQuickEvent(patientId) {
    const text = (eventInputs[patientId] || '').trim();
    if (!text) return;
    const event   = { id: genId(), time: timeStr(), text };
    const current = dailyData;
    const entry   = current[patientId] || { fieldValues: {}, events: [], observations: '' };
    const next    = { ...entry, events: [...(entry.events || []), event] };
    const nextAll = { ...current, [patientId]: next };
    setDailyData(nextAll);
    setEventInputs(prev => ({ ...prev, [patientId]: '' }));
    if (!readOnly) await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
  }

  async function addCare(patient, careData) {
    const entry  = dailyData[patient.id] || { fieldValues: {}, events: [], careEntries: [] };
    const newCare = { id: genId(), ...careData, done: false, doneTime: null, doneValue: null };
    const next   = { ...entry, careEntries: [...(entry.careEntries || []), newCare] };
    const nextAll = { ...dailyData, [patient.id]: next };
    setDailyData(nextAll);
    if (!readOnly) await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
  }

  async function savePatientPersistent(patientId, updater) {
    const allPts = await secureGet(`patients_${service.id}`, cryptoKey) || [];
    const allUpdated = allPts.map(p => p.id === patientId ? updater(p) : p);
    setPatients(prev => prev.map(p => p.id === patientId ? updater(p) : p));
    await secureSet(`patients_${service.id}`, allUpdated, cryptoKey);
  }

  async function addRdv(patient, fieldId, value) {
    const field = service.fields.find(f => f.id === fieldId) || (patients.find(p => p.id === patient.id)?.customFields || []).find(f => f.id === fieldId);
    if (!field) return;
    if (field.persistent) {
      await savePatientPersistent(patient.id, p => ({ ...p, fieldValues: { ...(p.fieldValues || {}), [fieldId]: value } }));
    } else {
      const entry  = dailyData[patient.id] || { fieldValues: {}, events: [] };
      const next   = { ...entry, fieldValues: { ...(entry.fieldValues || {}), [fieldId]: value } };
      const nextAll = { ...dailyData, [patient.id]: next };
      setDailyData(nextAll);
      if (!readOnly) await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
    }
  }

  async function saveCentreInteretField(patient, fieldId, value) {
    const field = (patient.customFields || []).find(f => f.id === fieldId);
    if (!field) return;
    if (field.persistent) {
      await savePatientPersistent(patient.id, p => ({ ...p, fieldValues: { ...(p.fieldValues || {}), [fieldId]: value } }));
    } else {
      const entry  = dailyData[patient.id] || { fieldValues: {}, events: [] };
      const next   = { ...entry, fieldValues: { ...(entry.fieldValues || {}), [fieldId]: value } };
      const nextAll = { ...dailyData, [patient.id]: next };
      setDailyData(nextAll);
      if (!readOnly) await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
    }
  }

  async function addPatientCustomField(patient, field) {
    const existing = patient.customFields || [];
    if (existing.find(f => f.id === field.id)) return;
    await savePatientPersistent(patient.id, p => ({ ...p, customFields: [...(p.customFields || []), { ...field, persistent: true }] }));
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
      </div>
    );
  }

  const constFields = service.fields.filter(f => f.category === 'constante');
  const slots = computeSlots(service);
  const bedLabel = Object.fromEntries(slots.map(sl => [sl.slotIndex, sl.roomLabel]));
  const sortedPatients = [...patients].sort((a, b) => {
    const la = bedLabel[a.bedNumber] ?? String(a.bedNumber);
    const lb = bedLabel[b.bedNumber] ?? String(b.bedNumber);
    return la.localeCompare(lb, 'fr', { numeric: true });
  });

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 12px', background: T.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>⚡ Saisie rapide — {formatDateLabel(selectedDate)}{readOnly ? ' 👁' : ''}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>
              {service.name} · {sortedPatients.length} patients · {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bandeau lecture seule ── */}
      {readOnly && (
        <div style={{ background: '#6366f122', borderBottom: `1px solid #6366f133`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ color: '#818cf8', fontSize: 12, fontWeight: 600 }}>Consultation uniquement — les modifications sont désactivées pour cette date</span>
        </div>
      )}

      {/* ── Patients ── */}
      <div style={{ padding: '10px 16px 60px' }}>

        {sortedPatients.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛏</div>
            <div style={{ color: T.muted, fontSize: 14 }}>Aucun patient présent dans ce service</div>
          </div>
        )}

        {sortedPatients.map(patient => {
          const daily      = dailyData[patient.id] || { fieldValues: {}, events: [], observations: '' };
          const flagEmoji  = activeFlagsEmoji(service.fields, patient.fieldValues, daily.fieldValues);
          const events     = daily.events || [];

          return (
            <div key={patient.id} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${readOnly ? T.border : sp.color}`,
              borderRadius: 12, padding: '14px 14px 12px',
              marginBottom: 12,
              opacity: readOnly ? 0.72 : 1,
            }}>

              {/* ─ En-tête patient ─ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: bedLabel[patient.bedNumber] == null ? '#f97316' : T.muted, fontSize: 12, fontWeight: 700, minWidth: 46 }}>
                  🛏 {bedLabel[patient.bedNumber] ?? `⚠️${patient.bedNumber}`}
                </span>
                <span style={{ color: T.text, fontSize: 15, fontWeight: 800 }}>{patient.initials}</span>
                <span style={{ color: T.muted, fontSize: 12 }}>{patient.gender} {patient.age}a</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                  {flagEmoji.map((e, i) => <span key={i} style={{ fontSize: 15 }}>{e}</span>)}
                  {onNavigate && (
                    <button onClick={() => onNavigate(patient.id)}
                      style={{ background: 'none', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                      title="Ouvrir la fiche patient">›</button>
                  )}
                </div>
              </div>

              {/* Motif abrégé */}
              {patient.admissionReason && (
                <div style={{ color: T.muted, fontSize: 11, marginBottom: 10, marginLeft: 54, fontStyle: 'italic' }}>
                  {patient.admissionReason.length > 60 ? patient.admissionReason.slice(0, 60) + '…' : patient.admissionReason}
                </div>
              )}

              {/* ─ Constantes (champs journaliers) ─ */}
              {constFields.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: T.muted, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Constantes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {constFields.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: T.muted, fontSize: 11 }}>{f.label}:</span>
                        <FieldInput
                          field={f}
                          value={f.persistent ? patient.fieldValues[f.id] : daily.fieldValues[f.id]}
                          onChange={v => saveDailyField(patient.id, f.id, v)}
                          accentColor="#06b6d4"
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ Événements du jour (résumé) ─ */}
              {events.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {events.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700, minWidth: 38 }}>{ev.time}</span>
                      <span style={{ color: T.text, fontSize: 12 }}>{ev.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ─ Ajout événement rapide ─ */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  value={eventInputs[patient.id] || ''}
                  onChange={e => setEventInputs(prev => ({ ...prev, [patient.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addQuickEvent(patient.id); }}
                  placeholder="Événement rapide…"
                  style={{ ...s.input, flex: 1, boxSizing: 'border-box', fontSize: 13 }}
                />
                <button
                  onClick={() => addQuickEvent(patient.id)}
                  disabled={!(eventInputs[patient.id] || '').trim()}
                  style={{
                    background:    '#22c55e33', border: '1px solid #22c55e44',
                    borderRadius:  8, color: '#22c55e', fontSize: 18,
                    width: 36, height: 36, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    opacity: (eventInputs[patient.id] || '').trim() ? 1 : 0.35,
                  }}
                >+</button>
              </div>

              {/* ─ Boutons planifier soin / RDV / Centre d'intérêt ─ */}
              {!readOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setAddCareFor(patient)}
                    style={{ flex: 1, background: '#f43f5e11', border: '1px solid #f43f5e33', borderRadius: 8, color: '#f43f5e', fontSize: 12, fontWeight: 600, padding: '7px 4px', cursor: 'pointer' }}>
                    💊 Soin
                  </button>
                  {service.fields.some(f => f.category === 'info') && (
                    <button onClick={() => setAddRdvFor(patient)}
                      style={{ flex: 1, background: '#6366f111', border: '1px solid #6366f133', borderRadius: 8, color: '#6366f1', fontSize: 12, fontWeight: 600, padding: '7px 4px', cursor: 'pointer' }}>
                      📅 RDV / Info
                    </button>
                  )}
                  <button onClick={() => setCentreInteretFor(patient)}
                    style={{ flex: 1, background: '#a78bfa11', border: '1px solid #a78bfa33', borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 600, padding: '7px 4px', cursor: 'pointer' }}>
                    🎯 Centres
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addCareFor && (
        <AddCareModal
          patient={addCareFor}
          onAdd={care => addCare(addCareFor, care)}
          onClose={() => setAddCareFor(null)}
        />
      )}
      {addRdvFor && (
        <AddRdvModal
          patient={addRdvFor}
          infoFields={service.fields.filter(f => f.category === 'info')}
          onAdd={(fieldId, value) => addRdv(addRdvFor, fieldId, value)}
          onClose={() => setAddRdvFor(null)}
        />
      )}
      {centreInteretFor && (
        <CentreInteretModal
          patient={patients.find(p => p.id === centreInteretFor.id) || centreInteretFor}
          service={service}
          dailyData={dailyData}
          onFieldChange={saveCentreInteretField}
          onAddField={f => addPatientCustomField(centreInteretFor, f)}
          onClose={() => setCentreInteretFor(null)}
        />
      )}
    </div>
  );
}
