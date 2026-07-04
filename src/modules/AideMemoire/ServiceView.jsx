/**
 * ServiceView.jsx — Aide-Mémoire v5
 * Correctifs CNIL :
 *   · Export texte supprimé (remplacé par transfert sécurisé uniquement)
 *   · Bouton journal d'accès 📋 ajouté
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, IconBtn, Chip, Field, Input, Banner, Sheet, toast } from '../../ui/index.js';
import { secureGet, secureSet } from './crypto.js';
import { getSpecialty } from './templates.js';
import { todayStr, genId, isFlagActive, activeFlagsEmoji, dateStrOffset, isReadOnly, formatDateLabel, parseVitalAlerts } from './utils.jsx';
import ImportFromPhoto from './ImportFromPhoto.jsx';
import RelèveView from './RelèveView.jsx';
import GanttView from './GanttView.jsx';

const SURVEILLANCE_TYPES = new Set(['constantes_vitales','hgt','bilan','diurese','ecg','poids']);

// ── computeSlots — source unique de vérité ────────────────────────────────────
// Priorité : bedRooms → bedConfig non-vide → bedCount

export function computeSlots(service) {
  if (service.bedRooms && service.bedRooms.length > 0) {
    const slots = [];
    let idx = 1;
    for (const room of service.bedRooms) {
      const isDouble = room.iconA || room.iconB;
      if (isDouble) {
        slots.push({ slotIndex: idx++, roomLabel: room.label, icon: room.iconA || null });
        slots.push({ slotIndex: idx++, roomLabel: room.label, icon: room.iconB || null });
      } else {
        slots.push({ slotIndex: idx++, roomLabel: room.label, icon: null });
      }
    }
    return slots;
  }
  if (service.bedConfig && Object.keys(service.bedConfig).length > 0) {
    return Object.entries(service.bedConfig)
      .map(([num, cfg]) => ({ slotIndex: Number(num), roomLabel: cfg.label || String(num), icon: cfg.icon || null }))
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }
  const count = service.bedCount || 20;
  return Array.from({ length: count }, (_, i) => ({ slotIndex: i + 1, roomLabel: String(i + 1), icon: null }));
}

function slotIcon(icon) {
  if (icon === 'door')   return '🚪';
  if (icon === 'window') return '🪟';
  return '🛏';
}

function slotLabel(slot) {
  return slot.icon ? `${slot.roomLabel} ${slotIcon(slot.icon)}` : slot.roomLabel;
}



// ── Modal config chambres ─────────────────────────────────────────────────────

function BedsConfigModal({ service, onSave, onClose }) {
  const initRooms = () => {
    if (service.bedRooms && service.bedRooms.length > 0) return service.bedRooms.map(r => ({ ...r }));
    return Array.from({ length: service.bedCount || 10 }, (_, i) => ({ id: String(i + 1), label: String(i + 1), iconA: null, iconB: null }));
  };

  const [rooms,    setRooms]    = useState(initRooms);
  const [fromRoom, setFromRoom] = useState('');
  const [toRoom,   setToRoom]   = useState('');

  function applyRange() {
    const from = Number(fromRoom), to = Number(toRoom);
    if (!from || !to || to < from) return;
    const next = [];
    for (let r = from; r <= to; r++) next.push({ id: String(r), label: String(r), iconA: 'door', iconB: 'window' });
    setRooms(next);
  }

  function updateRoom(idx, field, value) { setRooms(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r)); }
  function addRoom() { const last = rooms[rooms.length - 1]; setRooms(prev => [...prev, { id: genId(), label: last ? String(Number(last.label) + 1 || rooms.length + 1) : '1', iconA: null, iconB: null }]); }
  function removeRoom(idx) { setRooms(prev => prev.filter((_, i) => i !== idx)); }

  const totalSlots = rooms.reduce((acc, r) => acc + ((r.iconA || r.iconB) ? 2 : 1), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', zIndex: 150 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '20px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>⚙️ Chambres</div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{rooms.length} chambre(s) → {totalSlots} lit(s)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Génération rapide */}
        <div style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>⚡ Génération rapide (doubles)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: T.muted, fontSize: 13 }}>Ch.</span>
            <input type="number" value={fromRoom} onChange={e => setFromRoom(e.target.value)} inputMode="numeric" placeholder="101"
              style={{ ...s.input, width: 60, boxSizing: 'border-box', textAlign: 'center' }} />
            <span style={{ color: T.muted, fontSize: 13 }}>à</span>
            <input type="number" value={toRoom} onChange={e => setToRoom(e.target.value)} inputMode="numeric" placeholder="115"
              style={{ ...s.input, width: 60, boxSizing: 'border-box', textAlign: 'center' }} />
            <button onClick={applyRange} style={{ ...s.btn(T.info), padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>Générer</button>
          </div>
          <div style={{ color: T.muted, fontSize: 11 }}>🚪 + 🪟 auto · Retirez une icône = lit A seul · Aucune icône = chambre seule</div>
        </div>

        {rooms.map((room, idx) => {
          const isDouble = room.iconA || room.iconB;
          return (
            <div key={room.id || idx} style={{ marginBottom: 10, background: T.bg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${isDouble ? T.info + '22' : T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: T.muted, fontSize: 11 }}>Ch.</span>
                <input value={room.label} onChange={e => updateRoom(idx, 'label', e.target.value)} maxLength={8}
                  style={{ ...s.input, width: 70, boxSizing: 'border-box', fontSize: 14, fontWeight: 700 }} />
                <span style={{ color: T.muted, fontSize: 11, marginLeft: 'auto' }}>{isDouble ? '🛏🛏 double' : '🛏 seule'}</span>
                <button onClick={() => removeRoom(idx)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 0 }}>🗑</button>
              </div>
              {[['iconA', 'Lit A'], ['iconB', 'Lit B']].map(([field, label]) => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: field === 'iconA' ? 6 : 0 }}>
                  <span style={{ color: T.muted, fontSize: 12, minWidth: 44 }}>{label}</span>
                  {[null, 'door', 'window'].map(icon => {
                    const emoji  = icon === 'door' ? '🚪' : icon === 'window' ? '🪟' : '🛏';
                    const active = room[field] === icon;
                    return (
                      <button key={String(icon)} onClick={() => updateRoom(idx, field, icon)}
                        style={{ background: active ? T.infoDim : T.surface, border: `1.5px solid ${active ? T.info : T.border}`, borderRadius: 8, fontSize: 19, width: 44, height: 44, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                        {emoji}
                      </button>
                    );
                  })}
                  {field === 'iconB' && !isDouble && <span style={{ color: T.muted, fontSize: 10, fontStyle: 'italic' }}>ignoré</span>}
                </div>
              ))}
            </div>
          );
        })}

        <button onClick={addRoom}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 9, color: T.muted, fontSize: 14, padding: '10px 12px', cursor: 'pointer', marginBottom: 14, WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ fontSize: 18 }}>+</span><span>Ajouter une chambre</span>
        </button>

        <button onClick={() => { onSave(rooms); onClose(); }}
          style={{ ...s.btn(T.info), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700 }}>
          Enregistrer ({totalSlots} lit{totalSlots > 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ServiceView({ service, cryptoKey, accentColor, onSelectPatient, onQuickEntry, onDayOverview, onBack, onServiceUpdate, onTransfer, onLog, refreshKey, selectedDate: selDate, onDateChange }) {
  const C  = accentColor;
  const sp = getSpecialty(service.specialty);

  const [patients,     setPatients]     = useState([]);
  const [dailyData,    setDailyData]    = useState({});
  const [loading,      setLoading]      = useState(true);
  const [addBed,       setAddBed]       = useState(null);
  const [addForm,      setAddForm]      = useState({ initials: '', age: '', gender: 'M', reason: '', atcd: '' });
  const [saving,       setSaving]       = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showBedsCfg,  setShowBedsCfg]  = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [showRelève,   setShowRelève]   = useState(false);
  const [showGantt,    setShowGantt]    = useState(false);
  const [sortMode,     setSortMode]     = useState('bed'); // 'bed' | 'next_care' | 'priority'

  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey),
      ]);
      setPatients(pts || []);
      setDailyData(daily || {});
    } finally { setLoading(false); }
  }, [service.id, cryptoKey, selectedDate]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  async function savePatients(next) { setPatients(next); await secureSet(`patients_${service.id}`, next, cryptoKey); }
  async function saveDailyData(next) {
    if (readOnly) return;
    setDailyData(next);
    await secureSet(`daily_${service.id}_${selectedDate}`, next, cryptoKey);
  }

  async function handleDailyReset() {
    const next = {};
    for (const [pid, entry] of Object.entries(dailyData)) {
      next[pid] = { ...entry, careEntries: (entry.careEntries || []).filter(e => SURVEILLANCE_TYPES.has(e.type)).map(e => ({ ...e, done: false, doneTime: null, doneValue: null })) };
    }
    await saveDailyData(next); setConfirmReset(false);
  }

  async function handleBedsSave(rooms) { await onServiceUpdate({ ...service, bedRooms: rooms }); }

  async function handleAddPatient() {
    if (!addForm.initials.trim() || !addForm.age) return;
    setSaving(true);
    try {
      const p = { id: genId(), serviceId: service.id, bedNumber: addBed, initials: addForm.initials.trim().toUpperCase(), age: Number(addForm.age), gender: addForm.gender, admissionReason: addForm.reason.trim(), atcd: addForm.atcd.trim(), fieldValues: {}, customFields: [], present: true, admittedAt: Date.now() };
      await savePatients([...patients, p]);
      toast(`Patient ${p.initials} admis`);
      setAddBed(null); setAddForm({ initials: '', age: '', gender: 'M', reason: '', atcd: '' });
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
    </div>
  );

  const slots      = computeSlots(service);
  const presentPts = patients.filter(p => p.present);
  const slotByIndex = Object.fromEntries(slots.map(s => [s.slotIndex, s]));

  function nextPendingTime(daily) {
    const pending = (daily?.careEntries || []).filter(e => !e.done && e.plannedTime);
    return pending.length ? pending.map(e => e.plannedTime).sort()[0] : '99:99';
  }

  const sortedPresentPts = [...presentPts].sort((a, b) => {
    if (sortMode === 'next_care') {
      return nextPendingTime(dailyData[a.id]).localeCompare(nextPendingTime(dailyData[b.id]));
    }
    if (sortMode === 'priority') {
      const aA = parseVitalAlerts(dailyData[a.id]?.careEntries || []);
      const bA = parseVitalAlerts(dailyData[b.id]?.careEntries || []);
      const score = x => -(x.filter(v => v.level === 'critical').length * 100 + x.filter(v => v.level === 'warning').length * 10);
      return score(aA) - score(bA);
    }
    return 0;
  });

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}
         onClick={() => showMenu && setShowMenu(false)}>

      {/* Header */}
      <div style={{ padding: '10px 12px 0 6px', background: T.bg, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <IconBtn label="Retour" onClick={onBack} fontSize={22} size={44}>←</IconBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {service.name}
              {readOnly && <span style={{ fontSize: tk.font.xs, color: T.muted, fontWeight: 400, marginLeft: 8 }}>👁 Lecture seule</span>}
            </div>
            <div style={{ color: T.muted, fontSize: tk.font.xs }}>{sp.label} · {presentPts.length}/{slots.length} lits</div>
          </div>
          {/* Boutons principaux */}
          <IconBtn label="Config chambres" variant="outline" onClick={() => setShowBedsCfg(true)} fontSize={17} size={44}>⚙️</IconBtn>
          <IconBtn label="Saisie rapide" variant="soft" color={readOnly ? T.muted : C} onClick={readOnly ? undefined : onQuickEntry} fontSize={17} size={44} disabled={readOnly}>⚡</IconBtn>
          <IconBtn label="Transfert sécurisé" variant="soft" color={T.info} onClick={onTransfer} fontSize={17} size={44}>🔄</IconBtn>
          {/* Menu "…" pour actions secondaires */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <IconBtn label="Plus d'options" variant="outline" onClick={() => setShowMenu(m => !m)} fontSize={15} size={44}>•••</IconBtn>
            {showMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: T.surface, border: `1px solid ${T.border}`, borderRadius: tk.radius.md, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}
                   onClick={() => setShowMenu(false)}>
                <button onClick={onDayOverview}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: tk.touch.min, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text, fontSize: tk.font.base, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                  <span>📋</span><span>Vue du jour</span>
                </button>
                <button onClick={() => { setShowRelève(true); setShowMenu(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: tk.touch.min, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text, fontSize: tk.font.base, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                  <span>🗒️</span><span>Générer la relève</span>
                </button>
                <button onClick={() => { setShowGantt(true); setShowMenu(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: tk.touch.min, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text, fontSize: tk.font.base, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                  <span>📅</span><span>Vue Gantt</span>
                </button>
                {!readOnly && (
                  <button onClick={() => { setShowImport(true); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: tk.touch.min, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, color: T.text, fontSize: tk.font.base, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                    <span>📷</span><span>Import depuis photo</span>
                  </button>
                )}
                <button onClick={onLog}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: tk.touch.min, background: 'none', border: 'none', color: T.text, fontSize: tk.font.base, padding: '10px 16px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                  <span>🗒️</span><span>Journal d'accès</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, gap: 6, flexWrap: 'wrap' }}>
          {/* Sélecteur J / J-1 / J-2 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, -1, -2].map(offset => {
              const d = dateStrOffset(offset);
              const active = d === selectedDate;
              return (
                <Chip key={offset} color={C} active={active} onClick={() => onDateChange?.(d)}>
                  {formatDateLabel(d)}{isReadOnly(d) && ' 👁'}
                </Chip>
              );
            })}
          </div>
          {!readOnly && !confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: tk.font.sm, cursor: 'pointer', minHeight: 40, padding: '0 8px', WebkitTapHighlightColor: 'transparent' }}>🔄 Reset soins</button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: tk.font.sm, cursor: 'pointer', minHeight: 40, padding: '0 8px', WebkitTapHighlightColor: 'transparent' }}>Annuler</button>
              <button onClick={handleDailyReset} style={{ background: T.dangerDim, border: `1px solid ${T.danger}44`, borderRadius: tk.radius.sm, color: T.danger, fontSize: tk.font.sm, fontWeight: 700, minHeight: 40, padding: '0 12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Confirmer</button>
            </div>
          )}
        </div>
        {/* Tri */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 10, borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
          {[['bed', '🛏 Lit'], ['next_care', '⏰ Prochain soin'], ['priority', '🔴 Urgence']].map(([mode, label]) => (
            <Chip key={mode} color={C} active={sortMode === mode} onClick={() => setSortMode(mode)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Liste des lits */}
      <div style={{ padding: '8px 16px 60px' }}>

        {sortMode === 'bed' ? (
          /* ── Vue par lit (slots) ── */
          <>
            {slots.map(slot => {
              const patient = presentPts.find(p => p.bedNumber === slot.slotIndex);
              const ico     = slotIcon(slot.icon);
              const lbl     = slotLabel(slot);

              if (!patient) return (
                <div key={slot.slotIndex} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, opacity: 0.55 }}>
                  <span style={{ color: T.muted, fontSize: 13, minWidth: 72, fontWeight: 600 }}>{ico} {lbl}</span>
                  <span style={{ color: T.muted, fontSize: 13, flex: 1 }}>Libre</span>
                  <button onClick={() => setAddBed(slot.slotIndex)} aria-label="Admettre un patient"
                    style={{ background: C + '22', border: `1px solid ${C}44`, borderRadius: tk.radius.sm, color: C, fontSize: 22, width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>+</button>
                </div>
              );

              const daily       = dailyData[patient.id] || {};
              const allFields   = [...(service.fields || []), ...(patient.customFields || [])];
              const flagEmoji   = activeFlagsEmoji(allFields, patient.fieldValues || {}, daily.fieldValues || {});
              const pendingCare = (daily.careEntries || []).filter(e => !e.done).length;
              const keyFields   = (service.fields || []).filter(f => f.category === 'info' && f.persistent).slice(0, 2);

              return (
                <div key={slot.slotIndex} onClick={() => !readOnly && onSelectPatient(patient.id)}
                  style={{ padding: '11px 14px', marginBottom: 6, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${sp.color}`, borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: T.muted, fontSize: 12, minWidth: 72, fontWeight: 600 }}>{ico} {lbl}</span>
                    <span style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>{patient.initials}</span>
                    <span style={{ color: T.muted, fontSize: 12 }}>{patient.gender} {patient.age}a</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      {pendingCare > 0 && <span style={{ background: T.warningDim, color: T.warning, fontSize: tk.font.xs, borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>💊×{pendingCare}</span>}
                      {flagEmoji.map((e, i) => <span key={i} style={{ fontSize: 15 }}>{e}</span>)}
                    </div>
                  </div>
                  {patient.admissionReason && (
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 3, marginLeft: 80 }}>
                      {patient.admissionReason.length > 50 ? patient.admissionReason.slice(0, 50) + '…' : patient.admissionReason}
                    </div>
                  )}
                  {keyFields.some(f => (patient.fieldValues || {})[f.id]) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 80, flexWrap: 'wrap' }}>
                      {keyFields.map(f => { const v = (patient.fieldValues || {})[f.id]; if (!v && v !== true) return null; return <span key={f.id} style={{ color: C, fontSize: 11, background: C + '11', borderRadius: 4, padding: '1px 6px' }}>{f.label}: {String(v)}</span>; })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Patients sans lit valide */}
            {(() => {
              const validSlotIndexes = new Set(slots.map(s => s.slotIndex));
              const orphans = presentPts.filter(p => !validSlotIndexes.has(p.bedNumber));
              if (orphans.length === 0) return null;
              return (
                <div style={{ marginTop: 16, padding: '12px 14px', background: T.warningDim, border: `1px solid ${T.warning}33`, borderRadius: 10 }}>
                  <div style={{ color: T.warning, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 10 }}>
                    ⚠️ Patients sans lit attribué
                  </div>
                  {orphans.map(p => (
                    <div key={p.id} onClick={() => !readOnly && onSelectPatient(p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: T.surface, border: `1px solid ${T.warning}33`, borderRadius: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      <span style={{ color: T.warning, fontSize: tk.font.sm, fontWeight: 700, minWidth: 60 }}>Lit #{p.bedNumber}</span>
                      <span style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>{p.initials}</span>
                      <span style={{ color: T.muted, fontSize: 12 }}>{p.gender} {p.age}a</span>
                      <span style={{ marginLeft: 'auto', color: T.muted, fontSize: 18 }}>›</span>
                    </div>
                  ))}
                  <div style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>
                    La configuration des chambres a changé. Ouvrez la fiche pour déplacer ou sortir ces patients.
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          /* ── Vue triée (prochain soin / urgence) — lits libres masqués ── */
          <>
            {sortedPresentPts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.muted, fontSize: 14 }}>Aucun patient présent</div>
            )}
            {sortedPresentPts.map(patient => {
              const slot        = slotByIndex[patient.bedNumber];
              const ico         = slotIcon(slot?.icon ?? null);
              const lbl         = slot ? slotLabel(slot) : `?${patient.bedNumber}`;
              const daily       = dailyData[patient.id] || {};
              const allFields   = [...(service.fields || []), ...(patient.customFields || [])];
              const flagEmoji   = activeFlagsEmoji(allFields, patient.fieldValues || {}, daily.fieldValues || {});
              const pendingCare = (daily.careEntries || []).filter(e => !e.done);
              const keyFields   = (service.fields || []).filter(f => f.category === 'info' && f.persistent).slice(0, 2);
              const nextTime    = nextPendingTime(daily);

              return (
                <div key={patient.id} onClick={() => !readOnly && onSelectPatient(patient.id)}
                  style={{ padding: '11px 14px', marginBottom: 6, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${sp.color}`, borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: T.muted, fontSize: 12, minWidth: 72, fontWeight: 600 }}>{ico} {lbl}</span>
                    <span style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>{patient.initials}</span>
                    <span style={{ color: T.muted, fontSize: 12 }}>{patient.gender} {patient.age}a</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      {sortMode === 'next_care' && nextTime !== '99:99' && (
                        <span style={{ background: T.warningDim, color: T.warning, fontSize: tk.font.xs, borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>⏰ {nextTime}</span>
                      )}
                      {sortMode === 'next_care' && pendingCare.length > 0 && (
                        <span style={{ background: T.warningDim, color: T.warning, fontSize: tk.font.xs, borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>💊×{pendingCare.length}</span>
                      )}
                      {flagEmoji.map((e, i) => <span key={i} style={{ fontSize: 15 }}>{e}</span>)}
                    </div>
                  </div>
                  {patient.admissionReason && (
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 3, marginLeft: 80 }}>
                      {patient.admissionReason.length > 50 ? patient.admissionReason.slice(0, 50) + '…' : patient.admissionReason}
                    </div>
                  )}
                  {keyFields.some(f => (patient.fieldValues || {})[f.id]) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 80, flexWrap: 'wrap' }}>
                      {keyFields.map(f => { const v = (patient.fieldValues || {})[f.id]; if (!v && v !== true) return null; return <span key={f.id} style={{ color: C, fontSize: 11, background: C + '11', borderRadius: 4, padding: '1px 6px' }}>{f.label}: {String(v)}</span>; })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Modal ajout patient */}
      {addBed !== null && (() => {
        const slot = computeSlots(service).find(sl => sl.slotIndex === addBed);
        const lbl  = slot ? slotLabel(slot) : String(addBed);
        return (
          <Sheet
            title={`Nouveau patient — ${slotIcon(slot?.icon)} Ch.${lbl}`}
            onClose={() => setAddBed(null)}
            zIndex={100}
            footer={
              <Btn color={C} size="lg" full disabled={!addForm.initials.trim() || !addForm.age || saving} onClick={handleAddPatient}>
                {saving ? 'Enregistrement…' : 'Admettre le patient'}
              </Btn>
            }
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Initiales" style={{ flex: 1 }}>
                <Input value={addForm.initials} onChange={e => setAddForm(f => ({ ...f, initials: e.target.value }))} placeholder="Ex : M.D" maxLength={5} />
              </Field>
              <Field label="Sexe">
                <div style={{ display: 'flex', gap: 8 }}>
                  {['M', 'F'].map(g => (
                    <button key={g} onClick={() => setAddForm(f => ({ ...f, gender: g }))} style={{ background: addForm.gender === g ? C + '33' : T.bg, border: `1.5px solid ${addForm.gender === g ? C : T.border}`, borderRadius: tk.radius.sm, color: addForm.gender === g ? C : T.muted, fontWeight: 700, fontSize: tk.font.base, width: 48, height: 48, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{g}</button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Âge">
              <Input type="number" value={addForm.age} onChange={e => setAddForm(f => ({ ...f, age: e.target.value }))} inputMode="numeric" placeholder="Âge" style={{ width: 110 }} />
            </Field>
            <Field label="Motif">
              <Input value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex : PTG Gche J25…" />
            </Field>
            <Field label="ATCD">
              <Input value={addForm.atcd} onChange={e => setAddForm(f => ({ ...f, atcd: e.target.value }))} placeholder="Ex : HTA, diabète…" />
            </Field>
          </Sheet>
        );
      })()}

      {showBedsCfg && <BedsConfigModal service={service} onSave={handleBedsSave} onClose={() => setShowBedsCfg(false)} />}

      {showImport && (
        <ImportFromPhoto
          service={service}
          existingPatients={patients}
          onImport={async newPts => { await savePatients([...patients, ...newPts]); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showRelève && (
        <RelèveView
          service={service}
          patients={patients}
          dailyData={dailyData}
          onClose={() => setShowRelève(false)}
        />
      )}

      {showGantt && (
        <GanttView
          service={service}
          patients={patients}
          dailyData={dailyData}
          cryptoKey={cryptoKey}
          selectedDate={selectedDate}
          onDailyDataChange={setDailyData}
          onClose={() => setShowGantt(false)}
        />
      )}
    </div>
  );
}
