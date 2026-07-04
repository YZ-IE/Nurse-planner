/**
 * DayOverview.jsx — Aide-Mémoire v4 fix
 * Vue journalière : événements, RDV, soins planifiés de tous les patients
 */

import { useState, useEffect, useCallback } from 'react';
import { T, tk, SOLID } from '../../theme.js';
import { Btn, IconBtn, Chip, Field, Input, Banner, Sheet, toast } from '../../ui/index.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr, isReadOnly, formatDateLabel, EmptyState } from './utils.jsx';
import { getSpecialty } from './templates.js';
import { getCareType } from './careTypes.js';
import { computeSlots } from './ServiceView.jsx';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

// ─── Helpers photo plaie ──────────────────────────────────────────────────────

function compressWoundImage(base64, maxPx = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

async function encryptWoundB64(plainB64, cryptoKey) {
  const binStr = atob(plainB64);
  const bytes  = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, bytes);
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), 12);
  let b64 = '';
  const chunk = 8192;
  for (let i = 0; i < combined.length; i += chunk)
    b64 += String.fromCharCode(...combined.subarray(i, i + chunk));
  return btoa(b64);
}

function loadWoundIdx(sid, pid) {
  try { return JSON.parse(localStorage.getItem(`am_wound_idx_${sid}_${pid}`) || '[]'); } catch { return []; }
}
function saveWoundIdx(sid, pid, idx) {
  try { localStorage.setItem(`am_wound_idx_${sid}_${pid}`, JSON.stringify(idx)); } catch {}
}

// ─── Modal validation soin ────────────────────────────────────────────────────

const CARE_SUB = {
  constantes_vitales: {
    grouped: true,
    subFields: [
      { key: 'ta',   label: 'TA',   placeholder: 'Ex: 120/80' },
      { key: 'spo2', label: 'SpO2', placeholder: 'Ex: 98'     },
      { key: 'temp', label: 'T°',   placeholder: 'Ex: 37.2'   },
      { key: 'fc',   label: 'FC',   placeholder: 'Ex: 72'     },
    ],
  },
  bilan:   { valueLabel: 'Tubes / Note',    valuePlaceholder: 'Ex: NFS CRP' },
  diurese: { valueLabel: 'Volume (mL)',     valuePlaceholder: 'Ex: 350'     },
  ecg:     { valueLabel: 'Résultat',        valuePlaceholder: 'Ex: RS FC 72'},
  hgt:     { valueLabel: 'Glycémie (g/L)', valuePlaceholder: 'Ex: 1.2'     },
  poids:   { valueLabel: 'Poids (kg)',      valuePlaceholder: 'Ex: 68'      },
};

function ValidationModal({ entry, service, cryptoKey, onValidate, onClose }) {
  const sub         = CARE_SUB[entry.type] || {};
  const isPansement = entry.type === 'pansement';

  const [doneTime,    setDoneTime]    = useState(timeStr());
  const [value,       setValue]       = useState('');
  const [subVals,     setSubVals]     = useState({});
  const [confirmEmpty,setConfirmEmpty]= useState(false);
  const [photoB64,    setPhotoB64]    = useState(null);
  const [photoLabel,  setPhotoLabel]  = useState('');
  const [photoError,  setPhotoError]  = useState('');
  const [photoBusy,   setPhotoBusy]   = useState(false);

  function buildValue() {
    if (sub.grouped) {
      const parts = (sub.subFields || []).filter(sf => subVals[sf.key]?.trim()).map(sf => `${sf.label}: ${subVals[sf.key]}`);
      return parts.join(' | ');
    }
    return value.trim();
  }
  function hasValue() {
    return sub.grouped ? Object.values(subVals).some(v => v?.trim()) : value.trim().length > 0;
  }

  async function handleCapturePhoto() {
    setPhotoError('');
    setPhotoBusy(true);
    try {
      await Camera.requestPermissions({ permissions: ['camera'] });
      const photo = await Camera.getPhoto({
        quality: 70,
        width: 1024,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
      });
      if (!photo.base64String) { setPhotoError('Photo vide.'); return; }
      const compressed = await compressWoundImage(photo.base64String);
      setPhotoB64(compressed);
    } catch (e) {
      const msg = e?.message || String(e);
      if (!msg.includes('cancel') && !msg.includes('User cancelled'))
        setPhotoError('Erreur caméra : ' + msg.slice(0, 60));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveWoundPhoto() {
    try {
      const enc = await encryptWoundB64(photoB64, cryptoKey);
      const ts  = Date.now();
      localStorage.setItem(`am_wound_${service.id}_${entry.patient.id}_${ts}`, enc);
      const idx = loadWoundIdx(service.id, entry.patient.id);
      idx.push({ ts, label: photoLabel.trim() || entry.label, time: timeStr() });
      saveWoundIdx(service.id, entry.patient.id, idx);
      toast('Photo enregistrée');
    } catch (e) {
      console.error('[DayOverview] saveWoundPhoto:', e);
    }
  }

  async function handleValidate() {
    if (!hasValue() && !confirmEmpty) { setConfirmEmpty(true); return; }
    if (photoB64) await saveWoundPhoto();
    onValidate(entry.id, doneTime, buildValue());
    onClose();
  }

  return (
    <Sheet
      title={entry.label}
      subtitle={`${entry.patient.initials} · Prévu ${entry.plannedTime}`}
      onClose={onClose}
      footer={
        <Btn size="lg" full color={SOLID.success} onClick={handleValidate}>
          ✅ Valider le soin
        </Btn>
      }
    >
      <Field label="Heure de réalisation">
        <Input type="time" value={doneTime} onChange={e => setDoneTime(e.target.value)} style={{ width: 150 }} />
      </Field>

      {sub.grouped && (
        <div style={{ marginBottom: tk.space.md }}>
          {sub.subFields.map(sf => (
            <div key={sf.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: T.muted, fontSize: tk.font.sm, fontWeight: tk.weight.semi, minWidth: 50 }}>{sf.label}</span>
              <Input value={subVals[sf.key] || ''} onChange={e => setSubVals(v => ({ ...v, [sf.key]: e.target.value }))}
                placeholder={sf.placeholder} />
            </div>
          ))}
        </div>
      )}

      {!sub.grouped && sub.valueLabel && (
        <Field label={sub.valueLabel}>
          <Input value={value} onChange={e => setValue(e.target.value)} placeholder={sub.valuePlaceholder} />
        </Field>
      )}

      {isPansement && (
        <Field label={<>Photo de plaie <span style={{ fontWeight: tk.weight.reg }}>(optionnel)</span></>}>
          {photoB64 ? (
            <div style={{ marginBottom: 4 }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <img src={`data:image/jpeg;base64,${photoB64}`} alt="plaie"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: tk.radius.md, display: 'block' }} />
                <IconBtn
                  label="Supprimer la photo"
                  onClick={() => { setPhotoB64(null); setPhotoLabel(''); }}
                  size={44}
                  fontSize={18}
                  color="#fff"
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', borderRadius: tk.radius.pill }}>
                  ×
                </IconBtn>
                <div style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 8px', color: '#fff', fontSize: tk.font.xs }}>
                  🔒 sera chiffrée
                </div>
              </div>
              <Input
                value={photoLabel}
                onChange={e => setPhotoLabel(e.target.value)}
                placeholder={entry.label}
              />
            </div>
          ) : (
            <Btn variant="soft" full color="#06b6d4" disabled={photoBusy} onClick={handleCapturePhoto}>
              {photoBusy ? '⏳ Ouverture caméra…' : '📷 Prendre une photo'}
            </Btn>
          )}
          {photoError && (
            <div style={{ color: T.danger, fontSize: tk.font.xs, marginTop: 4 }}>{photoError}</div>
          )}
        </Field>
      )}

      {confirmEmpty && (
        <Banner kind="warning" icon="⚠️">
          Aucune valeur — confirmer quand même ?
        </Banner>
      )}
    </Sheet>
  );
}

// Couleurs et emojis des soins (dupliqués ici pour éviter la dépendance circulaire)
function careMeta(type) { return getCareType(type); }

function slotDisplay(service, bedNumber) {
  const slots = computeSlots(service);
  const sl    = slots.find(s => s.slotIndex === bedNumber);
  if (!sl) return `🛏 ${bedNumber}`;
  const ico = sl.icon === 'door' ? '🚪' : sl.icon === 'window' ? '🪟' : '🛏';
  return sl.icon ? `${sl.roomLabel} ${ico}` : `${ico} ${sl.roomLabel}`;
}

// Case à cocher de soin — zone tactile 44px, visuel 26px
function CareCheck({ done, color, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={done ? 'Annuler la validation' : 'Valider le soin'}
      style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, flexShrink: 0, margin: '-9px 0 -9px -9px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${done ? T.success : color}`, background: done ? T.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}>
        {done ? '✓' : ''}
      </span>
    </button>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DayOverview({ service, cryptoKey, onBack, selectedDate: selDate }) {
  const sp    = getSpecialty(service.specialty);
  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  const [patients,  setPatients]  = useState([]);
  const [dailyData, setDailyData] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('soins');
  const [groupMode,  setGroupMode]  = useState(() => localStorage.getItem('am_dayoverview_group') || 'patient');
  const [validating,setValidating]= useState(null); // entry en cours de validation

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey),
      ]);
      const present = (pts || []).filter(p => p.present);
      present.sort((a, b) => a.bedNumber - b.bedNumber);
      setPatients(present);
      setDailyData(daily || {});
    } catch (e) {
      console.error('[DayOverview] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, [service.id, cryptoKey, today]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveDailyData(next) {
    setDailyData(next);
    if (readOnly) return;
    await secureSet(`daily_${service.id}_${selectedDate}`, next, cryptoKey);
  }

  async function handleValidate(careId, doneTime, doneValue) {
    const pid   = validating.patient.id;
    const entry = dailyData[pid] || {};
    const next  = { ...entry, careEntries: (entry.careEntries || []).map(e =>
      e.id === careId ? { ...e, done: true, doneTime, doneValue } : e
    )};
    await saveDailyData({ ...dailyData, [pid]: next });
  }

  async function handleUndo(patientId, careId) {
    const entry = dailyData[patientId] || {};
    const next  = { ...entry, careEntries: (entry.careEntries || []).map(e =>
      e.id === careId ? { ...e, done: false, doneTime: null, doneValue: null } : e
    )};
    await saveDailyData({ ...dailyData, [patientId]: next });
  }

  if (loading) return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: tk.font.base }}>Chargement…</span>
    </div>
  );

  // ── Agrégation ──────────────────────────────────────────────────────────────

  const allEvents = [];
  const allRdv    = [];
  const allCare   = [];

  for (const p of patients) {
    const daily = dailyData[p.id] || {};

    // Événements
    for (const ev of (daily.events || [])) {
      allEvents.push({ ...ev, patient: p });
    }

    // RDV : champs info persistants avec valeur
    const infoFields = [...(service.fields || []), ...(p.customFields || [])].filter(f => f.category === 'info');
    for (const f of infoFields) {
      const v = f.persistent ? (p.fieldValues || {})[f.id] : (daily.fieldValues || {})[f.id];
      if (v && v !== false && v !== '') allRdv.push({ field: f, value: v, patient: p });
    }

    // Soins
    for (const e of (daily.careEntries || [])) {
      allCare.push({ ...e, patient: p });
    }
  }

  allEvents.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  allCare.sort((a, b) => (a.plannedTime || '').localeCompare(b.plannedTime || ''));

  // Groupement par patient
  function groupByPatient(items) {
    const map = {};
    for (const item of items) {
      const pid = item.patient.id;
      if (!map[pid]) map[pid] = { patient: item.patient, items: [] };
      map[pid].items.push(item);
    }
    return Object.values(map).sort((a,b) => a.patient.bedNumber - b.patient.bedNumber);
  }
  const careByPatient   = groupByPatient(allCare);
  const eventsByPatient = groupByPatient(allEvents);
  const rdvByPatient    = groupByPatient(allRdv);

  const tabs = [
    { id: 'soins',  label: 'Soins',       emoji: '💊', count: allCare.length   },
    { id: 'events', label: 'Événements',  emoji: '📝', count: allEvents.length  },
    { id: 'rdv',    label: 'RDV / Infos', emoji: '📅', count: allRdv.length     },
  ];

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 0', background: T.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <IconBtn label="Retour" onClick={onBack} fontSize={22}>←</IconBtn>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: tk.weight.bold }}>Vue du jour</div>
            <div style={{ color: T.muted, fontSize: tk.font.sm }}>
              {service.name} · {patients.length} patients · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, background: tab === t.id ? T.infoDim : 'transparent',
                border: 'none', borderBottom: `2px solid ${tab === t.id ? T.info : 'transparent'}`,
                color: tab === t.id ? T.info : T.muted,
                fontSize: tk.font.sm, fontWeight: tab === t.id ? tk.weight.bold : tk.weight.reg,
                padding: '8px 4px', minHeight: 44, cursor: 'pointer',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {t.emoji} {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 4, background: tab === t.id ? T.info : T.muted, color: '#fff', borderRadius: tk.radius.pill, fontSize: tk.font.xs, padding: '1px 6px' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === 'soins' && (
          <div style={{ display:'flex', justifyContent:'flex-end', padding:'6px 16px 8px' }}>
            <Chip
              color={T.info}
              active
              onClick={() => setGroupMode(m => { const next = m === 'patient' ? 'chrono' : 'patient'; localStorage.setItem('am_dayoverview_group', next); return next; })}>
              {groupMode === 'patient' ? '🕐 Chrono' : '👤 Patients'}
            </Chip>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: '14px 16px 60px' }}>

        {/* ── Soins ── */}
        {tab === 'soins' && (
          allCare.length === 0 ? <EmptyState text="Aucun soin programmé aujourd'hui" /> : (
            <div>
              {groupMode === 'chrono' ? allCare.map((entry, i) => {
                  const { emoji, color } = careMeta(entry.type);
                  return (
                    <div key={entry.id || i} style={{ display:'flex', gap:10, alignItems:'flex-start', background:T.surface, border:`1px solid ${entry.done ? T.border : color+'44'}`, borderLeft:`3px solid ${entry.done ? T.success : color}`, borderRadius:tk.radius.sm, padding:'10px 12px', marginBottom:8, opacity:entry.done?0.7:1 }}>
                      <CareCheck done={entry.done} color={color} onClick={() => entry.done ? handleUndo(entry.patient.id, entry.id) : setValidating(entry)} />
                      <div style={{ textAlign:'center', minWidth:38, flexShrink:0 }}><div style={{ color:color, fontSize:tk.font.sm, fontWeight:tk.weight.bold }}>{entry.plannedTime}</div><div style={{ fontSize:18 }}>{emoji}</div></div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ color:T.text, fontSize:tk.font.base, fontWeight:tk.weight.semi, textDecoration:entry.done?'line-through':'none' }}>{entry.label}</div>{entry.doneValue&&<span style={{ background:T.successDim, color:T.success, fontSize:tk.font.xs, borderRadius:4, padding:'1px 7px' }}>{entry.doneValue}</span>}<div style={{ marginTop:4, display:'flex', gap:5 }}><span style={{ color:T.info, fontSize:tk.font.xs, fontWeight:tk.weight.bold }}>{slotDisplay(service, entry.patient.bedNumber)}</span><span style={{ color:T.muted, fontSize:tk.font.xs }}>· {entry.patient.initials}</span></div></div>
                    </div>
                  );
                }) : careByPatient.map(({ patient: pt, items }) => (
                <div key={pt.id} style={{ marginBottom: 16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'6px 10px', background:T.infoDim, borderRadius:tk.radius.sm }}>
                    <span style={{ color:T.info, fontWeight:tk.weight.bold, fontSize:tk.font.base }}>{pt.initials}</span>
                    <span style={{ color:T.muted, fontSize:tk.font.sm }}>{slotDisplay(service, pt.bedNumber)}</span>
                  </div>
                  {items.map((entry, i) => {
                    const { emoji, color } = careMeta(entry.type);
                    return (
                      <div key={entry.id || i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        background: T.surface, border: `1px solid ${entry.done ? T.border : color + '44'}`,
                        borderLeft: `3px solid ${entry.done ? T.success : color}`,
                        borderRadius: tk.radius.sm, padding: '10px 12px', marginBottom: 8,
                        opacity: entry.done ? 0.7 : 1,
                      }}>
                        <CareCheck done={entry.done} color={color} onClick={() => entry.done ? handleUndo(entry.patient.id, entry.id) : setValidating(entry)} />
                        <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
                          <div style={{ color: color, fontSize: tk.font.sm, fontWeight: tk.weight.bold }}>{entry.plannedTime}</div>
                          <div style={{ fontSize: 18 }}>{emoji}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: T.text, fontSize: tk.font.base, fontWeight: tk.weight.semi, textDecoration: entry.done ? 'line-through' : 'none' }}>
                              {entry.label}
                            </span>
                            {entry.done && <span style={{ color: T.success, fontSize: tk.font.xs }}>✓ {entry.doneTime}</span>}
                          </div>
                          {entry.doneValue && (
                            <span style={{ background: T.successDim, color: T.success, fontSize: tk.font.xs, borderRadius: 4, padding: '1px 7px', fontWeight: tk.weight.bold }}>
                              {entry.doneValue}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Événements ── */}
        {tab === 'events' && (
          allEvents.length === 0 ? <EmptyState text="Aucun événement enregistré aujourd'hui" /> : (
            <div>
              {allEvents.map((ev, i) => (
                <div key={ev.id || i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${sp.color}`,
                  borderRadius: tk.radius.sm, padding: '10px 12px', marginBottom: 8,
                }}>
                  <span style={{ color: T.success, fontSize: tk.font.sm, fontWeight: tk.weight.bold, minWidth: 40, marginTop: 1 }}>{ev.time}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.text, fontSize: tk.font.base }}>{ev.text}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 5 }}>
                      <span style={{ color: sp.color, fontSize: tk.font.xs, fontWeight: tk.weight.bold }}>{slotDisplay(service, ev.patient.bedNumber)}</span>
                      <span style={{ color: T.muted, fontSize: tk.font.xs }}>· {ev.patient.initials}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── RDV ── */}
        {tab === 'rdv' && (
          allRdv.length === 0 ? <EmptyState text="Aucun RDV ou information planifiée" /> : (
            <div>
              {patients.map(p => {
                const rdvs = allRdv.filter(r => r.patient.id === p.id);
                if (!rdvs.length) return null;
                return (
                  <div key={p.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: sp.color, fontSize: tk.font.sm, fontWeight: tk.weight.bold }}>{slotDisplay(service, p.bedNumber)}</span>
                      <span style={{ color: T.text, fontSize: tk.font.base, fontWeight: tk.weight.bold }}>{p.initials}</span>
                      <span style={{ color: T.muted, fontSize: tk.font.sm }}>{p.gender} {p.age}a</span>
                    </div>
                    {rdvs.map(({ field, value }) => (
                      <div key={field.id} style={{
                        display: 'flex', gap: 10,
                        background: T.surface, border: `1px solid ${T.border}`,
                        borderRadius: tk.radius.sm, padding: '9px 12px', marginBottom: 6, marginLeft: 4,
                      }}>
                        <span style={{ color: T.muted, fontSize: tk.font.sm, minWidth: 100, flexShrink: 0 }}>{field.label}</span>
                        <span style={{ color: T.text, fontSize: tk.font.base, fontWeight: tk.weight.semi }}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {validating && (
        <ValidationModal
          entry={validating}
          service={service}
          cryptoKey={cryptoKey}
          onValidate={(id, doneTime, doneValue) => { handleValidate(id, doneTime, doneValue); setValidating(null); }}
          onClose={() => setValidating(null)}
        />
      )}
    </div>
  );
}
