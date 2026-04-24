/**
 * PatientSheet.jsx — Aide-Mémoire v3
 * Centres d'intérêt : liste plate alphabétique (toutes spécialités confondues)
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr, genId, isFlagActive, FieldInput } from './utils.jsx';
import { getSpecialty, SPECIALTIES, getAllFieldsAlpha } from './templates.js';
import CareSchedule from './CareSchedule.jsx';
import { computeSlots } from './ServiceView.jsx';

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ ...s.label, color: color || T.muted, marginBottom: 10, paddingLeft: 8, borderLeft: `3px solid ${color || T.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ field, value, onChange, accentColor }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: T.muted, fontSize: 12, marginBottom: 5 }}>{field.label}</div>
      <FieldInput field={field} value={value} onChange={onChange} accentColor={accentColor} />
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: T.muted, fontSize: 12, marginBottom: 5 }}>{label}</div>
      <div style={{ color: T.text, fontSize: 14, background: T.surface, borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
        {value || <span style={{ color: T.muted }}>—</span>}
      </div>
    </div>
  );
}

// ─── Modal édition infos patient ─────────────────────────────────────────────

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    background: form.gender === g ? '#6366f133' : T.bg,
                    border: `1px solid ${form.gender === g ? '#6366f1' : T.border}`,
                    borderRadius: 8, color: form.gender === g ? '#6366f1' : T.muted,
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
            style={{ ...s.btn('#6366f1'), width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, opacity: form.initials.trim() && form.age ? 1 : 0.4 }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal changement de chambre ─────────────────────────────────────────────

function MoveBedModal({ patient, service, occupiedBeds, onMove, onClose }) {
  const [selected, setSelected] = useState(null);

  // Utilise computeSlots() — source unique de vérité, identique à ServiceView
  const slots = computeSlots(service);

  function slotIcon(icon) {
    if (icon === 'door')   return '🚪';
    if (icon === 'window') return '🪟';
    return '🛏';
  }

  // Retrouver le label du slot actuel du patient
  const currentSlot = slots.find(sl => sl.slotIndex === patient.bedNumber);
  const currentLabel = currentSlot
    ? (currentSlot.icon ? `${currentSlot.roomLabel} ${slotIcon(currentSlot.icon)}` : currentSlot.roomLabel)
    : String(patient.bedNumber);

  const selectedSlot = slots.find(sl => sl.slotIndex === selected);
  const selectedLabel = selectedSlot
    ? (selectedSlot.icon ? `${selectedSlot.roomLabel} ${slotIcon(selectedSlot.icon)}` : selectedSlot.roomLabel)
    : '—';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>↔ Changer de chambre</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
          {patient.initials} — actuellement Ch.{currentLabel}
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
                  background:   isSel ? '#6366f133' : T.bg,
                  border:       `1px solid ${isSel ? '#6366f1' : isCurrent ? '#6366f144' : T.border}`,
                  borderRadius: 8, padding: '10px 4px',
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
          style={{ ...s.btn('#6366f1'), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: selected ? 1 : 0.4 }}>
          Déplacer vers Ch.{selectedLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Modal centres d'intérêt — liste plate alphabétique ──────────────────────

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

  // Couleur par catégorie
  function catColor(f) {
    if (f.category === 'flag')        return '#f43f5e';
    if (f.category === 'info')        return '#6366f1';
    if (f.category === 'observation') return '#06b6d4';
    if (f.category === 'constante')   return '#22c55e';
    return T.muted;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '88vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>➕ Centre d'intérêt</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Recherche */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
        />

        {filtered.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
            Aucun champ disponible
          </div>
        )}

        {filtered.map(f => (
          <button key={f.id} onClick={() => { onAdd(f); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', marginBottom: 7,
              background: T.bg, border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${catColor(f)}`,
              borderRadius: 9, color: T.text,
              padding: '11px 14px', textAlign: 'left', fontSize: 14,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
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

export default function PatientSheet({ patientId, service, cryptoKey, accentColor, onBack, onNavigate }) {
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
  const [allPatients,  setAllPatients]  = useState([]);

  const today = todayStr();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pts   = await secureGet(`patients_${service.id}`, cryptoKey) || [];
      const found = pts.find(p => p.id === patientId);
      if (!found) { onBack(); return; }
      setPatient(found);
      setAllPatients(pts);
      const daily = await secureGet(`daily_${service.id}_${today}`, cryptoKey) || {};
      setDailyEntry(daily[patientId] || { fieldValues: {}, events: [], observations: '', careEntries: [] });
    } finally {
      setLoading(false);
    }
  }, [patientId, service.id, cryptoKey, today]);

  useEffect(() => { loadData(); }, [loadData]);

  async function savePatientData(updatedPatient) {
    const pts     = await secureGet(`patients_${service.id}`, cryptoKey) || [];
    const updated = pts.map(p => p.id === patientId ? updatedPatient : p);
    setPatient(updatedPatient);
    setAllPatients(updated);
    await secureSet(`patients_${service.id}`, updated, cryptoKey);
  }

  async function saveDailyEntry(nextEntry) {
    const daily     = await secureGet(`daily_${service.id}_${today}`, cryptoKey) || {};
    setDailyEntry(nextEntry);
    await secureSet(`daily_${service.id}_${today}`, { ...daily, [patientId]: nextEntry }, cryptoKey);
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

  return (
    <div style={{ background: T.bg, minHeight: '100vh', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', background: T.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: T.text, fontSize: 20, fontWeight: 800 }}>{patient.initials}</span>
              <span style={{ color: T.muted, fontSize: 14 }}>{patient.gender} · {patient.age}a · Ch.{patient.bedNumber}</span>
        {/* Navigation patient */}
        {onNavigate && (() => {
          const present = allPatients.filter(p => p.present).sort((a,b) => a.bedNumber - b.bedNumber);
          const idx = present.findIndex(p => p.id === patientId);
          const prev = present[idx - 1];
          const next = present[idx + 1];
          return (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto', minWidth:0, overflow:'hidden' }}>
              <button onClick={() => prev && onNavigate(prev.id)} disabled={!prev}
                style={{ background:'none', border:`1px solid ${prev ? '#334155' : 'transparent'}`, borderRadius:7, color: prev ? '#f1f5f9' : '#334155', fontSize:16, padding:'4px 10px', cursor: prev ? 'pointer' : 'default' }}>‹</button>
              <select onChange={e => onNavigate(e.target.value)} value={patientId}
                style={{ background:'#111827', border:'1px solid #334155', borderRadius:7, color:'#f1f5f9', fontSize:12, padding:'4px 8px', cursor:'pointer' }}>
                {present.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.initials} — {(computeSlots(service).find(sl => sl.slotIndex === pt.bedNumber) || {}).roomLabel || pt.bedNumber}</option>
                ))}
              </select>
              <button onClick={() => next && onNavigate(next.id)} disabled={!next}
                style={{ background:'none', border:`1px solid ${next ? '#334155' : 'transparent'}`, borderRadius:7, color: next ? '#f1f5f9' : '#334155', fontSize:16, padding:'4px 10px', cursor: next ? 'pointer' : 'default' }}>›</button>
            </div>
          );
        })()}
            </div>
          </div>
          <button onClick={() => setShowEdit(true)}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 16, padding: '6px 10px', cursor: 'pointer' }}>✏️</button>
          <span style={{ background: sp.color + '22', border: `1px solid ${sp.color}44`, borderRadius: 6, color: sp.color, fontSize: 11, padding: '3px 8px', fontWeight: 700 }}>
            {sp.label.split(' ')[0]}
          </span>
        </div>
        {activeFlags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
            {activeFlags.map(f => {
              const v = f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id];
              const lbl = f.type === 'text' ? `${f.label}: ${v}` : f.type === 'select' ? `${f.label.split(' ')[0]} ${v}` : f.label;
              return (
                <span key={f.id} style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 6, color: '#f43f5e', fontSize: 11, padding: '2px 8px', fontWeight: 600 }}>
                  {lbl}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding: '16px 16px 80px' }}>

        <Section title="SÉJOUR" color={sp.color}>
          <InfoBlock label="Motif d'hospitalisation" value={patient.admissionReason} />
          <InfoBlock label="ATCD / Particularités"   value={patient.atcd} />
          {infoFields.filter(f => f.persistent).map(f => (
            <FieldRow key={f.id} field={f} accentColor={C}
              value={patient.fieldValues[f.id]} onChange={v => savePersistentField(f.id, v)} />
          ))}
        </Section>

        <Section title="ALERTES / RISQUES" color="#f43f5e">
          {flagFields.map(f => (
            <FieldRow key={f.id} field={f} accentColor="#f43f5e"
              value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
              onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
          ))}
        </Section>

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
              <div style={{ color: T.muted, fontSize: 12, marginBottom: 5 }}>Notes libres du jour</div>
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

        {/* Centres d'intérêt */}
        <Section title="CENTRES D'INTÉRÊT PATIENT" color="#a78bfa">
          {(patient.customFields || []).length === 0 && (
            <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 }}>
              Aucun centre d'intérêt additionnel
            </div>
          )}
          {(patient.customFields || []).map(f => (
            <div key={f.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: T.muted, fontSize: 12 }}>{f.label}</span>
                <button onClick={() => savePatientData({ ...patient, customFields: patient.customFields.filter(cf => cf.id !== f.id) })}
                  style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, cursor: 'pointer', padding: 0 }}>×</button>
              </div>
              <FieldInput field={f} accentColor="#a78bfa"
                value={f.persistent ? patient.fieldValues[f.id] : dailyEntry.fieldValues[f.id]}
                onChange={v => f.persistent ? savePersistentField(f.id, v) : saveDailyField(f.id, v)} />
            </div>
          ))}
          <button onClick={() => setShowAddField(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.surface, border: '1px dashed #a78bfa55',
              borderRadius: 9, color: '#a78bfa', fontSize: 14,
              padding: '9px 14px', cursor: 'pointer', width: '100%',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontSize: 18 }}>+</span>
            <span>Ajouter un centre d'intérêt</span>
          </button>
        </Section>

        {/* Événements du jour */}
        <Section title="ÉVÉNEMENTS DU JOUR" color="#22c55e">
          {(dailyEntry.events || []).length === 0 && (
            <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 }}>Aucun événement</div>
          )}
          {(dailyEntry.events || []).map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
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
              style={{ ...s.btn('#22c55e'), padding: '0 14px', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: newEvent.trim() ? 1 : 0.4 }}>+</button>
          </div>
        </Section>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setShowMove(true)}
            style={{ width: '100%', background: 'transparent', border: `1px solid #6366f144`, borderRadius: 10, color: '#6366f1', padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ↔ Changer de chambre
          </button>
          {!confirmExit ? (
            <button onClick={() => setConfirmExit(true)}
              style={{ width: '100%', background: 'transparent', border: `1px solid #f43f5e44`, borderRadius: 10, color: '#f43f5e', padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              🚪 Sortie du patient
            </button>
          ) : (
            <div style={{ background: '#f43f5e11', border: '1px solid #f43f5e33', borderRadius: 10, padding: 14 }}>
              <div style={{ color: T.text, fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
                Confirmer la sortie de <strong>{patient.initials}</strong> ?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmExit(false)}
                  style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: '10px', fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={handleDischarge} disabled={saving}
                  style={{ flex: 1, background: '#f43f5e', border: 'none', borderRadius: 8, color: '#fff', padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? '…' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit     && <EditPatientModal patient={patient} onSave={u => savePatientData({ ...patient, ...u })} onClose={() => setShowEdit(false)} />}
      {showMove     && <MoveBedModal patient={patient} service={service} occupiedBeds={occupiedBeds} onMove={n => savePatientData({ ...patient, bedNumber: n })} onClose={() => setShowMove(false)} />}
      {showAddField && <AddCustomFieldModal service={service} patient={patient} onAdd={f => savePatientData({ ...patient, customFields: [...(patient.customFields || []), { ...f, persistent: true }] })} onClose={() => setShowAddField(false)} />}
    </div>
  );
}
