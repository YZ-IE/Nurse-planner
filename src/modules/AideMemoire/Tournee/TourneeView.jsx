/**
 * TourneeView.jsx — Tournée Libérale / HAD
 * Libéral : patients persistants + planning récurrent + cotation NGAP + historique
 * HAD     : placeholder (module distinct à venir)
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s, tk, SOLID, loadDarkPref } from '../../../theme.js';
import { Btn, IconBtn, Card, Chip, Field, Input, Textarea, Banner, toast } from '../../../ui/index.js';
import { secureGet, secureSet } from '../crypto.js';
import { timeStr, genId } from '../utils.jsx';
import { ACTES, MAJORATIONS, LETTER_VALUES, CATS, actePrice, calcVisitTotal } from './ngap.js';

const C_LIB = '#ec4899';
const C_HAD = '#8b5cf6';
const DAYS_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HISTORY_DAYS = 60; // nb de jours d'historique chargés

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateLabel(dateStr) {
  const today = todayStr();
  const d = new Date(dateStr + 'T12:00:00');
  if (dateStr === today) return "Aujourd'hui";
  return d.toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' });
}

/** Retourne les créneaux du jour pour un tableau de patients */
function getSlotsForDate(patients, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const slots = [];
  for (const p of patients) {
    for (const sl of p.schedule || []) {
      if (sl.dow === dow) slots.push({ patient: p, slot: sl, key: `${p.id}_${sl.id}` });
    }
  }
  return slots.sort((a, b) => a.slot.heure.localeCompare(b.slot.heure));
}

// ── Clé d'index des dates ─────────────────────────────────────────────────────
function datesIndexKey(serviceId) { return `tr_dates_${serviceId}`; }
function loadDatesIndex(serviceId) {
  try { return JSON.parse(localStorage.getItem(datesIndexKey(serviceId)) || '[]'); } catch { return []; }
}
function appendDateIndex(serviceId, date) {
  const idx = loadDatesIndex(serviceId);
  if (!idx.includes(date)) { idx.push(date); localStorage.setItem(datesIndexKey(serviceId), JSON.stringify(idx)); }
}

// ── NGAPSelector ──────────────────────────────────────────────────────────────
function NGAPSelector({ selected, majorations, onChangeActes, onChangeMaj, C }) {
  const [cat, setCat] = useState(null);
  const shown = cat ? ACTES.filter(a => a.cat === cat) : ACTES;

  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {[null, ...CATS].map(c => (
          <Chip key={c ?? '__all'} color={C} active={cat===c} onClick={() => setCat(c)}>
            {c ?? 'Tous'}
          </Chip>
        ))}
      </div>

      {shown.map(acte => {
        const sel = selected.find(x => x.id === acte.id);
        const prix = actePrice({ ...acte, qty:1 }).toFixed(2);
        return (
          <div key={acte.id} onClick={() =>
            onChangeActes(sel ? selected.filter(x=>x.id!==acte.id) : [...selected, { ...acte, qty:1 }])
          } style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            minHeight:tk.touch.min, boxSizing:'border-box', padding:'8px 12px', marginBottom:4,
            borderRadius:tk.radius.md, cursor:'pointer', WebkitTapHighlightColor:'transparent',
            background:sel?C+'15':T.surface, border:`1px solid ${sel?C:T.border}` }}>
            <div>
              <div style={{ color:sel?C:T.text, fontSize:tk.font.base, fontWeight:sel?tk.weight.semi:tk.weight.reg }}>{acte.label}</div>
              <div style={{ color:T.muted, fontSize:tk.font.xs, fontVariantNumeric:'tabular-nums' }}>
                {acte.flat ? `Forfait ${prix}€` : `${acte.code} ×${acte.coeff} = ${prix}€`}
              </div>
            </div>
            {sel && <span style={{ color:C, fontSize:tk.font.md }}>✓</span>}
          </div>
        );
      })}

      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        <div style={{ color:T.muted, fontSize:tk.font.xs, fontWeight:tk.weight.semi, letterSpacing:0.2, marginBottom:8 }}>Majorations</div>
        {MAJORATIONS.map(m => {
          const sel = majorations.find(x => x.id === m.id);
          return (
            <div key={m.id}>
              <div onClick={() =>
                onChangeMaj(sel ? majorations.filter(x=>x.id!==m.id) : [...majorations, { ...m, km: m.perKm ? 0 : undefined }])
              } style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                minHeight:tk.touch.min, boxSizing:'border-box', padding:'8px 12px', marginBottom: (sel && m.perKm) ? 0 : 4,
                borderRadius: sel&&m.perKm?`${tk.radius.md}px ${tk.radius.md}px 0 0`:tk.radius.md,
                cursor:'pointer', WebkitTapHighlightColor:'transparent',
                background:sel?C+'15':T.surface, border:`1px solid ${sel?C:T.border}` }}>
                <div style={{ color:sel?C:T.text, fontSize:tk.font.base }}>{m.label}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ color:T.muted, fontSize:tk.font.xs, fontVariantNumeric:'tabular-nums' }}>
                    {m.flat ? `+${m.flat.toFixed(2)}€` : m.factor ? `×${m.factor}` : `${m.perKm}€/km`}
                  </span>
                  {sel && <span style={{ color:C, fontSize:tk.font.sm }}>✓</span>}
                </div>
              </div>
              {sel && m.perKm && (
                <div style={{ background:C+'10', border:`1px solid ${C}`, borderTop:'none', borderRadius:`0 0 ${tk.radius.md}px ${tk.radius.md}px`, padding:'8px 12px 10px', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:T.muted, fontSize:tk.font.sm }}>Km :</span>
                    <input type="number" min={0} value={sel.km ?? 0}
                      onChange={e => onChangeMaj(majorations.map(x =>
                        x.id === 'ik' ? { ...x, km: Number(e.target.value) } : x
                      ))}
                      style={{ ...s.input, height:tk.touch.input, fontSize:tk.font.base, width:84, textAlign:'center', fontVariantNumeric:'tabular-nums' }} />
                    <span style={{ color:C, fontSize:tk.font.sm, fontWeight:tk.weight.bold, fontVariantNumeric:'tabular-nums' }}>
                      = {((sel.km||0) * m.perKm).toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VisitModal ────────────────────────────────────────────────────────────────
function VisitModal({ patient, slot, visitData, C, onClose, onSave }) {
  const defaultActes = patient.ordonnance?.[0]?.actes || [];
  const [actes,    setActes]    = useState(visitData?.actesFaits  || defaultActes);
  const [majs,     setMajs]     = useState(visitData?.majorations || []);
  const [notes,    setNotes]    = useState(visitData?.notes       || '');
  const [heure,    setHeure]    = useState(visitData?.heureDebut  || slot?.heure || timeStr());
  const [showNGAP, setShowNGAP] = useState(false);

  const total = calcVisitTotal(actes, majs);

  return (
    <div onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}
      style={{ position:'absolute', inset:0, background:T.bg, zIndex:200, display:'flex', flexDirection:'column' }}>

      <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:T.text, fontWeight:700, fontSize:16 }}>{patient.initials}</div>
          {patient.adresse && <div style={{ color:T.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{patient.adresse}</div>}
        </div>
        <div style={{ background:C+'22', border:`1px solid ${C}44`, borderRadius:10, padding:'5px 12px', textAlign:'center', flexShrink:0 }}>
          <div style={{ color:C, fontWeight:800, fontSize:17 }}>{total.toFixed(2)}€</div>
          <div style={{ color:C+'99', fontSize:10 }}>total visite</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
        {patient.allergie && (
          <div style={{ background:T.dangerDim, border:`1px solid ${T.danger}33`, borderRadius:8, padding:'8px 12px', marginBottom:12 }}>
            <span style={{ color:T.danger, fontSize:13, fontWeight:600 }}>⚠️ Allergie : {patient.allergie}</span>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ color:T.muted, fontSize:12, fontWeight:700 }}>HEURE</span>
          <input type="time" value={heure} onChange={e=>setHeure(e.target.value)}
            style={{ ...s.input, width:120, textAlign:'center', fontSize:14 }} />
        </div>

        <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>ACTES</div>
        {actes.length === 0 && <div style={{ color:T.muted, fontSize:13, marginBottom:8, fontStyle:'italic' }}>Aucun acte — utilisez Cotation NGAP</div>}
        {actes.map(a => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 11px', marginBottom:3, background:C+'15', border:`1px solid ${C}33`, borderRadius:8 }}>
            <div>
              <div style={{ color:T.text, fontSize:13 }}>{a.label}</div>
              <div style={{ color:T.muted, fontSize:11 }}>{a.flat ? 'Forfait' : `${a.code} ×${a.coeff}`}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C, fontSize:12, fontWeight:700 }}>{actePrice(a).toFixed(2)}€</span>
              <button onClick={() => setActes(actes.filter(x=>x.id!==a.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
            </div>
          </div>
        ))}

        {majs.map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 11px', marginBottom:3, background:T.warningDim, border:`1px solid ${T.warning}33`, borderRadius:8 }}>
            <div style={{ color:T.text, fontSize:12 }}>
              {m.label}{m.perKm && m.km ? ` (${m.km} km)` : ''}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:T.warning, fontSize:13 }}>
                {m.flat ? `+${m.flat.toFixed(2)}€` : m.factor ? `×${m.factor}` : `+${((m.km||0)*m.perKm).toFixed(2)}€`}
              </span>
              <button onClick={() => setMajs(majs.filter(x=>x.id!==m.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
            </div>
          </div>
        ))}

        <button onClick={() => setShowNGAP(v=>!v)}
          style={{ width:'100%', background:C+'15', border:`1px dashed ${C}55`, borderRadius:8, color:C,
            padding:'9px', fontSize:13, cursor:'pointer', margin:'6px 0 12px' }}>
          {showNGAP ? '— Fermer cotation' : '＋ Cotation NGAP'}
        </button>
        {showNGAP && (
          <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, padding:12, marginBottom:14 }}>
            <NGAPSelector selected={actes} majorations={majs} onChangeActes={setActes} onChangeMaj={setMajs} C={C} />
          </div>
        )}

        <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>NOTES</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="—" rows={3}
          style={{ ...s.input, width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', fontSize:13, minHeight:60 }} />

        <div style={{ color:T.muted, fontSize:10, marginTop:8, lineHeight:1.5 }}>
          Valeurs indicatives (AMI {LETTER_VALUES.AMI}€ · AIS {LETTER_VALUES.AIS}€ · IK 0.62€/km) — vérifier les avenants CPAM.
        </div>
      </div>

      <div style={{ padding:'10px 16px 34px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${T.border}`, borderRadius:12, color:T.muted, padding:'12px', fontSize:14, cursor:'pointer' }}>Annuler</button>
        <button onClick={() => onSave({ actesFaits:actes, majorations:majs, notes, heureDebut:heure, heureFin:timeStr(), status:'done', total })}
          style={{ flex:2, background:C, border:'none', borderRadius:12, color:'#fff', padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          ✓ Valider la visite
        </button>
      </div>
    </div>
  );
}

// ── ScheduleEditor ────────────────────────────────────────────────────────────
function ScheduleEditor({ schedule, onChange, C }) {
  const [addingDow, setAddingDow] = useState(null);
  const [newHeure,  setNewHeure]  = useState('09:00');

  function addSlot() {
    if (addingDow === null) return;
    onChange([...schedule, { id: genId(), dow: addingDow, heure: newHeure }]);
    setAddingDow(null);
    setNewHeure('09:00');
  }
  function removeSlot(id) { onChange(schedule.filter(s => s.id !== id)); }

  return (
    <div>
      {DAYS_FR.map((day, dow) => {
        const slots = schedule.filter(s => s.dow === dow).sort((a,b) => a.heure.localeCompare(b.heure));
        return (
          <div key={dow} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
            <div style={{ width:38, paddingTop:12, color:T.muted, fontSize:tk.font.sm, fontWeight:tk.weight.bold, flexShrink:0 }}>{day}</div>
            <div style={{ flex:1, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
              {slots.map(sl => (
                <div key={sl.id} style={{ display:'flex', alignItems:'center', gap:2, background:C+'20', border:`1px solid ${C}44`, borderRadius:tk.radius.md, padding:'0 2px 0 12px', minHeight:tk.touch.compact }}>
                  <span style={{ color:C, fontSize:tk.font.sm, fontWeight:tk.weight.semi, fontVariantNumeric:'tabular-nums' }}>{sl.heure}</span>
                  <IconBtn label="Retirer ce créneau" onClick={() => removeSlot(sl.id)} color={C+'99'} size={38} fontSize={17}>×</IconBtn>
                </div>
              ))}
              {addingDow === dow ? (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Input type="time" value={newHeure} onChange={e=>setNewHeure(e.target.value)}
                    style={{ width:110, fontVariantNumeric:'tabular-nums' }} />
                  <Btn color={C} size="sm" onClick={addSlot}>OK</Btn>
                  <IconBtn label="Annuler" onClick={() => setAddingDow(null)} size={tk.touch.compact} fontSize={20}>×</IconBtn>
                </div>
              ) : (
                <button onClick={() => setAddingDow(dow)}
                  style={{ background:'none', border:`1px dashed ${C}55`, borderRadius:tk.radius.md, color:C,
                    minWidth:tk.touch.compact, minHeight:tk.touch.compact, fontSize:tk.font.md, cursor:'pointer',
                    fontFamily:'inherit', WebkitTapHighlightColor:'transparent' }}>+</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PatientHistory ────────────────────────────────────────────────────────────
function PatientHistory({ patient, serviceId, cryptoKey, C }) {
  const [entries, setEntries] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const dates = loadDatesIndex(serviceId).sort((a,b) => b.localeCompare(a)).slice(0, HISTORY_DAYS);
      const result = [];
      for (const date of dates) {
        try {
          const d = await secureGet('tr_' + serviceId + '_' + date, cryptoKey);
          if (!d?.visits) continue;
          // chercher toutes les visites du patient ce jour
          for (const [key, visit] of Object.entries(d.visits)) {
            if (key.startsWith(patient.id + '_') && visit.status === 'done') {
              result.push({ date, ...visit });
            }
          }
        } catch {}
      }
      if (!cancelled) setEntries(result);
    }
    load();
    return () => { cancelled = true; };
  }, [patient.id, serviceId, cryptoKey]); // eslint-disable-line

  if (entries === null) return <div style={{ padding:'20px 0', textAlign:'center', color:T.muted, fontSize:tk.font.sm }}>Chargement…</div>;
  if (entries.length === 0) return <div style={{ padding:'20px 0', textAlign:'center', color:T.muted, fontSize:tk.font.sm }}>Aucune visite enregistrée</div>;

  return (
    <div>
      {entries.map((e, i) => (
        <Card key={i} accent={C} pad="sm" style={{ padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <div style={{ color:T.text, fontSize:tk.font.base, fontWeight:tk.weight.bold }}>{dateLabel(e.date)}</div>
            <div style={{ color:C, fontSize:tk.font.base, fontWeight:tk.weight.bold, fontVariantNumeric:'tabular-nums' }}>{e.total?.toFixed(2)} €</div>
          </div>
          <div style={{ color:T.muted, fontSize:tk.font.sm, fontVariantNumeric:'tabular-nums', marginBottom: e.actesFaits?.length ? 5 : 0 }}>
            {e.heureDebut} → {e.heureFin}
          </div>
          {e.actesFaits?.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {e.actesFaits.map(a => (
                <span key={a.id} style={{ background:C+'18', border:`1px solid ${C}30`, borderRadius:tk.radius.sm, color:C, fontSize:tk.font.xs, padding:'2px 8px' }}>
                  {a.label.split('—')[0].trim()}
                </span>
              ))}
            </div>
          )}
          {e.notes ? <div style={{ color:T.muted, fontSize:tk.font.xs, marginTop:5, fontStyle:'italic' }}>{e.notes}</div> : null}
        </Card>
      ))}
    </div>
  );
}

// ── PatientDetail ─────────────────────────────────────────────────────────────
function PatientDetail({ patient, serviceId, cryptoKey, C, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('info'); // 'info'|'planning'|'historique'
  const [confirmDel, setConfirmDel] = useState(false);

  const tabs = [['info','ℹ️ Info'], ['planning','📅 Planning'], ['historique','🕐 Historique']];

  return (
    <div style={{ position:'absolute', inset:0, background:T.bg, zIndex:150, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'14px 16px 0', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ color:T.text, fontWeight:700, fontSize:17 }}>{patient.initials}</div>
            {patient.adresse && <div style={{ color:T.muted, fontSize:12 }}>{patient.adresse}</div>}
          </div>
          <button onClick={onEdit}
            style={{ background:C+'22', border:`1px solid ${C}44`, borderRadius:8, color:C, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>
            ✏️ Modifier
          </button>
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, background:'none', border:'none', borderBottom:`2px solid ${tab===id?C:'transparent'}`,
                color:tab===id?C:T.muted, padding:'8px 4px', fontSize:12, fontWeight:tab===id?700:400, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
        {tab === 'info' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {patient.allergie && (
              <div style={{ background:T.dangerDim, border:`1px solid ${T.danger}33`, borderRadius:8, padding:'8px 12px' }}>
                <span style={{ color:T.danger, fontSize:13, fontWeight:600 }}>⚠️ Allergie : {patient.allergie}</span>
              </div>
            )}
            {[['Adresse', patient.adresse], ['Téléphone', patient.tel], ['Notes', patient.notes]].map(([l,v]) =>
              v ? (
                <div key={l}>
                  <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:3 }}>{l.toUpperCase()}</div>
                  <div style={{ color:T.text, fontSize:14 }}>{v}</div>
                </div>
              ) : null
            )}
            {patient.ordonnance?.[0]?.actes?.length > 0 && (
              <div>
                <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:6 }}>ORDONNANCE</div>
                {patient.ordonnance[0].actes.map(a => (
                  <div key={a.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', marginBottom:3, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8 }}>
                    <div style={{ color:T.text, fontSize:13 }}>{a.label}</div>
                    <div style={{ color:T.muted, fontSize:12 }}>{actePrice(a).toFixed(2)}€</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:8, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
              {!confirmDel
                ? <button onClick={() => setConfirmDel(true)}
                    style={{ background:'none', border:`1px solid ${T.danger}44`, borderRadius:10, color:T.danger, padding:'12px', fontSize:14, fontWeight:600, cursor:'pointer', width:'100%', minHeight:48 }}>
                    🗑 Supprimer ce patient
                  </button>
                : <div style={{ background:T.dangerDim, border:`1px solid ${T.danger}33`, borderRadius:10, padding:12 }}>
                    <div style={{ color:T.text, fontSize:13, marginBottom:10 }}>Supprimer définitivement {patient.initials} ?</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setConfirmDel(false)} style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, color:T.muted, padding:'9px', cursor:'pointer', fontSize:13 }}>Annuler</button>
                      <button onClick={onDelete} style={{ flex:1, background:SOLID.danger, border:'none', borderRadius:8, color:'#fff', padding:'12px', fontSize:14, fontWeight:700, minHeight:48, cursor:'pointer' }}>Supprimer</button>
                    </div>
                  </div>
              }
            </div>
          </div>
        )}

        {tab === 'planning' && (
          <div>
            <div style={{ color:T.muted, fontSize:12, marginBottom:14, lineHeight:1.5 }}>
              Jours et heures de passage récurrents. Un patient peut avoir plusieurs créneaux le même jour.
            </div>
            <ScheduleEditor schedule={patient.schedule || []} onChange={() => {}} C={C} />
            <div style={{ color:T.muted, fontSize:11, marginTop:10 }}>Planning modifiable via ✏️ Modifier</div>
          </div>
        )}

        {tab === 'historique' && (
          <PatientHistory patient={patient} serviceId={serviceId} cryptoKey={cryptoKey} C={C} />
        )}
      </div>
    </div>
  );
}

// ── AddEditPatient ────────────────────────────────────────────────────────────
function AddEditPatient({ initial, C, onClose, onSave }) {
  const [form, setForm] = useState({
    initials:   initial?.initials   || '',
    adresse:    initial?.adresse    || '',
    tel:        initial?.tel        || '',
    allergie:   initial?.allergie   || '',
    notes:      initial?.notes      || '',
  });
  const [schedule, setSchedule]   = useState(initial?.schedule || []);
  const [actes,    setActes]      = useState(initial?.ordonnance?.[0]?.actes || []);
  const [showNGAP, setShowNGAP]   = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const ok  = form.initials.trim().length > 0;
  const isEdit = !!initial;

  return (
    <div style={{ position:'absolute', inset:0, background:T.bg, zIndex:200, overflowY:'auto', padding:'18px 16px 52px', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
        <span style={{ color:T.text, fontSize:18, fontWeight:700 }}>{isEdit ? 'Modifier' : 'Nouveau patient'}</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <div style={{ ...s.label, marginBottom:6 }}>INITIALES *</div>
          <input value={form.initials} onChange={e=>set('initials')(e.target.value.toUpperCase().slice(0,5))}
            placeholder="M.D" autoFocus
            style={{ ...s.input, width:'100%', boxSizing:'border-box', textAlign:'center', fontWeight:700, fontSize:18 }} />
        </div>
        <div>
          <div style={{ ...s.label, marginBottom:6 }}>ADRESSE</div>
          <input value={form.adresse} onChange={e=>set('adresse')(e.target.value)} placeholder="12 rue de la Paix, Paris"
            style={{ ...s.input, width:'100%', boxSizing:'border-box' }} />
        </div>
        <div>
          <div style={{ ...s.label, marginBottom:6 }}>TÉLÉPHONE</div>
          <input value={form.tel} onChange={e=>set('tel')(e.target.value)} placeholder="06 xx xx xx xx" inputMode="tel"
            style={{ ...s.input, width:'100%', boxSizing:'border-box' }} />
        </div>
        <div>
          <div style={{ ...s.label, marginBottom:6 }}>⚠️ ALLERGIE / ALERTE</div>
          <input value={form.allergie} onChange={e=>set('allergie')(e.target.value)} placeholder="Pénicilline, iode…"
            style={{ ...s.input, width:'100%', boxSizing:'border-box' }} />
        </div>
        <div>
          <div style={{ ...s.label, marginBottom:6 }}>NOTES</div>
          <textarea value={form.notes} onChange={e=>set('notes')(e.target.value)} placeholder="Informations utiles…" rows={2}
            style={{ ...s.input, width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', fontSize:14 }} />
        </div>

        {/* Planning */}
        <div>
          <div style={{ ...s.label, marginBottom:10 }}>PLANNING DE PASSAGE</div>
          <ScheduleEditor schedule={schedule} onChange={setSchedule} C={C} />
        </div>

        {/* Ordonnance */}
        <div>
          <div style={{ ...s.label, marginBottom:8 }}>ACTES PRESCRITS (ORDONNANCE)</div>
          {actes.map(a => (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'7px 10px', marginBottom:3, background:C+'15', border:`1px solid ${C}33`, borderRadius:8 }}>
              <div>
                <div style={{ color:T.text, fontSize:13 }}>{a.label}</div>
                <div style={{ color:T.muted, fontSize:11 }}>{actePrice(a).toFixed(2)}€</div>
              </div>
              <button onClick={() => setActes(actes.filter(x=>x.id!==a.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
          ))}
          <button onClick={() => setShowNGAP(v=>!v)}
            style={{ width:'100%', background:C+'15', border:`1px dashed ${C}55`, borderRadius:8, color:C,
              padding:'9px', fontSize:13, cursor:'pointer' }}>
            {showNGAP ? '— Fermer' : '＋ Actes de l\'ordonnance'}
          </button>
          {showNGAP && (
            <div style={{ marginTop:8, background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, padding:12 }}>
              <NGAPSelector selected={actes} majorations={[]} onChangeActes={setActes} onChangeMaj={()=>{}} C={C} />
            </div>
          )}
        </div>

        <button onClick={() => ok && onSave({ ...form, schedule, ordonnance: [{ id: initial?.ordonnance?.[0]?.id || genId(), actes }] })}
          disabled={!ok}
          style={{ background:ok?C:'#555', border:'none', borderRadius:12, color:'#fff',
            padding:'14px', fontSize:15, fontWeight:700, cursor:ok?'pointer':'default', opacity:ok?1:0.5 }}>
          {isEdit ? '✓ Enregistrer les modifications' : 'Ajouter à la tournée'}
        </button>
      </div>
    </div>
  );
}

// ── Onglet Patients ───────────────────────────────────────────────────────────
function PatientsTab({ patients, serviceId, cryptoKey, C, onAdd, onEdit, onDelete }) {
  const [detailPid, setDetailPid] = useState(null);
  const detailPatient = patients.find(p => p.id === detailPid);

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px' }}>
      {patients.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 0', color:T.muted }}>
          <div style={{ fontSize:44, marginBottom:10 }}>👤</div>
          <div style={{ color:T.text, fontSize:tk.font.md, fontWeight:tk.weight.semi, marginBottom:5 }}>Aucun patient enregistré</div>
          <div style={{ fontSize:tk.font.sm }}>Ajoutez vos patients avec le bouton +</div>
        </div>
      ) : patients.map(p => {
        const nextSlot = (() => {
          const today = new Date();
          for (let i = 0; i < 7; i++) {
            const d = new Date(today); d.setDate(today.getDate() + i);
            const dow = d.getDay();
            const slots = (p.schedule || []).filter(s => s.dow === dow).sort((a,b) => a.heure.localeCompare(b.heure));
            if (slots.length) return { day: i === 0 ? "Auj." : DAYS_FR[dow], heure: slots[0].heure };
          }
          return null;
        })();

        return (
          <Card key={p.id} accent={C} onClick={() => setDetailPid(p.id)} style={{ padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.md }}>{p.initials}</span>
                {p.allergie && <span style={{ color:T.danger, fontSize:tk.font.sm }}>⚠️</span>}
              </div>
              {nextSlot && (
                <div style={{ background:C+'18', border:`1px solid ${C}30`, borderRadius:tk.radius.sm, padding:'3px 10px' }}>
                  <span style={{ color:C, fontSize:tk.font.sm, fontWeight:tk.weight.semi, fontVariantNumeric:'tabular-nums' }}>{nextSlot.day} {nextSlot.heure}</span>
                </div>
              )}
            </div>
            {p.adresse && <div style={{ color:T.muted, fontSize:tk.font.sm, marginTop:2 }}>{p.adresse}</div>}
            {(p.schedule || []).length > 0 && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:5 }}>
                {DAYS_FR.map((day, dow) => {
                  const slots = (p.schedule || []).filter(s => s.dow === dow);
                  if (!slots.length) return null;
                  return (
                    <span key={dow} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:tk.radius.sm, fontSize:tk.font.xs, padding:'2px 8px', color:T.muted, fontVariantNumeric:'tabular-nums' }}>
                      {day} {slots.map(s=>s.heure).join(' · ')}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {detailPatient && (
        <PatientDetail
          patient={detailPatient}
          serviceId={serviceId}
          cryptoKey={cryptoKey}
          C={C}
          onClose={() => setDetailPid(null)}
          onEdit={() => { onEdit(detailPatient); setDetailPid(null); }}
          onDelete={() => { onDelete(detailPatient.id); setDetailPid(null); }}
        />
      )}
    </div>
  );
}

// ── Onglet Tournée du jour ────────────────────────────────────────────────────
function DayTab({ patients, daily, C, slots, onVisit, onMoveSlot }) {
  const doneCount = slots.filter(sl => daily.visits[sl.key]?.status === 'done').length;
  const totalEur  = slots.reduce((s, sl) => s + (daily.visits[sl.key]?.total || 0), 0);

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px' }}>
      {/* Résumé journée */}
      {slots.length > 0 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12,
          background:C+'10', border:`1px solid ${C}30`, borderRadius:tk.radius.md, padding:'10px 14px' }}>
          <span style={{ color:T.muted, fontSize:tk.font.sm }}>{doneCount}/{slots.length} visites effectuées</span>
          <span style={{ color:C, fontWeight:tk.weight.black, fontSize:tk.font.md, fontVariantNumeric:'tabular-nums' }}>{totalEur.toFixed(2)} €</span>
        </div>
      )}

      {slots.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 0', color:T.muted }}>
          <div style={{ fontSize:44, marginBottom:10 }}>📅</div>
          <div style={{ color:T.text, fontSize:tk.font.md, fontWeight:tk.weight.semi, marginBottom:5 }}>
            Aucun passage prévu {DAYS_FULL[new Date().getDay()]}
          </div>
          <div style={{ fontSize:tk.font.sm }}>Programmez les jours via l'onglet Patients</div>
        </div>
      ) : slots.map((sl, idx) => {
        const visit = daily.visits[sl.key];
        const done  = visit?.status === 'done';
        const p     = sl.patient;
        return (
          <div key={sl.key} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <IconBtn label="Monter" onClick={() => onMoveSlot(sl.key, -1)} disabled={idx===0}
                variant="outline" size={tk.touch.compact} fontSize={15}>↑</IconBtn>
              <IconBtn label="Descendre" onClick={() => onMoveSlot(sl.key, 1)} disabled={idx===slots.length-1}
                variant="outline" size={tk.touch.compact} fontSize={15}>↓</IconBtn>
            </div>
            <div onClick={() => onVisit(sl)} style={{ flex:1, background:done?C+'10':T.surface,
              border:`1px solid ${done?C+'55':T.border}`, borderLeft:`3px solid ${done?C:T.border}`,
              borderRadius:tk.radius.lg, padding:'12px 14px', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.md }}>{p.initials}</span>
                  {p.allergie && <span style={{ color:T.danger, fontSize:tk.font.sm }}>⚠️</span>}
                </div>
                <div>
                  {done
                    ? <span style={{ color:C, fontSize:tk.font.sm, fontWeight:tk.weight.bold, fontVariantNumeric:'tabular-nums' }}>✓ {visit.total?.toFixed(2)}€</span>
                    : <span style={{ color:T.muted, fontSize:tk.font.base, fontWeight:tk.weight.semi, fontVariantNumeric:'tabular-nums' }}>{sl.slot.heure}</span>}
                </div>
              </div>
              {p.adresse && <div style={{ color:T.muted, fontSize:tk.font.sm, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.adresse}</div>}
              {!done && p.ordonnance?.[0]?.actes?.length > 0 && (
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                  {p.ordonnance[0].actes.slice(0,3).map(a => (
                    <span key={a.id} style={{ background:C+'18', border:`1px solid ${C}30`, borderRadius:tk.radius.sm, color:C, fontSize:tk.font.xs, padding:'2px 8px' }}>
                      {a.label.split('—')[0].trim().slice(0,22)}
                    </span>
                  ))}
                  {p.ordonnance[0].actes.length > 3 && <span style={{ color:T.muted, fontSize:tk.font.xs }}>+{p.ordonnance[0].actes.length-3}</span>}
                </div>
              )}
              {done && visit.notes ? <div style={{ color:T.muted, fontSize:tk.font.xs, marginTop:3, fontStyle:'italic' }}>{visit.notes.slice(0,70)}{visit.notes.length>70?'…':''}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Placeholder HAD ───────────────────────────────────────────────────────────
function HADPlaceholder({ service, onBack }) {
  const PLANNED = [
    'Coordination multi-intervenants (IDE, kiné, médecin)',
    'Plans de soins continus sur plusieurs semaines',
    'Suivi des passages et transmissions HAD',
    'Gestion des prescriptions et renouvellements',
  ];
  return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'10px 16px 10px 8px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:6 }}>
        <IconBtn label="Retour" onClick={onBack} fontSize={22}>←</IconBtn>
        <div>
          <div style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.lg }}>{service.name}</div>
          <div style={{ color:T.muted, fontSize:tk.font.xs }}>Hospitalisation à Domicile</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'28px 20px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
        <div style={{ fontSize:52 }}>🏠</div>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.lg, marginBottom:6 }}>Module HAD</div>
          <span style={{ background:T.warningDim, color:T.warning, fontSize:tk.font.xs, fontWeight:tk.weight.bold, borderRadius:tk.radius.sm, padding:'3px 10px', letterSpacing:0.5 }}>EN DÉVELOPPEMENT</span>
        </div>
        <Card style={{ width:'100%', maxWidth:360, marginBottom:0, boxSizing:'border-box' }}>
          <div style={{ color:T.muted, fontSize:tk.font.xs, fontWeight:tk.weight.semi, letterSpacing:0.2, marginBottom:10 }}>Fonctionnalités prévues</div>
          {PLANNED.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
              <span style={{ color:'#8b5cf6', fontSize:tk.font.base, flexShrink:0 }}>◦</span>
              <span style={{ color:T.muted, fontSize:tk.font.sm, lineHeight:1.5 }}>{f}</span>
            </div>
          ))}
        </Card>
        <Banner kind="info" icon="💡" title="En attendant" style={{ width:'100%', maxWidth:360, marginBottom:0, boxSizing:'border-box' }}>
          Le mode <strong style={{ color:T.text }}>Tournée Libérale</strong> couvre déjà la majorité des besoins HAD : organisation des visites, transmissions et soins journaliers. Supprimez ce service et recréez-le en type "Libéral" pour l'utiliser dès maintenant.
        </Banner>
        <Btn color={C_HAD} size="lg" full onClick={onBack} style={{ maxWidth:360 }}>
          ← Retour aux services
        </Btn>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function TourneeView({ service, cryptoKey, onBack }) {
  if (service.specialty === 'tournee_had') return <HADPlaceholder service={service} onBack={onBack} />;

  const C    = C_LIB;
  const DATE = todayStr();

  const [patients,  setPatients]  = useState([]);
  const [daily,     setDaily]     = useState({ visits:{}, dayOrder:{} }); // dayOrder: {key: overrideIdx}
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('jour'); // 'jour'|'patients'
  const [addEdit,   setAddEdit]   = useState(null);   // null | patient object (edit) | true (add)
  const [visitSel,  setVisitSel]  = useState(null);   // {patient, slot, key}

  const PKEY = 'patients_' + service.id;
  const DKEY = 'tr_' + service.id + '_' + DATE;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pts = await secureGet(PKEY, cryptoKey) || [];
      const d   = await secureGet(DKEY, cryptoKey) || { visits:{}, dayOrder:{} };
      setPatients(pts);
      setDaily(d);
    } finally { setLoading(false); }
  }, [PKEY, DKEY, cryptoKey]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function savePatients(next) { setPatients(next); await secureSet(PKEY, next, cryptoKey); }
  async function saveDaily(next)    { setDaily(next);    await secureSet(DKEY, next, cryptoKey); appendDateIndex(service.id, DATE); }

  async function handleSavePatient(data) {
    if (addEdit === true) {
      const p = { id: genId(), serviceId: service.id, ...data };
      await savePatients([...patients, p]);
    } else {
      await savePatients(patients.map(p => p.id === addEdit.id ? { ...p, ...data } : p));
    }
    setAddEdit(null);
  }

  async function handleDeletePatient(pid) {
    await savePatients(patients.filter(p => p.id !== pid));
  }

  async function handleSaveVisit(key, visitData) {
    await saveDaily({ ...daily, visits: { ...daily.visits, [key]: visitData } });
    setVisitSel(null);
  }

  async function handleMoveSlot(key, dir) {
    const order = [...sortedSlots.map(sl => sl.key)];
    const i = order.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await saveDaily({ ...daily, dayOrder: order });
  }

  // Slots du jour triés selon dayOrder (tableau de clés)
  const sortedSlots = (() => {
    const base = getSlotsForDate(patients, DATE);
    const order = daily.dayOrder;
    if (!Array.isArray(order) || order.length === 0) return base;
    const mapped = order.map(k => base.find(sl => sl.key === k)).filter(Boolean);
    const rest   = base.filter(sl => !order.includes(sl.key));
    return [...mapped, ...rest];
  })();

  if (loading) return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:T.muted, fontSize:tk.font.base }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'10px 12px 0 8px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <IconBtn label="Retour" onClick={onBack} fontSize={22}>←</IconBtn>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.lg, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{service.name}</div>
            <div style={{ color:T.muted, fontSize:tk.font.xs }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' })}
            </div>
          </div>
          {tab === 'patients' && (
            <IconBtn label="Ajouter un patient" onClick={() => setAddEdit(true)} color={C} variant="soft" fontSize={24}>+</IconBtn>
          )}
        </div>
        {/* Tabs */}
        <div style={{ display:'flex' }}>
          {[['jour','🗓 Tournée du jour'],['patients','👤 Patients']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, background:'none', border:'none', borderBottom:`2px solid ${tab===id?C:'transparent'}`,
                color:tab===id?C:T.muted, padding:'12px 4px', minHeight:44, fontSize:tk.font.sm,
                fontWeight:tab===id?tk.weight.bold:tk.weight.med, cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {tab === 'jour' && (
        <DayTab
          patients={patients}
          daily={daily}
          slots={sortedSlots}
          C={C}
          onVisit={sl => setVisitSel(sl)}
          onMoveSlot={handleMoveSlot}
        />
      )}
      {tab === 'patients' && (
        <PatientsTab
          patients={patients}
          serviceId={service.id}
          cryptoKey={cryptoKey}
          C={C}
          onAdd={() => setAddEdit(true)}
          onEdit={p => setAddEdit(p)}
          onDelete={handleDeletePatient}
        />
      )}

      {/* Modal ajout/édition patient */}
      {addEdit !== null && (
        <AddEditPatient
          initial={addEdit === true ? null : addEdit}
          C={C}
          onClose={() => setAddEdit(null)}
          onSave={handleSavePatient}
        />
      )}

      {/* Modal visite */}
      {visitSel && (
        <VisitModal
          patient={visitSel.patient}
          slot={visitSel.slot}
          visitData={daily.visits[visitSel.key]}
          C={C}
          onClose={() => setVisitSel(null)}
          onSave={data => handleSaveVisit(visitSel.key, data)}
        />
      )}
    </div>
  );
}
