/**
 * TourneeView.jsx — Module Tournée (Libéral / HAD)
 * Gestion locale des visites à domicile, cotation NGAP intégrée.
 * Données chiffrées AES-256 — 100% local, aucun serveur.
 */

import { useState, useEffect, useCallback } from 'react';
import { T, s, loadDarkPref } from '../../../theme.js';
import { secureGet, secureSet } from '../crypto.js';
import { timeStr, genId } from '../utils.jsx';
import { ACTES, MAJORATIONS, LETTER_VALUES, CATS, calcVisitTotal } from './ngap.js';

const C_LIB = '#ec4899';
const C_HAD  = '#8b5cf6';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Sélecteur NGAP ────────────────────────────────────────────────────────────

function NGAPSelector({ selected, majorations, onChangeActes, onChangeMaj, C }) {
  const [cat, setCat] = useState(null);
  const shown = cat ? ACTES.filter(a => a.cat === cat) : ACTES;

  return (
    <div>
      {/* Filtre catégorie */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
        {[null, ...CATS].map(c => (
          <button key={c ?? '__all'} onClick={() => setCat(c)}
            style={{ background:cat===c?C+'33':'none', border:`1px solid ${cat===c?C:T.border}`,
              borderRadius:7, color:cat===c?C:T.muted, padding:'3px 10px', fontSize:12, cursor:'pointer',
              WebkitTapHighlightColor:'transparent' }}>
            {c ?? 'Tous'}
          </button>
        ))}
      </div>

      {/* Actes */}
      {shown.map(acte => {
        const sel = selected.find(x => x.id === acte.id);
        const prix = (LETTER_VALUES[acte.code] * acte.coeff).toFixed(2);
        return (
          <div key={acte.id} onClick={() => onChangeActes(
            sel ? selected.filter(x => x.id !== acte.id) : [...selected, { ...acte, qty:1 }]
          )} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'9px 12px', marginBottom:4, borderRadius:8, cursor:'pointer',
            background:sel?C+'15':T.surface, border:`1px solid ${sel?C:T.border}`,
            WebkitTapHighlightColor:'transparent' }}>
            <div>
              <div style={{ color:sel?C:T.text, fontSize:13, fontWeight:sel?600:400 }}>{acte.label}</div>
              <div style={{ color:T.muted, fontSize:11 }}>{acte.code} ×{acte.coeff} = {prix}€</div>
            </div>
            {sel && <span style={{ color:C, fontSize:16 }}>✓</span>}
          </div>
        );
      })}

      {/* Majorations */}
      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>MAJORATIONS</div>
        {MAJORATIONS.map(m => {
          const sel = majorations.find(x => x.id === m.id);
          return (
            <div key={m.id} onClick={() => onChangeMaj(
              sel ? majorations.filter(x => x.id !== m.id) : [...majorations, m]
            )} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'8px 12px', marginBottom:4, borderRadius:8, cursor:'pointer',
              background:sel?C+'15':T.surface, border:`1px solid ${sel?C:T.border}`,
              WebkitTapHighlightColor:'transparent' }}>
              <div style={{ color:sel?C:T.text, fontSize:13 }}>{m.label}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ color:T.muted, fontSize:11 }}>
                  {m.flat ? `+${m.flat.toFixed(2)}€` : `×${m.factor}`}
                </span>
                {sel && <span style={{ color:C, fontSize:14 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fiche visite patient ──────────────────────────────────────────────────────

function PatientVisitModal({ patient, visitData, C, onClose, onSave }) {
  const defaultActes = patient.ordonnance?.[0]?.actes || [];
  const [actes,  setActes]  = useState(visitData?.actesFaits  || defaultActes);
  const [majs,   setMajs]   = useState(visitData?.majorations || []);
  const [notes,  setNotes]  = useState(visitData?.notes       || '');
  const [heure,  setHeure]  = useState(visitData?.heureDebut  || timeStr());
  const [showNGAP, setShowNGAP] = useState(false);

  const total = calcVisitTotal(actes, majs);
  const dark  = loadDarkPref();

  return (
    <div onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}
      style={{ position:'absolute', inset:0, background:T.bg, zIndex:200, display:'flex', flexDirection:'column', overflowY:'auto' }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:T.text, fontWeight:700, fontSize:17 }}>{patient.initials}</div>
          {patient.adresse && <div style={{ color:T.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{patient.adresse}</div>}
        </div>
        <div style={{ background:C+'22', border:`1px solid ${C}44`, borderRadius:10, padding:'5px 12px', textAlign:'center', flexShrink:0 }}>
          <div style={{ color:C, fontWeight:800, fontSize:18 }}>{total.toFixed(2)}€</div>
          <div style={{ color:C+'99', fontSize:10 }}>total visite</div>
        </div>
      </div>

      {/* Corps */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>

        {patient.allergie && (
          <div style={{ background:'#f43f5e15', border:'1px solid #f43f5e33', borderRadius:8, padding:'8px 12px', marginBottom:12 }}>
            <span style={{ color:'#f43f5e', fontSize:12 }}>⚠️ Allergie : {patient.allergie}</span>
          </div>
        )}

        {/* Heure */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ color:T.muted, fontSize:12, fontWeight:700, minWidth:50 }}>HEURE</span>
          <input type="time" value={heure} onChange={e=>setHeure(e.target.value)}
            style={{ ...s.input, width:120, textAlign:'center', fontSize:14 }} />
        </div>

        {/* Actes sélectionnés */}
        <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>ACTES</div>
        {actes.length === 0 && (
          <div style={{ color:T.muted, fontSize:13, marginBottom:8, fontStyle:'italic' }}>Aucun acte — utilisez Cotation NGAP ci-dessous</div>
        )}
        {actes.map(a => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', marginBottom:4, background:C+'15', border:`1px solid ${C}33`, borderRadius:8 }}>
            <div>
              <div style={{ color:T.text, fontSize:13 }}>{a.label}</div>
              <div style={{ color:T.muted, fontSize:11 }}>{a.code} ×{a.coeff}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C, fontSize:12, fontWeight:700 }}>{(LETTER_VALUES[a.code]*a.coeff).toFixed(2)}€</span>
              <button onClick={() => setActes(actes.filter(x=>x.id!==a.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
            </div>
          </div>
        ))}

        {majs.map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 12px', marginBottom:4, background:'#f9731615', border:'1px solid #f9731633', borderRadius:8 }}>
            <div style={{ color:T.text, fontSize:12 }}>{m.label}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#f97316', fontSize:12 }}>{m.flat?`+${m.flat.toFixed(2)}€`:`×${m.factor}`}</span>
              <button onClick={() => setMajs(majs.filter(x=>x.id!==m.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
            </div>
          </div>
        ))}

        <button onClick={() => setShowNGAP(v => !v)}
          style={{ width:'100%', background:C+'15', border:`1px dashed ${C}55`, borderRadius:8, color:C,
            padding:'10px', fontSize:13, cursor:'pointer', margin:'6px 0 12px', WebkitTapHighlightColor:'transparent' }}>
          {showNGAP ? '— Fermer cotation' : '＋ Cotation NGAP'}
        </button>

        {showNGAP && (
          <div style={{ background:dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)', borderRadius:10, border:`1px solid ${T.border}`, padding:12, marginBottom:14 }}>
            <NGAPSelector selected={actes} majorations={majs} onChangeActes={setActes} onChangeMaj={setMajs} C={C} />
          </div>
        )}

        {/* Notes */}
        <div style={{ color:T.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, marginBottom:6 }}>NOTES</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="—" rows={3}
          style={{ ...s.input, width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit', fontSize:13, minHeight:64 }} />

        <div style={{ color:T.muted, fontSize:10, marginTop:8, lineHeight:1.5 }}>
          Valeurs lettre-clé indicatives (AMI {LETTER_VALUES.AMI}€ · AIS {LETTER_VALUES.AIS}€) — vérifier les avenants CPAM.
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 16px 36px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, flexShrink:0 }}>
        <button onClick={onClose} style={{ flex:1, background:'none', border:`1px solid ${T.border}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer' }}>Annuler</button>
        <button onClick={() => onSave({ actesFaits:actes, majorations:majs, notes, heureDebut:heure, heureFin:timeStr(), status:'done', total })}
          style={{ flex:2, background:C, border:'none', borderRadius:12, color:'#fff', padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          ✓ Valider la visite
        </button>
      </div>
    </div>
  );
}

// ── Formulaire ajout patient ──────────────────────────────────────────────────

function AddPatientModal({ C, onClose, onSave }) {
  const [form, setForm] = useState({ initials:'', heurePrevu:'09:00', adresse:'', tel:'', allergie:'', notes:'' });
  const [actes, setActes]     = useState([]);
  const [showNGAP, setShowNGAP] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const ok  = form.initials.trim().length > 0;

  return (
    <div style={{ position:'absolute', inset:0, background:T.bg, zIndex:200, overflowY:'auto',
      padding:'20px 20px 48px', boxSizing:'border-box' }}>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
        <span style={{ color:T.text, fontSize:18, fontWeight:700 }}>Nouveau patient</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ ...s.label, marginBottom:6 }}>INITIALES</div>
            <input value={form.initials} onChange={e=>set('initials')(e.target.value.toUpperCase().slice(0,5))}
              placeholder="M.D" autoFocus
              style={{ ...s.input, width:'100%', boxSizing:'border-box', textAlign:'center', fontWeight:700, fontSize:16 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ ...s.label, marginBottom:6 }}>HEURE PRÉVUE</div>
            <input type="time" value={form.heurePrevu} onChange={e=>set('heurePrevu')(e.target.value)}
              style={{ ...s.input, width:'100%', boxSizing:'border-box' }} />
          </div>
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

        {/* Actes ordonnance */}
        <div>
          <div style={{ ...s.label, marginBottom:8 }}>ACTES PRESCRITS (ORDONNANCE)</div>
          {actes.map(a => (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'7px 10px', marginBottom:4, background:C+'15', border:`1px solid ${C}33`, borderRadius:8 }}>
              <div>
                <div style={{ color:T.text, fontSize:13 }}>{a.label}</div>
                <div style={{ color:T.muted, fontSize:11 }}>{a.code} ×{a.coeff} = {(LETTER_VALUES[a.code]*a.coeff).toFixed(2)}€</div>
              </div>
              <button onClick={() => setActes(actes.filter(x=>x.id!==a.id))}
                style={{ background:'none', border:'none', color:T.muted, fontSize:18, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
          ))}
          <button onClick={() => setShowNGAP(v=>!v)}
            style={{ width:'100%', background:C+'15', border:`1px dashed ${C}55`, borderRadius:8, color:C,
              padding:'9px', fontSize:13, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
            {showNGAP ? '— Fermer' : '＋ Ajouter actes de l\'ordonnance'}
          </button>
          {showNGAP && (
            <div style={{ marginTop:10, background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, padding:12 }}>
              <NGAPSelector selected={actes} majorations={[]} onChangeActes={setActes} onChangeMaj={()=>{}} C={C} />
            </div>
          )}
        </div>

        <button onClick={() => ok && onSave({
          id: genId(), serviceId: undefined,
          ...form,
          ordonnance: [{ id: genId(), actes }],
        })} disabled={!ok}
          style={{ background:ok?C:'#555', border:'none', borderRadius:12, color:'#fff',
            padding:'14px', fontSize:15, fontWeight:700, cursor:ok?'pointer':'default', opacity:ok?1:0.5 }}>
          Ajouter à la tournée
        </button>
      </div>
    </div>
  );
}

// ── Vue principale ────────────────────────────────────────────────────────────

export default function TourneeView({ service, cryptoKey, onBack }) {
  const C    = service.specialty === 'tournee_had' ? C_HAD : C_LIB;
  const DATE = todayStr();

  const [patients, setPatients] = useState([]);
  const [daily,    setDaily]    = useState({ visits:{}, order:[] });
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('list'); // 'list'|'patient'|'add'
  const [selPid,   setSelPid]   = useState(null);

  const PKEY = 'patients_' + service.id;
  const DKEY = 'tr_' + service.id + '_' + DATE;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pts = await secureGet(PKEY, cryptoKey) || [];
      const d   = await secureGet(DKEY, cryptoKey) || { visits:{}, order:[] };
      if (!d.order?.length) d.order = pts.map(p => p.id);
      setPatients(pts);
      setDaily(d);
    } finally { setLoading(false); }
  }, [PKEY, DKEY, cryptoKey]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function savePatients(next) {
    setPatients(next);
    await secureSet(PKEY, next, cryptoKey);
  }

  async function saveDaily(next) {
    setDaily(next);
    await secureSet(DKEY, next, cryptoKey);
  }

  async function handleAddPatient(data) {
    const p    = { ...data, serviceId: service.id };
    const next = [...patients, p];
    await savePatients(next);
    await saveDaily({ ...daily, order: [...daily.order, p.id] });
    setView('list');
  }

  async function handleSaveVisit(pid, visitData) {
    await saveDaily({ ...daily, visits: { ...daily.visits, [pid]: visitData } });
    setView('list');
  }

  async function moveStop(pid, dir) {
    const order = [...daily.order];
    const i = order.indexOf(pid);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await saveDaily({ ...daily, order });
  }

  async function handleDeletePatient(pid) {
    await savePatients(patients.filter(p => p.id !== pid));
    const visits = { ...daily.visits };
    delete visits[pid];
    await saveDaily({ ...daily, visits, order: daily.order.filter(id => id !== pid) });
    setView('list');
  }

  const ordered   = daily.order.map(id => patients.find(p => p.id === id)).filter(Boolean);
  const doneCount = ordered.filter(p => daily.visits[p.id]?.status === 'done').length;
  const totalEur  = ordered.reduce((s, p) => s + (daily.visits[p.id]?.total || 0), 0);
  const selPatient = patients.find(p => p.id === selPid);

  if (loading) return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:T.muted, fontSize:14 }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 10px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:4 }}>←</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:T.text, fontWeight:700, fontSize:17, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{service.name}</div>
            <div style={{ color:T.muted, fontSize:11 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' })}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color:C, fontWeight:800, fontSize:17 }}>{totalEur.toFixed(2)} €</div>
            <div style={{ color:T.muted, fontSize:11 }}>{doneCount}/{ordered.length} visites</div>
          </div>
        </div>
        {ordered.length > 0 && (
          <div style={{ height:4, background:T.border, borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', background:C, borderRadius:4, transition:'width 0.4s',
              width:`${ordered.length ? (doneCount/ordered.length)*100 : 0}%` }} />
          </div>
        )}
      </div>

      {/* Liste */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px' }}>
        {ordered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'52px 0', color:T.muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🚗</div>
            <div style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:6 }}>Tournée vide</div>
            <div style={{ fontSize:13 }}>Ajoutez vos patients avec le bouton +</div>
          </div>
        ) : ordered.map((p, idx) => {
          const visit = daily.visits[p.id];
          const done  = visit?.status === 'done';
          return (
            <div key={p.id} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>

              {/* Boutons réordonnancement */}
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <button onClick={() => moveStop(p.id, -1)} disabled={idx===0}
                  style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, color:T.muted,
                    width:24, height:24, fontSize:11, cursor:'pointer', padding:0, opacity:idx===0?0.25:1 }}>↑</button>
                <button onClick={() => moveStop(p.id, 1)} disabled={idx===ordered.length-1}
                  style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, color:T.muted,
                    width:24, height:24, fontSize:11, cursor:'pointer', padding:0, opacity:idx===ordered.length-1?0.25:1 }}>↓</button>
              </div>

              {/* Carte */}
              <div onClick={() => { setSelPid(p.id); setView('patient'); }}
                style={{ flex:1, background:done?C+'10':T.surface, border:`1px solid ${done?C+'55':T.border}`,
                  borderRadius:12, padding:'11px 14px', cursor:'pointer', WebkitTapHighlightColor:'transparent',
                  borderLeft:`3px solid ${done?C:T.border}` }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:done?C:T.border, color:done?'#fff':T.muted, borderRadius:5,
                      minWidth:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, padding:'0 4px' }}>{idx+1}</span>
                    <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>{p.initials}</span>
                    {p.allergie && <span style={{ color:'#f43f5e', fontSize:12 }} title={p.allergie}>⚠️</span>}
                  </div>
                  <div>
                    {done
                      ? <span style={{ color:C, fontSize:12, fontWeight:700 }}>✓ {visit.total?.toFixed(2)}€</span>
                      : <span style={{ color:T.muted, fontSize:12 }}>{p.heurePrevu}</span>}
                  </div>
                </div>

                {p.adresse && (
                  <div style={{ color:T.muted, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.adresse}</div>
                )}

                {/* Actes ordonnance (si visite non encore faite) */}
                {!done && (p.ordonnance?.[0]?.actes?.length > 0) && (
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:5 }}>
                    {p.ordonnance[0].actes.slice(0,3).map(a => (
                      <span key={a.id} style={{ background:C+'18', border:`1px solid ${C}30`, borderRadius:5,
                        color:C, fontSize:10, padding:'2px 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>
                        {a.label.split('—')[0].trim()}
                      </span>
                    ))}
                    {p.ordonnance[0].actes.length > 3 && (
                      <span style={{ color:T.muted, fontSize:10 }}>+{p.ordonnance[0].actes.length-3}</span>
                    )}
                  </div>
                )}

                {/* Notes visite effectuée */}
                {done && visit.notes ? (
                  <div style={{ color:T.muted, fontSize:11, marginTop:3, fontStyle:'italic' }}>
                    {visit.notes.slice(0,80)}{visit.notes.length>80?'…':''}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        <button onClick={() => setView('add')}
          style={{ width:'100%', background:C+'15', border:`1px dashed ${C}55`, borderRadius:12,
            color:C, padding:'13px', fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4,
            WebkitTapHighlightColor:'transparent' }}>
          + Ajouter un patient
        </button>
      </div>

      {/* Modales */}
      {view === 'patient' && selPatient && (
        <PatientVisitModal
          patient={selPatient}
          visitData={daily.visits[selPid]}
          C={C}
          onClose={() => setView('list')}
          onSave={data => handleSaveVisit(selPid, data)}
        />
      )}

      {view === 'add' && (
        <AddPatientModal C={C} onClose={() => setView('list')} onSave={handleAddPatient} />
      )}
    </div>
  );
}
