/**
 * PatientSheet.jsx — Aide-Mémoire v4
 * Tab bar bas · nav chambre · sans redondance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { T, tk, SOLID, loadDarkPref } from '../../theme.js';
import { Btn, IconBtn, Field, Input, Textarea, Banner, Sheet, toast } from '../../ui/index.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr, genId, isFlagActive, FieldInput, isReadOnly, formatDateLabel, parseVitalAlerts } from './utils.jsx';
import { getSpecialty, SPECIALTIES, getAllFieldsAlpha } from './templates.js';
import CareSchedule from './CareSchedule.jsx';
import WoundPhotos, { deleteAllWoundPhotos } from './WoundPhotos.jsx';
import { computeSlots } from './ServiceView.jsx';

// ─── Palette étendue ──────────────────────────────────────────────────────────
const P = new Proxy({}, {
  get(_, key) {
    const dark = loadDarkPref();
    return {
      glass:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      glassBdr: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)',
      grad:     dark ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #0c1a2e 100%)' : T.bg,
    }[key];
  }
});

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: color || T.muted, fontSize: tk.font.sm, fontWeight: tk.weight.bold, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${color || T.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ field, value, onChange, accentColor }) {
  return (
    <Field label={field.label}>
      <FieldInput field={field} value={value} onChange={onChange} accentColor={accentColor} />
    </Field>
  );
}

function InfoBlock({ label, value }) {
  return (
    <Field label={label}>
      <div style={{ color: T.text, fontSize: tk.font.base, background: P.glass, backdropFilter: 'blur(8px)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${P.glassBdr}` }}>
        {value || <span style={{ color: T.muted }}>—</span>}
      </div>
    </Field>
  );
}

// ─── Modal édition patient ────────────────────────────────────────────────────

function EditPatientModal({ patient, onSave, onClose }) {
  const [form, setForm] = useState({
    initials: patient.initials,
    age:      String(patient.age),
    gender:   patient.gender,
    reason:   patient.admissionReason || '',
    atcd:     patient.atcd || '',
  });

  function handleSave() {
    if (!form.initials.trim() || !form.age) return;
    onSave({
      initials: form.initials.trim().toUpperCase(),
      age: Number(form.age),
      gender: form.gender,
      admissionReason: form.reason.trim(),
      atcd: form.atcd.trim(),
    });
    onClose();
  }

  return (
    <Sheet title="Modifier le patient" icon="✏️" onClose={onClose} zIndex={200}
      footer={
        <Btn color={SOLID.info} size="lg" full disabled={!form.initials.trim() || !form.age} onClick={handleSave}>
          Enregistrer
        </Btn>
      }>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Initiales" style={{ flex: 1 }}>
          <Input value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value }))} maxLength={5} />
        </Field>
        <Field label="Sexe">
          <div style={{ display: 'flex', gap: 8 }}>
            {['M', 'F'].map(g => (
              <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))} style={{
                background: form.gender === g ? '#8b5cf633' : T.bg,
                border: `1px solid ${form.gender === g ? '#8b5cf6' : T.border}`,
                borderRadius: tk.radius.sm, color: form.gender === g ? '#8b5cf6' : T.muted,
                fontWeight: 700, fontSize: tk.font.base, width: tk.touch.input, height: tk.touch.input, cursor: 'pointer',
                fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
              }}>{g}</button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Âge">
        <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
          inputMode="numeric" style={{ width: 110 }} />
      </Field>
      <Field label="Motif d'hospitalisation">
        <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
      </Field>
      <Field label="ATCD / Particularités">
        <Input value={form.atcd} onChange={e => setForm(f => ({ ...f, atcd: e.target.value }))} />
      </Field>
    </Sheet>
  );
}

// ─── Modal changement de chambre ──────────────────────────────────────────────

function MoveBedModal({ patient, service, occupiedBeds, onMove, onClose }) {
  const [selected, setSelected] = useState(null);
  const slots = computeSlots(service);

  function slotIcon(icon) {
    if (icon === 'door')   return '🚪';
    if (icon === 'window') return '🪟';
    return '🛏';
  }

  const currentSlot = slots.find(sl => sl.slotIndex === patient.bedNumber);
  const currentLabel = currentSlot
    ? (currentSlot.icon ? `${currentSlot.roomLabel} ${slotIcon(currentSlot.icon)}` : currentSlot.roomLabel)
    : String(patient.bedNumber);

  const selectedSlot = slots.find(sl => sl.slotIndex === selected);
  const selectedLabel = selectedSlot
    ? (selectedSlot.icon ? `${selectedSlot.roomLabel} ${slotIcon(selectedSlot.icon)}` : selectedSlot.roomLabel)
    : '—';

  return (
    <Sheet title="Changer de chambre" icon="↔" onClose={onClose} zIndex={200}
      subtitle={`${patient.initials} — actuellement ${currentLabel}`}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn color={SOLID.info} size="lg" full disabled={!selected}
            onClick={() => { if (selected) { onMove(selected); onClose(); } }}>
            Déplacer vers {selectedLabel}
          </Btn>
          <Btn variant="outline" color={T.muted} full onClick={() => { onMove(null); onClose(); }}>
            Retirer du lit (sans lit attribué)
          </Btn>
        </div>
      }>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {slots.map(slot => {
          const isCurrent  = slot.slotIndex === patient.bedNumber;
          const isOccupied = occupiedBeds.includes(slot.slotIndex) && !isCurrent;
          const isSel      = selected === slot.slotIndex;
          const icon       = slotIcon(slot.icon);
          const label      = slot.icon ? `${slot.roomLabel} ${icon}` : slot.roomLabel;
          return (
            <button key={slot.slotIndex} disabled={isOccupied || isCurrent}
              onClick={() => setSelected(isSel ? null : slot.slotIndex)}
              style={{
                background:   isSel ? T.infoDim : P.glass,
                border:       `1px solid ${isSel ? T.info : isCurrent ? T.info + '44' : P.glassBdr}`,
                borderRadius: 10, padding: '10px 4px', minHeight: tk.touch.min,
                color:        isOccupied ? T.muted : isCurrent ? T.info : T.text,
                fontSize: tk.font.xs, cursor: isOccupied || isCurrent ? 'default' : 'pointer',
                opacity: isOccupied ? 0.4 : 1, textAlign: 'center', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <div style={{ fontSize: 16 }}>{icon}</div>
              <div style={{ fontWeight: 700 }}>{slot.roomLabel}</div>
              {slot.icon && <div style={{ color: T.muted, fontSize: tk.font.xs }}>{label}</div>}
              <div style={{ color: T.muted, fontSize: tk.font.xs }}>{isCurrent ? 'Actuel' : isOccupied ? 'Occupé' : 'Libre'}</div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ─── Modal centres d'intérêt ──────────────────────────────────────────────────

function AddCustomFieldModal({ service, patient, onAdd, onClose }) {
  const [search, setSearch] = useState('');

  const existingIds = new Set([
    ...service.fields.map(f => f.id),
    ...(patient.customFields || []).map(f => f.id),
  ]);

  const allFields = getAllFieldsAlpha().filter(f => !existingIds.has(f.id));
  const filtered = search.trim()
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
    <Sheet title="Centre d'intérêt" icon="➕" onClose={onClose} zIndex={200}>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
        style={{ marginBottom: 12 }} />
      {filtered.length === 0 && (
        <div style={{ color: T.muted, fontSize: tk.font.sm, textAlign: 'center', marginTop: 20 }}>Aucun champ disponible</div>
      )}
      {filtered.map(f => (
        <button key={f.id} onClick={() => { onAdd(f); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', minHeight: tk.touch.min, marginBottom: 7, background: P.glass,
            border: `1px solid ${P.glassBdr}`, borderLeft: `3px solid ${catColor(f)}`,
            borderRadius: 10, color: T.text, padding: '11px 14px', textAlign: 'left',
            fontSize: tk.font.base, cursor: 'pointer', boxSizing: 'border-box',
            fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          }}>
          <span>{f.label}</span>
          <span style={{ color: T.muted, fontSize: tk.font.xs, flexShrink: 0, marginLeft: 8 }}>
            {f.persistent ? '📌 séjour' : '🔄 journalier'}
          </span>
        </button>
      ))}
    </Sheet>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PatientSheet({ selectedDate: selDate, patientId, service, cryptoKey, accentColor, onBack, onNavigate }) {
  const C  = accentColor;
  const sp = getSpecialty(service.specialty);

  const [patient,      setPatient]      = useState(null);
  const [dailyEntry,   setDailyEntry]   = useState({ fieldValues: {}, events: [], observations: '', careEntries: [] });
  const [loading,      setLoading]      = useState(true);
  const [newEvent,     setNewEvent]     = useState('');
  const [confirmExit,  setConfirmExit]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showMove,     setShowMove]     = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [activeTab,    setActiveTab]    = useState(0);
  const [allPatients,  setAllPatients]  = useState([]);

  const swipeRef = useRef({});
  const [slideDir, setSlideDir] = useState(null);
  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pts   = await secureGet(`patients_${service.id}`, cryptoKey) || [];
      const found = pts.find(p => p.id === patientId);
      if (!found) { onBack(); return; }
      setPatient(found);
      setAllPatients(pts);
      const daily = await secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey) || {};
      setDailyEntry(daily[patientId] || { fieldValues: {}, events: [], observations: '', careEntries: [] });
    } finally { setLoading(false); }
  }, [patientId, service.id, cryptoKey, today]);

  useEffect(() => { loadData(); }, [loadData]);

  async function savePatientData(updatedPatient) {
    const pts = await secureGet(`patients_${service.id}`, cryptoKey) || [];
    if (pts.length === 0 && allPatients.length > 0) {
      // Decryption returned empty — fall back to in-memory list to avoid wiping all patients
      const updated = allPatients.map(p => p.id === patientId ? updatedPatient : p);
      setPatient(updatedPatient);
      setAllPatients(updated);
      await secureSet(`patients_${service.id}`, updated, cryptoKey);
      return;
    }
    const updated = pts.map(p => p.id === patientId ? updatedPatient : p);
    setPatient(updatedPatient);
    setAllPatients(updated);
    await secureSet(`patients_${service.id}`, updated, cryptoKey);
  }

  async function saveDailyEntry(nextEntry) {
    const daily = await secureGet(`daily_${service.id}_${today}`, cryptoKey) || {};
    setDailyEntry(nextEntry);
    await secureSet(`daily_${service.id}_${selectedDate}`, { ...daily, [patientId]: nextEntry }, cryptoKey);
  }

  async function savePersistentField(fieldId, value) {
    await savePatientData({ ...patient, fieldValues: { ...patient.fieldValues, [fieldId]: value } });
  }

  async function saveDailyField(fieldId, value) {
    await saveDailyEntry({ ...dailyEntry, fieldValues: { ...dailyEntry.fieldValues, [fieldId]: value } });
  }

  async function addEvent() {
    const text = newEvent.trim();
    if (!text) return;
    setNewEvent('');
    await saveDailyEntry({ ...dailyEntry, events: [...(dailyEntry.events || []), { id: genId(), time: timeStr(), text }] });
  }

  async function removeEvent(id) {
    await saveDailyEntry({ ...dailyEntry, events: (dailyEntry.events || []).filter(e => e.id !== id) });
  }

  async function handleDischarge() {
    setSaving(true);
    try {
      await deleteAllWoundPhotos(service.id, patient.id);
      await savePatientData({ ...patient, present: false, dischargedAt: Date.now() });
      toast('Patient sorti');
      onBack();
    } finally { setSaving(false); setConfirmExit(false); }
  }

  if (loading) return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: tk.font.base }}>Chargement…</span>
    </div>
  );

  if (!patient) return null;

  const allFields   = [...service.fields, ...(patient.customFields || [])];
  const flagFields  = allFields.filter(f => f.category === 'flag');
  const infoFields  = allFields.filter(f => f.category === 'info');
  const obsFields   = allFields.filter(f => f.category === 'observation');
  const constFields = allFields.filter(f => f.category === 'constante');

  const activeFlags = flagFields.filter(f => {
    const v = f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id];
    return isFlagActive(f, v);
  });

  const occupiedBeds = allPatients.filter(p => p.present && p.id !== patientId).map(p => p.bedNumber);

  const pendingCare  = (dailyEntry.careEntries || []).filter(e => !e.done).length;
  const vitalAlerts  = parseVitalAlerts(dailyEntry.careEntries || []);
  const totalAlerts  = activeFlags.length + vitalAlerts.length;

  const TABS = [
    { label: '🏥', name: 'Séjour',      idx: 0, badge: totalAlerts > 0 ? totalAlerts : null },
    { label: '📋', name: 'Journalier',  idx: 1, badge: pendingCare > 0 ? pendingCare : null },
    { label: '🎯', name: 'Centres',     idx: 2 },
    { label: '📝', name: 'Événements',  idx: 3 },
    { label: '🩹', name: 'Plaies',      idx: 4 },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: P.grad, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      onTouchStart={e => { swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!onNavigate) return;
        const dx = e.changedTouches[0].clientX - (swipeRef.current.x || 0);
        const dy = e.changedTouches[0].clientY - (swipeRef.current.y || 0);
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const present = allPatients.filter(p => p.present).sort((a,b) => a.bedNumber - b.bedNumber);
        const idx = present.findIndex(p => p.id === patientId);
        if (dx < 0 && present[idx + 1]) {
          setSlideDir('left');
          setTimeout(() => { onNavigate(present[idx + 1].id); setSlideDir(null); }, 220);
        }
        if (dx > 0 && present[idx - 1]) {
          setSlideDir('right');
          setTimeout(() => { onNavigate(present[idx - 1].id); setSlideDir(null); }, 220);
        }
      }}
    >
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideLeft{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-40px)}}
        @keyframes slideRight{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, zIndex: 20, background: loadDarkPref() ? 'rgba(10,15,26,0.92)' : T.surface, backdropFilter: loadDarkPref() ? 'blur(16px)' : 'none', borderBottom: `1px solid ${T.border}` }}>

        {/* Ligne 1 : retour + infos + edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px', overflow: 'hidden' }}>
          <IconBtn label="Retour" size={44} fontSize={22} onClick={onBack}>←</IconBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {patient.initials}
            </div>
            <div style={{ color: T.muted, fontSize: tk.font.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {patient.gender} · {patient.age}a · {(computeSlots(service).find(sl => sl.slotIndex === patient.bedNumber) || {}).roomLabel || `Ch.${patient.bedNumber}`}
            </div>
          </div>
          <IconBtn label="Modifier le patient" size={44} fontSize={16} variant="outline" onClick={() => setShowEdit(true)}>✏️</IconBtn>
          <span style={{ background: sp.color + '22', border: `1px solid ${sp.color}44`, borderRadius: 6, color: sp.color, fontSize: tk.font.xs, padding: '3px 8px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {sp.label.split(' ')[0]}
          </span>
        </div>

        {/* Ligne 2 : nav chambre */}
        {onNavigate && (() => {
          const present = allPatients.filter(p => p.present).sort((a, b) => a.bedNumber - b.bedNumber);
          const idx = present.findIndex(p => p.id === patientId);
          const prev = present[idx - 1];
          const next = present[idx + 1];
          return (
            <div style={{ display: 'flex', alignItems: 'stretch', padding: '0 12px 8px', gap: 0 }}>
              <button onClick={() => prev && onNavigate(prev.id)} disabled={!prev}
                style={{ background: prev ? P.glass : 'transparent', border: `1px solid ${prev ? P.glassBdr : 'transparent'}`, borderRadius: '10px 0 0 10px', color: prev ? T.text : T.border, fontSize: tk.font.xs, fontWeight: 600, padding: '6px 10px', minHeight: 44, cursor: prev ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 56, fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                <span style={{ fontSize: 16 }}>‹</span>
                {prev && <span style={{ maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prev.initials}</span>}
              </button>
              <select onChange={e => onNavigate(e.target.value)} value={patientId}
                style={{ flex: 1, background: loadDarkPref() ? 'rgba(15,23,42,0.8)' : T.surface, border: `1px solid ${T.border}`, borderLeft: 'none', borderRight: 'none', color: T.text, fontSize: tk.font.sm, fontWeight: 600, padding: '7px 10px', minHeight: 44, cursor: 'pointer', minWidth: 0 }}>
                {present.map(pt => {
                  const slot = computeSlots(service).find(sl => sl.slotIndex === pt.bedNumber);
                  return <option key={pt.id} value={pt.id}>{pt.initials} — {slot ? slot.roomLabel : `Ch.${pt.bedNumber}`}</option>;
                })}
              </select>
              <button onClick={() => next && onNavigate(next.id)} disabled={!next}
                style={{ background: next ? P.glass : 'transparent', border: `1px solid ${next ? P.glassBdr : 'transparent'}`, borderRadius: '0 10px 10px 0', color: next ? T.text : T.border, fontSize: tk.font.xs, fontWeight: 600, padding: '6px 10px', minHeight: 44, cursor: next ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 56, justifyContent: 'flex-end', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                {next && <span style={{ maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.initials}</span>}
                <span style={{ fontSize: 16 }}>›</span>
              </button>
            </div>
          );
        })()}

        {/* Alertes actives (masquées sur l'onglet Séjour qui les affiche déjà) */}
        {(activeFlags.length > 0 || vitalAlerts.length > 0) && activeTab !== 0 && (
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
            {vitalAlerts.map((a, i) => (
              <span key={`v${i}`} style={{ background: a.level === 'critical' ? T.dangerDim : T.warningDim, border: `1px solid ${a.level === 'critical' ? T.danger : T.warning}44`, borderRadius: 6, color: a.level === 'critical' ? T.danger : T.warning, fontSize: tk.font.xs, padding: '3px 8px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {a.level === 'critical' ? '🔴' : '🟠'} {a.msg}
              </span>
            ))}
            {activeFlags.map(f => {
              const v = f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id];
              const lbl = f.type === 'text' ? `${f.label}: ${v}` : f.type === 'select' ? `${f.label.split(' ')[0]} ${v}` : f.label;
              return <span key={f.id} style={{ background: T.dangerDim, border: `1px solid ${T.danger}44`, borderRadius: 6, color: T.danger, fontSize: tk.font.xs, padding: '3px 8px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{lbl}</span>;
            })}
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 16px', animation: slideDir === 'left' ? 'slideLeft 0.22s ease forwards' : slideDir === 'right' ? 'slideRight 0.22s ease forwards' : 'fadeUp 0.2s ease' }}>

        {/* TAB 0 — SÉJOUR + ALERTES */}
        {activeTab === 0 && (
          <>
            <Section title="SÉJOUR" color={sp.color}>
              <InfoBlock label="Motif d'hospitalisation" value={patient.admissionReason} />
              <InfoBlock label="ATCD / Particularités"   value={patient.atcd} />
              {infoFields.filter(f => f.persistent).map(f => (
                <FieldRow key={f.id} field={f} accentColor={C}
                  value={patient.fieldValues[f.id]} onChange={v => savePersistentField(f.id, v)} />
              ))}
            </Section>

            <Section title="ALERTES / RISQUES" color={T.danger}>
              {/* Alertes constantes vitales automatiques */}
              {vitalAlerts.map((a, i) => (
                <Banner key={i} kind={a.level === 'critical' ? 'danger' : 'warning'} icon={a.level === 'critical' ? '🔴' : '🟠'}>
                  {a.msg}
                </Banner>
              ))}
              {flagFields.length === 0 && vitalAlerts.length === 0 && (
                <div style={{ color: T.muted, fontSize: tk.font.sm, fontStyle: 'italic' }}>Aucune alerte active</div>
              )}
              {flagFields.map(f => (
                <FieldRow key={f.id} field={f} accentColor={T.danger}
                  value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                  onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
              ))}
            </Section>

            {/* Actions séjour */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <Btn variant="soft" color={T.info} full icon="↔" onClick={() => setShowMove(true)}>
                Changer de chambre
              </Btn>
              {!confirmExit ? (
                <Btn variant="soft" color={T.danger} full icon="🚪" onClick={() => setConfirmExit(true)}>
                  Sortie du patient
                </Btn>
              ) : (
                <div style={{ background: T.dangerDim, border: `1px solid ${T.danger}44`, borderRadius: tk.radius.lg, padding: 16 }}>
                  <div style={{ color: T.text, fontSize: tk.font.base, marginBottom: 12, textAlign: 'center' }}>
                    Confirmer la sortie de <strong>{patient.initials}</strong> ?
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn variant="outline" color={T.muted} onClick={() => setConfirmExit(false)} style={{ flex: 1 }}>
                      Annuler
                    </Btn>
                    <Btn color={SOLID.danger} disabled={saving} onClick={handleDischarge} style={{ flex: 1 }}>
                      {saving ? '…' : 'Confirmer'}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 1 — JOURNALIER + SOINS */}
        {activeTab === 1 && (
          <>
            {(obsFields.length > 0 || infoFields.some(f => !f.persistent)) && (
              <Section title="JOURNALIER" color={C}>
                {infoFields.filter(f => !f.persistent).map(f => (
                  <FieldRow key={f.id} field={f} accentColor={C}
                    value={dailyEntry.fieldValues[f.id]} onChange={v => saveDailyField(f.id, v)} />
                ))}
                {obsFields.map(f => (
                  <FieldRow key={f.id} field={f} accentColor={C}
                    value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                    onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
                ))}
                <Field label="Notes libres du jour">
                  <Textarea value={dailyEntry.observations} onChange={e => saveDailyEntry({ ...dailyEntry, observations: e.target.value })}
                    placeholder="Observations, transmissions…" rows={3} />
                </Field>
              </Section>
            )}
            {constFields.length > 0 && (
              <Section title="CONSTANTES" color="#06b6d4">
                {constFields.map(f => (
                  <FieldRow key={f.id} field={f} accentColor="#06b6d4"
                    value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                    onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
                ))}
              </Section>
            )}
            <Section title="SOINS PROGRAMMÉS" color={T.warning}>
              <CareSchedule
                careEntries={dailyEntry.careEntries || []}
                onEntriesChange={entries => saveDailyEntry({ ...dailyEntry, careEntries: entries })}
              />
            </Section>
            {obsFields.length === 0 && !infoFields.some(f => !f.persistent) && constFields.length === 0 && (
              <div style={{ color: T.muted, fontSize: tk.font.sm, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
                Aucun champ journalier configuré
              </div>
            )}
          </>
        )}

        {/* TAB 2 — CENTRES */}
        {activeTab === 2 && (
          <Section title="CENTRES D'INTÉRÊT PATIENT" color="#a78bfa">
            {(patient.customFields || []).length === 0 && (
              <div style={{ color: T.muted, fontSize: tk.font.sm, fontStyle: 'italic', marginBottom: 10 }}>Aucun centre d'intérêt additionnel</div>
            )}
            {(patient.customFields || []).map(f => (
              <div key={f.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: tk.weight.semi }}>{f.label}</span>
                  <IconBtn label={`Retirer ${f.label}`} size={44} fontSize={18}
                    onClick={() => savePatientData({ ...patient, customFields: patient.customFields.filter(cf => cf.id !== f.id) })}
                    style={{ margin: '-14px -12px -14px 0' }}>×</IconBtn>
                </div>
                <FieldInput field={f} accentColor="#a78bfa"
                  value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                  onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
              </div>
            ))}
            <button onClick={() => setShowAddField(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: tk.touch.min, background: P.glass, border: '1px dashed rgba(167,139,250,0.4)', borderRadius: tk.radius.md, color: '#a78bfa', fontSize: tk.font.base, padding: '11px 14px', cursor: 'pointer', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 18 }}>+</span>
              <span>Ajouter un centre d'intérêt</span>
            </button>
          </Section>
        )}

        {/* TAB 3 — ÉVÉNEMENTS */}
        {activeTab === 3 && (
          <Section title="ÉVÉNEMENTS DU JOUR" color={T.success}>
            {(dailyEntry.events || []).length === 0 && (
              <div style={{ color: T.muted, fontSize: tk.font.sm, fontStyle: 'italic', marginBottom: 10 }}>Aucun événement</div>
            )}
            {(dailyEntry.events || []).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: P.glass, border: `1px solid ${P.glassBdr}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <span style={{ color: T.success, fontSize: tk.font.xs, fontWeight: 700, minWidth: 40, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{ev.time}</span>
                <span style={{ color: T.text, fontSize: tk.font.base, flex: 1, marginTop: 1 }}>{ev.text}</span>
                <IconBtn label="Supprimer l'événement" size={44} fontSize={18} onClick={() => removeEvent(ev.id)}
                  style={{ margin: '-10px -10px -10px 0' }}>×</IconBtn>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Input value={newEvent} onChange={e => setNewEvent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
                placeholder="Nouvel événement…"
                style={{ flex: 1, width: 'auto' }} />
              <Btn color={SOLID.success} disabled={!newEvent.trim()} onClick={addEvent}
                style={{ padding: '0 16px', fontSize: 20 }}>+</Btn>
            </div>
          </Section>
        )}

        {/* TAB 4 — PLAIES */}
        {activeTab === 4 && (
          <WoundPhotos
            patient={patient}
            service={service}
            cryptoKey={cryptoKey}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* ── Tab bar bas ── */}
      <div style={{ flexShrink: 0, background: loadDarkPref() ? 'rgba(10,15,26,0.95)' : T.surface, backdropFilter: loadDarkPref() ? 'blur(16px)' : 'none', borderTop: `1px solid ${T.border}`, display: 'flex', zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}>
        {TABS.map(t => (
          <button key={t.idx} onClick={() => setActiveTab(t.idx)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '12px 2px 10px', minHeight: tk.touch.min, background: 'none', border: 'none', cursor: 'pointer', color: activeTab === t.idx ? T.info : T.muted, fontFamily: 'inherit', fontSize: tk.font.xs, fontWeight: activeTab === t.idx ? 700 : 400, position: 'relative', WebkitTapHighlightColor: 'transparent', transition: 'color 0.15s' }}>
            {activeTab === t.idx && (
              <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: T.info, borderRadius: '0 0 2px 2px' }} />
            )}
            <span style={{ fontSize: 22, lineHeight: 1, position: 'relative' }}>
              {t.label}
              {t.badge && (
                <span style={{ position: 'absolute', top: -6, right: -10, background: t.idx === 0 ? SOLID.danger : SOLID.warning, color: '#fff', fontSize: tk.font.xs, fontWeight: 800, borderRadius: tk.radius.pill, padding: '0 5px', lineHeight: 1.5 }}>{t.badge}</span>
              )}
            </span>
            {t.name}
          </button>
        ))}
      </div>

      {/* ── Modals ── */}
      {showEdit     && <EditPatientModal patient={patient} onSave={u => { savePatientData({ ...patient, ...u }); toast('Patient modifié'); }} onClose={() => setShowEdit(false)} />}
      {showMove     && <MoveBedModal patient={patient} service={service} occupiedBeds={occupiedBeds} onMove={n => savePatientData({ ...patient, bedNumber: n })} onClose={() => setShowMove(false)} />}
      {showAddField && <AddCustomFieldModal service={service} patient={patient} onAdd={f => savePatientData({ ...patient, customFields: [...(patient.customFields || []), { ...f, persistent: true }] })} onClose={() => setShowAddField(false)} />}
    </div>
  );
}
