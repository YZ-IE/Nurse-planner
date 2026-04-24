/**
 * DayOverview.jsx — Aide-Mémoire v4 fix
 * Vue journalière : événements, RDV, soins planifiés de tous les patients
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr } from './utils.jsx';
import { getSpecialty } from './templates.js';
import { computeSlots } from './ServiceView.jsx';

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

function ValidationModal({ entry, onValidate, onClose }) {
  const sub = CARE_SUB[entry.type] || {};
  const [doneTime,    setDoneTime]    = useState(timeStr());
  const [value,       setValue]       = useState('');
  const [subVals,     setSubVals]     = useState({});
  const [confirmEmpty,setConfirmEmpty]= useState(false);

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
  function handleValidate() {
    if (!hasValue() && !confirmEmpty) { setConfirmEmpty(true); return; }
    onValidate(entry.id, doneTime, buildValue());
    onClose();
  }

  const INP = { ...s.input, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '22px 20px 44px', width: '100%', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>{entry.label}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{entry.patient.initials} · Prévu {entry.plannedTime}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Heure de réalisation</div>
          <input type="time" value={doneTime} onChange={e => setDoneTime(e.target.value)} style={{ ...INP, width: 130 }} />
        </div>

        {sub.grouped && (
          <div style={{ marginBottom: 14 }}>
            {sub.subFields.map(sf => (
              <div key={sf.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: T.muted, fontSize: 12, minWidth: 50 }}>{sf.label}</span>
                <input value={subVals[sf.key] || ''} onChange={e => setSubVals(v => ({ ...v, [sf.key]: e.target.value }))}
                  placeholder={sf.placeholder} style={{ ...INP }} />
              </div>
            ))}
          </div>
        )}

        {!sub.grouped && sub.valueLabel && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{sub.valueLabel}</div>
            <input value={value} onChange={e => setValue(e.target.value)} placeholder={sub.valuePlaceholder} style={INP} />
          </div>
        )}

        {confirmEmpty && (
          <div style={{ background: '#f9731622', border: '1px solid #f9731644', borderRadius: 8, padding: '8px 12px', marginBottom: 14, color: '#f97316', fontSize: 12 }}>
            ⚠️ Aucune valeur — confirmer quand même ?
          </div>
        )}

        <button onClick={handleValidate}
          style={{ ...s.btn('#22c55e'), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700 }}>
          ✅ Valider le soin
        </button>
      </div>
    </div>
  );
}

// Couleurs et emojis des soins (dupliqués ici pour éviter la dépendance circulaire)
const CARE_META = {
  constantes_vitales: { emoji: '📊', color: '#06b6d4' },
  antalgie:           { emoji: '💊', color: '#f43f5e' },
  bilan:              { emoji: '🧪', color: '#a78bfa' },
  diurese:            { emoji: '💧', color: '#06b6d4' },
  ecg:                { emoji: '📈', color: '#a78bfa' },
  hgt:                { emoji: '🩸', color: '#f97316' },
  injection:          { emoji: '💉', color: '#a78bfa' },
  pansement:          { emoji: '🩹', color: '#06b6d4' },
  perfusion:          { emoji: '🫙', color: '#22c55e' },
  poids:              { emoji: '⚖️', color: '#22c55e' },
  autre:              { emoji: '📋', color: '#64748b' },
};
function careMeta(type) { return CARE_META[type] || CARE_META.autre; }

function slotDisplay(service, bedNumber) {
  const slots = computeSlots(service);
  const sl    = slots.find(s => s.slotIndex === bedNumber);
  if (!sl) return `🛏 ${bedNumber}`;
  const ico = sl.icon === 'door' ? '🚪' : sl.icon === 'window' ? '🪟' : '🛏';
  return sl.icon ? `${sl.roomLabel} ${ico}` : `${ico} ${sl.roomLabel}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DayOverview({ service, cryptoKey, onBack }) {
  const sp    = getSpecialty(service.specialty);
  const today = todayStr();

  const [patients,  setPatients]  = useState([]);
  const [dailyData, setDailyData] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('soins');
  const [groupMode,  setGroupMode]  = useState('patient'); // 'patient' | 'chrono'
  const [validating,setValidating]= useState(null); // entry en cours de validation

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${today}`, cryptoKey),
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
    await secureSet(`daily_${service.id}_${today}`, next, cryptoKey);
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
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
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
    <div style={{ background: T.bg, minHeight: '100vh', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 0', background: T.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>Vue du jour</div>
            <div style={{ color: T.muted, fontSize: 12 }}>
              {service.name} · {patients.length} patients · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, background: tab === t.id ? '#6366f122' : 'transparent',
                border: 'none', borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`,
                color: tab === t.id ? '#6366f1' : T.muted,
                fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
                padding: '8px 4px', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {t.emoji} {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 4, background: tab === t.id ? '#6366f1' : T.muted, color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 5px' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === 'soins' && (
          <div style={{ display:'flex', justifyContent:'flex-end', padding:'4px 16px 8px' }}>
            <button onClick={() => setGroupMode(m => m === 'patient' ? 'chrono' : 'patient')}
              style={{ background:'#6366f122', border:'1px solid #6366f144', borderRadius:20, color:'#818cf8', fontSize:11, fontWeight:700, padding:'4px 12px', cursor:'pointer' }}>
              {groupMode === 'patient' ? '🕐 Chrono' : '👤 Patients'}
            </button>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: '14px 16px 60px' }}>

        {/* ── Soins ── */}
        {tab === 'soins' && (
          allCare.length === 0 ? <Empty text="Aucun soin programmé aujourd'hui" /> : (
            <div>
              {groupMode === 'chrono' ? allCare.map((entry, i) => {
                  const { emoji, color } = careMeta(entry.type);
                  return (
                    <div key={entry.id || i} style={{ display:'flex', gap:10, alignItems:'flex-start', background:T.surface, border:`1px solid ${entry.done ? T.border : color+'44'}`, borderLeft:`3px solid ${entry.done ? '#22c55e' : color}`, borderRadius:9, padding:'10px 12px', marginBottom:8, opacity:entry.done?0.7:1 }}>
                      <button onClick={() => entry.done ? handleUndo(entry.patient.id, entry.id) : setValidating(entry)} style={{ width:26, height:26, borderRadius:7, flexShrink:0, marginTop:1, border:`2px solid ${entry.done?'#22c55e':color}`, background:entry.done?'#22c55e':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13 }}>{entry.done?'✓':''}</button>
                      <div style={{ textAlign:'center', minWidth:36, flexShrink:0 }}><div style={{ color:color, fontSize:12, fontWeight:700 }}>{entry.plannedTime}</div><div style={{ fontSize:18 }}>{emoji}</div></div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ color:T.text, fontSize:13, fontWeight:600, textDecoration:entry.done?'line-through':'none' }}>{entry.label}</div>{entry.doneValue&&<span style={{ background:'#22c55e22', color:'#22c55e', fontSize:11, borderRadius:4, padding:'1px 7px' }}>{entry.doneValue}</span>}<div style={{ marginTop:4, display:'flex', gap:5 }}><span style={{ color:'#6366f1', fontSize:11, fontWeight:700 }}>{slotDisplay(service, entry.patient.bedNumber)}</span><span style={{ color:T.muted, fontSize:11 }}>· {entry.patient.initials}</span></div></div>
                    </div>
                  );
                }) : careByPatient.map(({ patient: pt, items }) => (
                <div key={pt.id} style={{ marginBottom: 16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'6px 10px', background:'#6366f111', borderRadius:8 }}>
                    <span style={{ color:'#6366f1', fontWeight:700, fontSize:13 }}>{pt.initials}</span>
                    <span style={{ color:T.muted, fontSize:12 }}>{slotDisplay(service, pt.bedNumber)}</span>
                  </div>
                  {items.map((entry, i) => {
                    const { emoji, color } = careMeta(entry.type);
                    return (
                      <div key={entry.id || i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        background: T.surface, border: `1px solid ${entry.done ? T.border : color + '44'}`,
                        borderLeft: `3px solid ${entry.done ? '#22c55e' : color}`,
                        borderRadius: 9, padding: '10px 12px', marginBottom: 8,
                        opacity: entry.done ? 0.7 : 1,
                      }}>
                        <button
                          onClick={() => entry.done ? handleUndo(entry.patient.id, entry.id) : setValidating(entry)}
                          style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1, border: `2px solid ${entry.done ? '#22c55e' : color}`, background: entry.done ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, WebkitTapHighlightColor: 'transparent' }}>
                          {entry.done ? '✓' : ''}
                        </button>
                        <div style={{ textAlign: 'center', minWidth: 36, flexShrink: 0 }}>
                          <div style={{ color: color, fontSize: 12, fontWeight: 700 }}>{entry.plannedTime}</div>
                          <div style={{ fontSize: 18 }}>{emoji}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: T.text, fontSize: 13, fontWeight: 600, textDecoration: entry.done ? 'line-through' : 'none' }}>
                              {entry.label}
                            </span>
                            {entry.done && <span style={{ color: '#22c55e', fontSize: 11 }}>✓ {entry.doneTime}</span>}
                          </div>
                          {entry.doneValue && (
                            <span style={{ background: '#22c55e22', color: '#22c55e', fontSize: 11, borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>
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
          allEvents.length === 0 ? <Empty text="Aucun événement enregistré aujourd'hui" /> : (
            <div>
              {allEvents.map((ev, i) => (
                <div key={ev.id || i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${sp.color}`,
                  borderRadius: 9, padding: '10px 12px', marginBottom: 8,
                }}>
                  <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, minWidth: 38, marginTop: 1 }}>{ev.time}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.text, fontSize: 13 }}>{ev.text}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 5 }}>
                      <span style={{ color: sp.color, fontSize: 11, fontWeight: 700 }}>{slotDisplay(service, ev.patient.bedNumber)}</span>
                      <span style={{ color: T.muted, fontSize: 11 }}>· {ev.patient.initials}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── RDV ── */}
        {tab === 'rdv' && (
          allRdv.length === 0 ? <Empty text="Aucun RDV ou information planifiée" /> : (
            <div>
              {patients.map(p => {
                const rdvs = allRdv.filter(r => r.patient.id === p.id);
                if (!rdvs.length) return null;
                return (
                  <div key={p.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: sp.color, fontSize: 13, fontWeight: 700 }}>{slotDisplay(service, p.bedNumber)}</span>
                      <span style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>{p.initials}</span>
                      <span style={{ color: T.muted, fontSize: 12 }}>{p.gender} {p.age}a</span>
                    </div>
                    {rdvs.map(({ field, value }) => (
                      <div key={field.id} style={{
                        display: 'flex', gap: 10,
                        background: T.surface, border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: '9px 12px', marginBottom: 6, marginLeft: 4,
                      }}>
                        <span style={{ color: T.muted, fontSize: 12, minWidth: 100, flexShrink: 0 }}>{field.label}</span>
                        <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{String(value)}</span>
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
          onValidate={(id, doneTime, doneValue) => { handleValidate(id, doneTime, doneValue); setValidating(null); }}
          onClose={() => setValidating(null)}
        />
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
      <div style={{ color: T.muted, fontSize: 14 }}>{text}</div>
    </div>
  );
}
