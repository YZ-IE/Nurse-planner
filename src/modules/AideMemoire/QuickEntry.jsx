/**
 * QuickEntry.jsx — Aide-Mémoire
 * Saisie rapide à la prise de poste :
 * tous les patients du service, constantes + note rapide par patient
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, IconBtn, Chip, Field, Input, Banner, Sheet, toast } from '../../ui/index.js';
import { secureGet, secureSet } from './crypto.js';
import { getSpecialty, getAllFieldsAlpha } from './templates.js';
import { todayStr, timeStr, genId, isFlagActive, activeFlagsEmoji, FieldInput, isReadOnly, formatDateLabel, EmptyState, parseVitalAlerts } from './utils.jsx';
import { computeSlots } from './ServiceView.jsx';
import { CARE_TYPES, getCareType } from './careTypes.js';
import { scheduleCareNotif, cancelCareNotif, createNotifChannel } from './notifications.js';

const NOTIF_DELAY_KEY = 'nplanr_notif_delay';
const NOTIF_DELAYS    = [5, 10, 15, 30];

// ─── Modal ajout soin ─────────────────────────────────────────────────────────

function AddCareModal({ patient, onAdd, onClose }) {
  const [type,        setType]        = useState('constantes_vitales');
  const [label,       setLabel]       = useState('');
  const [plannedTime, setPlannedTime] = useState(timeStr());
  const [note,        setNote]        = useState('');
  const ct = getCareType(type);

  return (
    <Sheet
      title="Planifier un soin"
      icon="💊"
      subtitle={patient.initials}
      onClose={onClose}
      zIndex={200}
      footer={
        <Btn color={ct.color} size="lg" full icon={ct.emoji}
          onClick={() => { onAdd({ type, label: label.trim() || ct.label, plannedTime, note: note.trim() }); onClose(); }}>
          Planifier
        </Btn>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 230, overflowY: 'auto', marginBottom: 14 }}>
        {CARE_TYPES.map(ct => {
          const active = type === ct.id;
          return (
            <button key={ct.id} onClick={() => { setType(ct.id); setLabel(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: tk.touch.min, background: active ? ct.color + '22' : T.bg, border: `1px solid ${active ? ct.color : T.border}`, borderLeft: `3px solid ${active ? ct.color : 'transparent'}`, borderRadius: tk.radius.sm, color: active ? ct.color : T.text, fontSize: tk.font.base, fontWeight: active ? 700 : 400, padding: '8px 14px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ fontSize: 19 }}>{ct.emoji}</span>
              <span>{ct.label}</span>
            </button>
          );
        })}
      </div>

      <Field label="Heure planifiée">
        <input type="time" value={plannedTime} onChange={e => setPlannedTime(e.target.value)}
          style={{ ...s.input, width: 140, boxSizing: 'border-box', height: tk.touch.input, fontSize: tk.font.base }} />
      </Field>
      <Field label="Libellé (optionnel)">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder={ct.label} />
      </Field>
      <Field label="Note (optionnel)">
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte…" />
      </Field>
    </Sheet>
  );
}

// ─── Modal ajout RDV/info ─────────────────────────────────────────────────────

function AddRdvModal({ patient, infoFields, onAdd, onClose }) {
  const [fieldId, setFieldId] = useState(infoFields[0]?.id || '');
  const [value,   setValue]   = useState('');

  if (!infoFields.length) return null;

  return (
    <Sheet
      title="RDV / Information"
      icon="📅"
      subtitle={patient.initials}
      onClose={onClose}
      zIndex={200}
      footer={
        <Btn color={T.info} size="lg" full icon="📅" disabled={!fieldId || !value.trim()}
          onClick={() => { if (fieldId && value.trim()) { onAdd(fieldId, value.trim()); onClose(); } }}>
          Enregistrer
        </Btn>
      }
    >
      <Field label="Champ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {infoFields.map(f => (
            <button key={f.id} onClick={() => setFieldId(f.id)}
              style={{ background: fieldId === f.id ? T.infoDim : T.bg, border: `1.5px solid ${fieldId === f.id ? T.info : T.border}`, borderRadius: tk.radius.sm, color: fieldId === f.id ? T.info : T.text, fontSize: tk.font.base, fontWeight: fieldId === f.id ? 700 : 400, minHeight: tk.touch.min, padding: '8px 14px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Valeur">
        <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Ex: Scanner 14h, Kiné J3…" />
      </Field>
    </Sheet>
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
      if (f.category === 'flag')        return T.danger;
      if (f.category === 'info')        return T.info;
      if (f.category === 'observation') return '#06b6d4';
      if (f.category === 'constante')   return T.success;
      return T.muted;
    }

    return (
      <Sheet
        title="Ajouter un centre d'intérêt"
        icon="➕"
        onClose={onClose}
        zIndex={200}
      >
        <div style={{ marginBottom: 4 }}>
          <IconBtn label="Retour à la liste" onClick={() => { setView('list'); setSearch(''); }} fontSize={20} size={44}>←</IconBtn>
        </div>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" style={{ marginBottom: 12 }} />
        {filtered.length === 0 && (
          <div style={{ color: T.muted, fontSize: tk.font.sm, textAlign: 'center', marginTop: 16 }}>Aucun champ disponible</div>
        )}
        {filtered.map(f => (
          <button key={f.id} onClick={() => { onAddField(f); setView('list'); setSearch(''); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: tk.touch.min, marginBottom: 7, background: T.bg, border: `1px solid ${T.border}`, borderLeft: `3px solid ${catColor(f)}`, borderRadius: tk.radius.md, color: T.text, padding: '10px 14px', textAlign: 'left', fontSize: tk.font.base, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            <span>{f.label}</span>
            <span style={{ color: T.muted, fontSize: tk.font.xs, flexShrink: 0, marginLeft: 8 }}>{f.persistent ? '📌 séjour' : '🔄 journalier'}</span>
          </button>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Centres d'intérêt"
      icon="🎯"
      subtitle={patient.initials}
      onClose={onClose}
      zIndex={200}
    >
      {customFields.length === 0 && (
        <div style={{ color: T.muted, fontSize: tk.font.sm, fontStyle: 'italic', marginBottom: 14, textAlign: 'center' }}>
          Aucun centre d'intérêt — ajoutez-en ci-dessous
        </div>
      )}

      {customFields.map(f => (
        <Field key={f.id} label={f.label}>
          <FieldInput
            field={f}
            value={f.persistent ? (patient.fieldValues || {})[f.id] : daily.fieldValues[f.id]}
            onChange={v => onFieldChange(patient, f.id, v)}
            accentColor="#a78bfa"
          />
        </Field>
      ))}

      <button onClick={() => setView('add')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.bg, border: '1.5px dashed rgba(167,139,250,0.5)', borderRadius: tk.radius.md, color: '#a78bfa', fontSize: tk.font.base, fontWeight: 600, minHeight: tk.touch.min, padding: '10px 14px', cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent' }}>
        <span style={{ fontSize: 19 }}>+</span>
        <span>Ajouter un centre d'intérêt</span>
      </button>
    </Sheet>
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
  const [sortMode,         setSortMode]         = useState('bed'); // 'bed' | 'next_care' | 'priority'
  const [notifDelay,       setNotifDelay]       = useState(() => {
    const saved = parseInt(localStorage.getItem(NOTIF_DELAY_KEY), 10);
    return NOTIF_DELAYS.includes(saved) ? saved : 15;
  });

  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  // ─── Chargement ─────────────────────────────────────────────────────────

  useEffect(() => { createNotifChannel(); }, []);

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
    if (!readOnly) {
      await secureSet(`daily_${service.id}_${selectedDate}`, nextAll, cryptoKey);
      toast(`Soin planifié à ${careData.plannedTime || '—'}`);
      if (careData.plannedTime) {
        const ct      = getCareType(careData.type);
        const bedLbl  = bedLabel[patient.bedNumber] ?? String(patient.bedNumber);
        scheduleCareNotif({
          careId:          newCare.id,
          label:           careData.label,
          emoji:           ct.emoji,
          patientInitials: patient.initials,
          bedLabel:        bedLbl,
          plannedTime:     careData.plannedTime,
          minutesBefore:   notifDelay,
        });
      }
    }
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

  function nextPendingTime(daily) {
    const pending = (daily?.careEntries || []).filter(e => !e.done && e.plannedTime);
    return pending.length ? pending.map(e => e.plannedTime).sort()[0] : '99:99';
  }

  const sortedPatients = [...patients].sort((a, b) => {
    if (sortMode === 'next_care') {
      return nextPendingTime(dailyData[a.id]).localeCompare(nextPendingTime(dailyData[b.id]));
    }
    if (sortMode === 'priority') {
      const aA = parseVitalAlerts(dailyData[a.id]?.careEntries || []);
      const bA = parseVitalAlerts(dailyData[b.id]?.careEntries || []);
      const score = x => -(x.filter(v => v.level === 'critical').length * 100 + x.filter(v => v.level === 'warning').length * 10);
      return score(aA) - score(bA);
    }
    const la = bedLabel[a.bedNumber] ?? String(a.bedNumber);
    const lb = bedLabel[b.bedNumber] ?? String(b.bedNumber);
    return la.localeCompare(lb, 'fr', { numeric: true });
  });

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 10px 8px', background: T.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconBtn label="Retour" onClick={onBack} fontSize={22}>←</IconBtn>
          <div>
            <div style={{ color: T.text, fontSize: tk.font.md, fontWeight: 700 }}>⚡ Saisie rapide — {formatDateLabel(selectedDate)}{readOnly ? ' 👁' : ''}</div>
            <div style={{ color: T.muted, fontSize: tk.font.xs }}>
              {service.name} · {sortedPatients.length} patients · {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tri + délai notif ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderBottom: `1px solid ${T.border}`, background: T.bg, flexWrap: 'wrap' }}>
        {[['bed', '🛏 Lit'], ['next_care', '⏰ Soin'], ['priority', '🔴 Urgence']].map(([mode, label]) => (
          <Chip key={mode} color={C} active={sortMode === mode} onClick={() => setSortMode(mode)}>
            {label}
          </Chip>
        ))}
        <Chip
          color={T.muted}
          onClick={() => {
            const next = NOTIF_DELAYS[(NOTIF_DELAYS.indexOf(notifDelay) + 1) % NOTIF_DELAYS.length];
            setNotifDelay(next);
            localStorage.setItem(NOTIF_DELAY_KEY, String(next));
          }}
          style={{ marginLeft: 'auto' }}
        >
          🔔 −{notifDelay} min
        </Chip>
      </div>

      {/* ── Bandeau lecture seule ── */}
      {readOnly && (
        <Banner kind="info" icon="🔒" style={{ margin: '8px 16px 0', marginBottom: 0 }}>
          Consultation uniquement — modifications désactivées pour cette date
        </Banner>
      )}

      {/* ── Patients ── */}
      <div style={{ padding: '10px 16px 60px' }}>

        {sortedPatients.length === 0 && (
          <EmptyState icon="🛏" text="Aucun patient présent dans ce service" sub="Admettez un patient depuis la vue service" />
        )}

        {sortedPatients.map(patient => {
          const daily        = dailyData[patient.id] || { fieldValues: {}, events: [], observations: '' };
          const flagEmoji    = activeFlagsEmoji(service.fields, patient.fieldValues, daily.fieldValues);
          const vitalAlerts  = parseVitalAlerts(daily.careEntries || []);
          const hasCritical  = vitalAlerts.some(a => a.level === 'critical');
          const events       = daily.events || [];

          return (
            <div key={patient.id} style={{
              background: T.surface,
              border: `1px solid ${hasCritical ? T.danger + '88' : vitalAlerts.length > 0 ? T.warning + '88' : T.border}`,
              borderLeft: `3px solid ${hasCritical ? T.danger : vitalAlerts.length > 0 ? T.warning : readOnly ? T.border : sp.color}`,
              borderRadius: tk.radius.lg, padding: '14px 14px 12px',
              marginBottom: 12,
              opacity: readOnly ? 0.72 : 1,
            }}>

              {/* ─ En-tête patient ─ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: vitalAlerts.length > 0 ? 6 : 10 }}>
                <span style={{ color: bedLabel[patient.bedNumber] == null ? T.warning : T.muted, fontSize: tk.font.sm, fontWeight: 700, minWidth: 46 }}>
                  🛏 {bedLabel[patient.bedNumber] ?? `⚠️${patient.bedNumber}`}
                </span>
                <span style={{ color: T.text, fontSize: tk.font.md, fontWeight: 800 }}>{patient.initials}</span>
                <span style={{ color: T.muted, fontSize: tk.font.sm }}>{patient.gender} {patient.age}a</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                  {flagEmoji.map((e, i) => <span key={i} style={{ fontSize: 16 }}>{e}</span>)}
                  {onNavigate && (
                    <IconBtn label="Ouvrir la fiche patient" onClick={() => onNavigate(patient.id)} fontSize={20} size={44} style={{ margin: '-10px -10px -10px 0' }}>›</IconBtn>
                  )}
                </div>
              </div>

              {/* ─ Alertes constantes ─ */}
              {vitalAlerts.map((a, i) => (
                <div key={i} style={{ background: a.level === 'critical' ? T.dangerDim : T.warningDim, border: `1px solid ${a.level === 'critical' ? T.danger : T.warning}55`, borderRadius: tk.radius.sm, padding: '6px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{a.level === 'critical' ? '🔴' : '🟠'}</span>
                  <span style={{ color: a.level === 'critical' ? T.danger : T.warning, fontSize: tk.font.sm, fontWeight: 700 }}>{a.msg}</span>
                </div>
              ))}

              {/* Motif abrégé */}
              {patient.admissionReason && (
                <div style={{ color: T.muted, fontSize: tk.font.xs, marginBottom: 10, marginLeft: 54, fontStyle: 'italic' }}>
                  {patient.admissionReason.length > 60 ? patient.admissionReason.slice(0, 60) + '…' : patient.admissionReason}
                </div>
              )}

              {/* ─ Constantes (champs journaliers) ─ */}
              {constFields.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: 600, marginBottom: 6 }}>Constantes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {constFields.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: T.muted, fontSize: tk.font.xs }}>{f.label}:</span>
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
                    <div key={ev.id} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                      <span style={{ color: T.success, fontSize: tk.font.xs, fontWeight: 700, minWidth: 38 }}>{ev.time}</span>
                      <span style={{ color: T.text, fontSize: tk.font.sm }}>{ev.text}</span>
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
                  style={{ ...s.input, flex: 1, boxSizing: 'border-box', fontSize: tk.font.sm, height: tk.touch.min }}
                />
                <button
                  onClick={() => addQuickEvent(patient.id)}
                  disabled={!(eventInputs[patient.id] || '').trim()}
                  aria-label="Ajouter l'événement"
                  style={{
                    background:    T.successDim, border: `1px solid ${T.success}44`,
                    borderRadius:  tk.radius.md, color: T.success, fontSize: 22,
                    width: tk.touch.min, height: tk.touch.min, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    opacity: (eventInputs[patient.id] || '').trim() ? 1 : 0.35,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >+</button>
              </div>

              {/* ─ Boutons planifier soin / RDV / Centre d'intérêt ─ */}
              {!readOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setAddCareFor(patient)}
                    style={{ flex: 1, background: T.dangerDim, border: `1px solid ${T.danger}33`, borderRadius: tk.radius.md, color: T.danger, fontSize: tk.font.sm, fontWeight: 600, minHeight: 44, padding: '6px 4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    💊 Soin
                  </button>
                  {service.fields.some(f => f.category === 'info') && (
                    <button onClick={() => setAddRdvFor(patient)}
                      style={{ flex: 1, background: T.infoDim, border: `1px solid ${T.info}33`, borderRadius: tk.radius.md, color: T.info, fontSize: tk.font.sm, fontWeight: 600, minHeight: 44, padding: '6px 4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      📅 RDV / Info
                    </button>
                  )}
                  <button onClick={() => setCentreInteretFor(patient)}
                    style={{ flex: 1, background: '#a78bfa15', border: '1px solid #a78bfa33', borderRadius: tk.radius.md, color: '#a78bfa', fontSize: tk.font.sm, fontWeight: 600, minHeight: 44, padding: '6px 4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
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
