/**
 * PatientSheet.jsx — Aide-Mémoire v4
 * Tab bar bas · nav chambre · sans redondance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { T, s, loadDarkPref } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr, genId, isFlagActive, FieldInput, isReadOnly, formatDateLabel } from './utils.jsx';
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
      <div style={{ color: color || T.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${color || T.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ field, value, onChange, accentColor }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 5 }}>{field.label}</div>
      <FieldInput field={field} value={value} onChange={onChange} accentColor={accentColor} />
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: T.muted, fontSize: 11, marginBottom: 5 }}>{label}</div>
      <div style={{ color: T.text, fontSize: 14, background: P.glass, backdropFilter: 'blur(8px)', borderRadius: 10, padding: '10px 14px', border: `1px solid ${P.glassBdr}` }}>
        {value || <span style={{ color: T.muted }}>—</span>}
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #111827 100%)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(139,92,246,0.3)', padding: '24px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>✏️ Modifier le patient</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...s.label, color: T.muted, marginBottom: 6 }}>INITIALES</div>
              <input value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value }))}
                maxLength={5} style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ ...s.label, color: T.muted, marginBottom: 6 }}>SEXE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['M', 'F'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))} style={{
                    background: form.gender === g ? '#8b5cf633' : T.bg,
                    border: `1px solid ${form.gender === g ? '#8b5cf6' : T.border}`,
                    borderRadius: 8, color: form.gender === g ? '#8b5cf6' : T.muted,
                    fontWeight: 700, fontSize: 15, width: 44, height: 44, cursor: 'pointer',
                  }}>{g}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ ...s.label, color: T.muted, marginBottom: 6 }}>ÂGE</div>
            <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              inputMode="numeric" style={{ ...s.input, width: 100, boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ ...s.label, color: T.muted, marginBottom: 6 }}>MOTIF D'HOSPITALISATION</div>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ ...s.label, color: T.muted, marginBottom: 6 }}>ATCD / PARTICULARITÉS</div>
            <input value={form.atcd} onChange={e => setForm(f => ({ ...f, atcd: e.target.value }))}
              style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleSave} disabled={!form.initials.trim() || !form.age}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: form.initials.trim() && form.age ? 1 : 0.4 }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #111827 100%)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(99,102,241,0.3)', padding: '24px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>↔ Changer de chambre</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
          {patient.initials} — actuellement {currentLabel}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
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
                  background:   isSel ? '#6366f133' : P.glass,
                  border:       `1px solid ${isSel ? '#6366f1' : isCurrent ? '#6366f144' : P.glassBdr}`,
                  borderRadius: 10, padding: '10px 4px',
                  color:        isOccupied ? T.muted : isCurrent ? '#6366f1' : T.text,
                  fontSize: 11, cursor: isOccupied || isCurrent ? 'default' : 'pointer',
                  opacity: isOccupied ? 0.4 : 1, textAlign: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontWeight: 700 }}>{slot.roomLabel}</div>
                {slot.icon && <div style={{ color: T.muted, fontSize: 9 }}>{label}</div>}
                <div style={{ color: T.muted, fontSize: 10 }}>{isCurrent ? 'Actuel' : isOccupied ? 'Occupé' : 'Libre'}</div>
              </button>
            );
          })}
        </div>
        <button onClick={() => { if (selected) { onMove(selected); onClose(); } }} disabled={!selected}
          style={{ background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : P.glass, border: 'none', borderRadius: 12, color: '#fff', padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', opacity: selected ? 1 : 0.4, marginBottom: 8 }}>
          Déplacer vers {selectedLabel}
        </button>
        <button onClick={() => { onMove(null); onClose(); }}
          style={{ background: 'none', border: `1px solid ${P.glassBdr}`, borderRadius: 12, color: T.muted, padding: '10px', fontSize: 13, cursor: 'pointer', width: '100%' }}>
          Retirer du lit (sans lit attribué)
        </button>
      </div>
    </div>
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
    if (f.category === 'flag')        return '#f43f5e';
    if (f.category === 'info')        return '#6366f1';
    if (f.category === 'observation') return '#06b6d4';
    if (f.category === 'constante')   return '#22c55e';
    return T.muted;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #111827 100%)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(167,139,250,0.3)', padding: '24px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>➕ Centre d'intérêt</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
        {filtered.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>Aucun champ disponible</div>
        )}
        {filtered.map(f => (
          <button key={f.id} onClick={() => { onAdd(f); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', marginBottom: 7, background: P.glass,
              border: `1px solid ${P.glassBdr}`, borderLeft: `3px solid ${catColor(f)}`,
              borderRadius: 10, color: T.text, padding: '11px 14px', textAlign: 'left',
              fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
            <span>{f.label}</span>
            <span style={{ color: T.muted, fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
              {f.persistent ? '📌 séjour' : '🔄 journalier'}
            </span>
          </button>
        ))}
      </div>
    </div>
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
      onBack();
    } finally { setSaving(false); setConfirmExit(false); }
  }

  if (loading) return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
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

  const pendingCare = (dailyEntry.careEntries || []).filter(e => !e.done).length;

  const TABS = [
    { label: '🏥', name: 'Séjour',      idx: 0, badge: activeFlags.length > 0 ? activeFlags.length : null },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px', overflow: 'hidden' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4, flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {patient.initials}
            </div>
            <div style={{ color: T.muted, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {patient.gender} · {patient.age}a · {(computeSlots(service).find(sl => sl.slotIndex === patient.bedNumber) || {}).roomLabel || `Ch.${patient.bedNumber}`}
            </div>
          </div>
          <button onClick={() => setShowEdit(true)}
            style={{ background: P.glass, border: `1px solid ${P.glassBdr}`, borderRadius: 8, color: T.muted, fontSize: 15, padding: '6px 10px', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
          <span style={{ background: sp.color + '22', border: `1px solid ${sp.color}44`, borderRadius: 6, color: sp.color, fontSize: 10, padding: '3px 8px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px 8px', gap: 0 }}>
              <button onClick={() => prev && onNavigate(prev.id)} disabled={!prev}
                style={{ background: prev ? P.glass : 'transparent', border: `1px solid ${prev ? P.glassBdr : 'transparent'}`, borderRadius: '10px 0 0 10px', color: prev ? T.text : T.border, fontSize: 11, fontWeight: 600, padding: '6px 10px', cursor: prev ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 56 }}>
                <span style={{ fontSize: 16 }}>‹</span>
                {prev && <span style={{ maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prev.initials}</span>}
              </button>
              <select onChange={e => onNavigate(e.target.value)} value={patientId}
                style={{ flex: 1, background: loadDarkPref() ? 'rgba(15,23,42,0.8)' : T.surface, border: `1px solid ${T.border}`, borderLeft: 'none', borderRight: 'none', color: T.text, fontSize: 13, fontWeight: 600, padding: '7px 10px', cursor: 'pointer', minWidth: 0 }}>
                {present.map(pt => {
                  const slot = computeSlots(service).find(sl => sl.slotIndex === pt.bedNumber);
                  return <option key={pt.id} value={pt.id}>{pt.initials} — {slot ? slot.roomLabel : `Ch.${pt.bedNumber}`}</option>;
                })}
              </select>
              <button onClick={() => next && onNavigate(next.id)} disabled={!next}
                style={{ background: next ? P.glass : 'transparent', border: `1px solid ${next ? P.glassBdr : 'transparent'}`, borderRadius: '0 10px 10px 0', color: next ? T.text : T.border, fontSize: 11, fontWeight: 600, padding: '6px 10px', cursor: next ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, minWidth: 56, justifyContent: 'flex-end' }}>
                {next && <span style={{ maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.initials}</span>}
                <span style={{ fontSize: 16 }}>›</span>
              </button>
            </div>
          );
        })()}

        {/* Alertes actives (masquées sur l'onglet Séjour qui les affiche déjà) */}
        {activeFlags.length > 0 && activeTab !== 0 && (
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
            {activeFlags.map(f => {
              const v = f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id];
              const lbl = f.type === 'text' ? `${f.label}: ${v}` : f.type === 'select' ? `${f.label.split(' ')[0]} ${v}` : f.label;
              return <span key={f.id} style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 6, color: '#f43f5e', fontSize: 11, padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{lbl}</span>;
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

            <Section title="ALERTES / RISQUES" color="#f43f5e">
              {flagFields.length === 0 && (
                <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic' }}>Aucun champ d'alerte configuré</div>
              )}
              {flagFields.map(f => (
                <FieldRow key={f.id} field={f} accentColor="#f43f5e"
                  value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                  onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
              ))}
            </Section>

            {/* Actions séjour */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowMove(true)}
                style={{ width: '100%', background: P.glass, border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#818cf8', padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                ↔ Changer de chambre
              </button>
              {!confirmExit ? (
                <button onClick={() => setConfirmExit(true)}
                  style={{ width: '100%', background: P.glass, border: '1px solid rgba(244,63,94,0.3)', borderRadius: 12, color: '#f43f5e', padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                  🚪 Sortie du patient
                </button>
              ) : (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 14, padding: 16 }}>
                  <div style={{ color: T.text, fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
                    Confirmer la sortie de <strong>{patient.initials}</strong> ?
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirmExit(false)}
                      style={{ flex: 1, background: P.glass, border: `1px solid ${P.glassBdr}`, borderRadius: 10, color: T.text, padding: '11px', fontSize: 14, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button onClick={handleDischarge} disabled={saving}
                      style={{ flex: 1, background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', borderRadius: 10, color: '#fff', padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? '…' : 'Confirmer'}
                    </button>
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
                <div>
                  <div style={{ color: T.muted, fontSize: 11, marginBottom: 5 }}>Notes libres du jour</div>
                  <textarea value={dailyEntry.observations} onChange={e => saveDailyEntry({ ...dailyEntry, observations: e.target.value })}
                    placeholder="Observations, transmissions…" rows={3}
                    style={{ ...s.input, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }} />
                </div>
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
            <Section title="SOINS PROGRAMMÉS" color="#f97316">
              <CareSchedule
                careEntries={dailyEntry.careEntries || []}
                onEntriesChange={entries => saveDailyEntry({ ...dailyEntry, careEntries: entries })}
              />
            </Section>
            {obsFields.length === 0 && !infoFields.some(f => !f.persistent) && constFields.length === 0 && (
              <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
                Aucun champ journalier configuré
              </div>
            )}
          </>
        )}

        {/* TAB 2 — CENTRES */}
        {activeTab === 2 && (
          <Section title="CENTRES D'INTÉRÊT PATIENT" color="#a78bfa">
            {(patient.customFields || []).length === 0 && (
              <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 }}>Aucun centre d'intérêt additionnel</div>
            )}
            {(patient.customFields || []).map(f => (
              <div key={f.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ color: T.muted, fontSize: 11 }}>{f.label}</span>
                  <button onClick={() => savePatientData({ ...patient, customFields: patient.customFields.filter(cf => cf.id !== f.id) })}
                    style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>×</button>
                </div>
                <FieldInput field={f} accentColor="#a78bfa"
                  value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                  onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
              </div>
            ))}
            <button onClick={() => setShowAddField(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: P.glass, border: '1px dashed rgba(167,139,250,0.4)', borderRadius: 12, color: '#a78bfa', fontSize: 14, padding: '11px 14px', cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 18 }}>+</span>
              <span>Ajouter un centre d'intérêt</span>
            </button>
          </Section>
        )}

        {/* TAB 3 — ÉVÉNEMENTS */}
        {activeTab === 3 && (
          <Section title="ÉVÉNEMENTS DU JOUR" color="#22c55e">
            {(dailyEntry.events || []).length === 0 && (
              <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 }}>Aucun événement</div>
            )}
            {(dailyEntry.events || []).map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: P.glass, border: `1px solid ${P.glassBdr}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700, minWidth: 38, marginTop: 1 }}>{ev.time}</span>
                <span style={{ color: T.text, fontSize: 13, flex: 1 }}>{ev.text}</span>
                <button onClick={() => removeEvent(ev.id)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newEvent} onChange={e => setNewEvent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
                placeholder="Nouvel événement…"
                style={{ ...s.input, flex: 1, boxSizing: 'border-box', fontSize: 14 }} />
              <button onClick={addEvent} disabled={!newEvent.trim()}
                style={{ background: newEvent.trim() ? 'linear-gradient(135deg, #22c55e, #16a34a)' : P.glass, border: 'none', borderRadius: 10, color: '#fff', padding: '0 16px', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newEvent.trim() ? 'pointer' : 'default', opacity: newEvent.trim() ? 1 : 0.4 }}>+</button>
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
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '12px 2px 10px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === t.idx ? '#818cf8' : T.muted, fontFamily: 'inherit', fontSize: 11, fontWeight: activeTab === t.idx ? 700 : 400, position: 'relative', WebkitTapHighlightColor: 'transparent', transition: 'color 0.15s' }}>
            {activeTab === t.idx && (
              <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '0 0 2px 2px' }} />
            )}
            <span style={{ fontSize: 22, lineHeight: 1, position: 'relative' }}>
              {t.label}
              {t.badge && (
                <span style={{ position: 'absolute', top: -4, right: -8, background: t.idx === 0 ? '#f43f5e' : '#f97316', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 8, padding: '1px 4px', lineHeight: 1.4 }}>{t.badge}</span>
              )}
            </span>
            {t.name}
          </button>
        ))}
      </div>

      {/* ── Modals ── */}
      {showEdit     && <EditPatientModal patient={patient} onSave={u => savePatientData({ ...patient, ...u })} onClose={() => setShowEdit(false)} />}
      {showMove     && <MoveBedModal patient={patient} service={service} occupiedBeds={occupiedBeds} onMove={n => savePatientData({ ...patient, bedNumber: n })} onClose={() => setShowMove(false)} />}
      {showAddField && <AddCustomFieldModal service={service} patient={patient} onAdd={f => savePatientData({ ...patient, customFields: [...(patient.customFields || []), { ...f, persistent: true }] })} onClose={() => setShowAddField(false)} />}
    </div>
  );
}
