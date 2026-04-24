import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { getTheme, loadDarkPref, saveDarkPref } from './theme.js';
import { loadFavs, toggleFav } from './favorites.js';

/* ─── Imports dynamiques — chaque module chargé à la demande ────────────── */
const Urgences     = lazy(() => import('./modules/Urgences/index.jsx'));
const Soins        = lazy(() => import('./modules/Soins/index.jsx'));
const Organisation = lazy(() => import('./modules/Organisation/index.jsx'));
const Formation    = lazy(() => import('./modules/Formation/index.jsx'));
const ECG          = lazy(() => import('./modules/ECG/index.jsx'));
const AideMemoire  = lazy(() => import('./modules/AideMemoire/index.jsx'));
const Medicaments  = lazy(() => import('./modules/Medicaments/index.jsx'));

/* ─── Modules ───────────────────────────────────────────────────────────── */
const MODULES = [
  { id:'urg',     label:'Urgences',     icon:'🚨',
    color:'#FF5A35', bgL:'#FFF2EE', bgD:'#1F0E08',
    desc:'RCP · AVC · Anaphylaxie · Sepsis' },
  { id:'ecg',     label:'ECG',          icon:'💓',
    color:'#00C47A', bgL:'#EDFAF5', bgD:'#071A10',
    desc:'Rythmes · Tracés · Quiz', badge:'NOUVEAU' },
  { id:'soins',   label:'Soins',        icon:'💉',
    color:'#38B6FF', bgL:'#EAF6FF', bgD:'#08182A',
    desc:'Pansements · PAC · Piccline · Timers' },
  { id:'orga',    label:'Organisation', icon:'📋',
    color:'#2DD47A', bgL:'#EDFAF4', bgD:'#071A10',
    desc:'Planning · SBAR · Transmissions' },
  { id:'form',    label:'Formation',    icon:'🎓',
    color:'#FBBF24', bgL:'#FFFBEA', bgD:'#1C1404',
    desc:'Quiz · Cas cliniques · Lexique' },
  { id:'meds',    label:'Médicaments',  icon:'💊',
    color:'#D946EF', bgL:'#FCF0FF', bgD:'#1A0820',
    desc:'Fiches · Posologies · Surveillance', badge:'NOUVEAU' },
  { id:'aidemem', label:'Aide-Mémoire', icon:'🗒️',
    color:'#6366F1', bgL:'#F0F0FF', bgD:'#10102A',
    desc:'Notes chiffrées · Services · Soins' },
];

/* ─── Index de recherche ─────────────────────────────────────────────────── */
const SEARCH_INDEX = [
  { q:['rcp','arrêt cardiaque','réanimation','acr'],              mod:'urg',   label:'RCP' },
  { q:['anaphylaxie','allergie','choc allergique'],               mod:'urg',   label:'Anaphylaxie' },
  { q:['sepsis','choc septique'],                                 mod:'urg',   label:'Sepsis' },
  { q:['avc','stroke','hémiplégie'],                              mod:'urg',   label:'AVC' },
  { q:['hypoglycémie','glycémie','sucre'],                        mod:'urg',   label:'Hypoglycémie' },
  { q:['convulsion','épilepsie'],                                 mod:'urg',   label:'Convulsions' },
  { q:['oap','oedème pulmonaire','détresse respiratoire'],        mod:'urg',   label:'OAP' },
  { q:['timer','chrono','antiseptique'],                          mod:'soins', label:'Timers de soins' },
  { q:['pansement','plaie','escarre','cicatrice'],                mod:'soins', label:'Pansements' },
  { q:['piccline','midline','voie centrale'],                     mod:'soins', label:'Piccline / Midline' },
  { q:['pac','chambre implantable'],                              mod:'soins', label:'PAC — Chambre implantable' },
  { q:['kta','cathéter artériel'],                                mod:'soins', label:'KTA — Cathéter artériel' },
  { q:['dialyse','hémodialyse','rein'],                           mod:'soins', label:'Dialyse' },
  { q:['sbar','transmission','relève'],                           mod:'orga',  label:'SBAR' },
  { q:['planning','journée','tâche','horaire'],                   mod:'orga',  label:'Planning de la journée' },
  { q:['transmissions','ciblées','dla'],                          mod:'orga',  label:'Transmissions ciblées' },
  { q:['normes','biologie','bio','labo'],                         mod:'orga',  label:'Normes biologiques' },
  { q:['5b','cinq b','checklist médicament'],                     mod:'orga',  label:'Checklist 5B médicaments' },
  { q:['morphine','opioïde','antalgique'],                        mod:'meds',  label:'Morphine' },
  { q:['adrénaline','epinephrine'],                               mod:'meds',  label:'Adrénaline' },
  { q:['noradrénaline','vasopresseur','choc'],                    mod:'meds',  label:'Noradrénaline' },
  { q:['furosémide','diurétique','lasix'],                        mod:'meds',  label:'Furosémide' },
  { q:['midazolam','sédatif','hypnovel'],                         mod:'meds',  label:'Midazolam' },
  { q:['héparine','anticoagulant'],                               mod:'meds',  label:'Héparine' },
  { q:['insuline','diabète','glycémie'],                          mod:'meds',  label:'Insuline' },
  { q:['paracétamol','doliprane','antipyrétique'],                mod:'meds',  label:'Paracétamol' },
  { q:['médicament','fiche','posologie'],                         mod:'meds',  label:'Fiches médicaments' },
];

/* ─── Durée transitions ──────────────────────────────────────────────────── */
const DUR = 310; // ms — durée totale slide

/* ─── Helpers recherche ──────────────────────────────────────────────────── */
function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function fuzzyMatch(h, n) {
  const hh = normalize(h), nn = normalize(n);
  if (hh.includes(nn)) return true;
  if (nn.length >= 5) {
    for (let i = 0; i < nn.length - 2; i++) {
      if (hh.includes(nn.slice(0, i) + nn.slice(i + 1))) return true;
    }
  }
  return false;
}
function globalSearch(query) {
  if (!query || query.length < 2) return [];
  return SEARCH_INDEX
    .filter(e => e.q.some(kw => fuzzyMatch(kw, query) || fuzzyMatch(query, kw)))
    .slice(0, 6);
}

/* ─── CSS global ─────────────────────────────────────────────────────────── */
const makeCSS = (dark) => `
  /* ── Slide transitions ────────────────────────────────────────────────── */
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes homeEnter {
    from { transform: translateX(-22px) scale(0.98); opacity: 0; }
    to   { transform: translateX(0) scale(1);        opacity: 1; }
  }
  @keyframes homeExit {
    from { transform: translateX(0) scale(1);        opacity: 1; }
    to   { transform: translateX(-22px) scale(0.98); opacity: 0; }
  }

  /* ── Entrée initiale home ─────────────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes themePulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.18) rotate(12deg); }
    100% { transform: scale(1); }
  }

  /* ── Classes animation ────────────────────────────────────────────────── */
  .screen-slide-in {
    animation: slideInRight ${DUR}ms cubic-bezier(0.32, 0.72, 0, 1) both;
  }
  .screen-slide-out {
    animation: slideOutRight ${DUR}ms cubic-bezier(0.32, 0.72, 0, 1) both;
    pointer-events: none;
  }
  .home-enter {
    animation: homeEnter ${DUR}ms cubic-bezier(0.32, 0.72, 0, 1) both;
  }
  .home-exit {
    animation: homeExit ${DUR}ms cubic-bezier(0.32, 0.72, 0, 1) both;
    pointer-events: none;
  }

  /* ── Cartes modules ───────────────────────────────────────────────────── */
  .mod-card {
    background: ${dark ? '#161C26' : '#FFFFFF'};
    border: 1px solid ${dark ? '#232D3F' : '#E4E9F2'};
    border-radius: 20px;
    padding: 18px 16px 14px;
    cursor: pointer;
    position: relative;
    box-shadow: ${dark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 14px rgba(0,0,0,0.045)'};
    transition: transform 0.14s ease, box-shadow 0.14s ease;
    animation: fadeUp 0.35s ease both;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .mod-card:active {
    transform: scale(0.95);
    box-shadow: ${dark ? '0 1px 6px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.07)'};
  }

  /* ── Cartes favoris ───────────────────────────────────────────────────── */
  .fav-card {
    background: ${dark ? '#161C26' : '#FFFFFF'};
    border: 1px solid ${dark ? '#232D3F' : '#E4E9F2'};
    border-radius: 16px;
    padding: 12px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: ${dark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)'};
    transition: transform 0.14s ease;
    animation: fadeUp 0.3s ease both;
    -webkit-tap-highlight-color: transparent;
  }
  .fav-card:active { transform: scale(0.97); }

  /* ── Résultats recherche ──────────────────────────────────────────────── */
  .search-result-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 16px; cursor: pointer;
    transition: background 0.1s;
  }
  .search-result-row:active { background: ${dark ? '#1C2333' : '#F0F3F8'}; }

  /* ── Badge pill ───────────────────────────────────────────────────────── */
  .pill-badge {
    position: absolute; top: 12px; right: 12px;
    background: #0D1117; color: #FFF;
    font-size: 8.5px; font-weight: 700;
    letter-spacing: 0.8px; padding: 3px 8px;
    border-radius: 100px; font-family: monospace; text-transform: uppercase;
  }
  .toggle-btn-anim { animation: themePulse 0.35s ease; }
`;

/* ─── Composant principal ────────────────────────────────────────────────── */
export default function App() {
  const [isDark,      setIsDark]      = useState(loadDarkPref);

  // Phase de transition :
  //   'idle'      → affichage stable
  //   'exiting'   → home sort (homeExit) avant d'afficher le module
  //   'entering'  → module entre (slideInRight)
  //   'returning' → module sort (slideOutRight), home va rentrer
  //   'homing'    → home rentre (homeEnter)
  const [phase,       setPhase]       = useState('idle');
  const [active,      setActive]      = useState(null);
  const [pendingMod,  setPendingMod]  = useState(null); // module en attente d'affichage
  const [initialTool, setInitialTool] = useState(null);
  const [search,      setSearch]      = useState('');
  const [favs,        setFavs]        = useState(loadFavs);
  const [toggling,    setToggling]    = useState(false);
  const backOverride = useRef(null);
  const timerRef    = useRef(null);

  const TH = getTheme(isDark);

  /* Nettoyage timers au démontage */
  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* Couleur status bar Android */
  useEffect(() => {
    document.body.style.background = TH.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0D1117' : '#F0F3F8');
  }, [isDark, TH.bg]);

  /* Bouton retour physique Capacitor */
  useEffect(() => {
    let handler = null;
    const setup = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        handler = await CapApp.addListener('backButton', () => {
          if (backOverride.current) { backOverride.current(); }
          else if (active !== null)  { handleBack(); }
          else                       { CapApp.exitApp(); }
        });
      } catch {}
    };
    setup();
    return () => { if (handler) handler.remove(); };
  }, [active]);

  /* ── Ouvrir un module (avec transition) ─────────────────────────────── */
  function openModule(mod, toolId = null) {
    if (phase !== 'idle') return; // ignorer si déjà en transition
    setPendingMod({ mod, toolId });
    setPhase('exiting');          // 1. home sort
    timerRef.current = setTimeout(() => {
      setActive(mod);             // 2. module monté
      setInitialTool(toolId);
      setPhase('entering');       // 3. module entre
      timerRef.current = setTimeout(() => setPhase('idle'), DUR);
    }, DUR);
  }

  /* ── Retour (avec transition) ───────────────────────────────────────── */
  const handleBack = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('returning');        // 1. module sort
    timerRef.current = setTimeout(() => {
      setActive(null);            // 2. home monté
      setInitialTool(null);
      setPhase('homing');         // 3. home entre
      timerRef.current = setTimeout(() => setPhase('idle'), DUR);
    }, DUR);
  }, [phase]);

  function handleFavChange() { setFavs(loadFavs()); }

  function toggleDark() {
    setToggling(true);
    setTimeout(() => setToggling(false), 400);
    setIsDark(v => { saveDarkPref(!v); return !v; });
  }

  /* ── Rendu module actif ─────────────────────────────────────────────── */
  const renderModule = () => {
    const props = {
      onBack: handleBack,
      initialTool,
      onFavChange: handleFavChange,
      onBackOverride: (fn) => { backOverride.current = fn; },
    };
    switch (active) {
      case 'urg':     return <Urgences     {...props} />;
      case 'ecg':     return <ECG          onBack={handleBack} />;
      case 'soins':   return <Soins        {...props} />;
      case 'orga':    return <Organisation {...props} />;
      case 'form':    return <Formation    {...props} />;
      case 'meds':    return <Medicaments  {...props} />;
      case 'aidemem': return <AideMemoire  onBack={handleBack} onBackOverride={props.onBackOverride} />;
      default: return null;
    }
  };

  /* ── Classes CSS selon la phase ─────────────────────────────────────── */
  const moduleClass = phase === 'entering'  ? 'screen-slide-in'
                    : phase === 'returning' ? 'screen-slide-out'
                    : '';
  const homeClass   = phase === 'exiting'   ? 'home-exit'
                    : phase === 'homing'    ? 'home-enter'
                    : '';

  const modBg = (m) => isDark ? m.bgD : m.bgL;

  /* ── Vue module ─────────────────────────────────────────────────────── */
  if (active) return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', background:TH.bg }}>
      <style>{makeCSS(isDark)}</style>
      <style>{'@keyframes spin { to { transform:rotate(360deg); } }'}</style>
      <div className={moduleClass} style={{ height:'100%', overflowY:'auto' }}>
        <Suspense fallback={
          <div style={{
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            height:'100%', gap:12,
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              border:`3px solid ${TH.border}`,
              borderTopColor: MODULES.find(m=>m.id===active)?.color || '#38B6FF',
              animation:'spin 0.7s linear infinite',
            }}/>
            <span style={{ color:TH.muted, fontSize:13, fontWeight:500 }}>Chargement…</span>
          </div>
        }>
          {renderModule()}
        </Suspense>
      </div>
    </div>
  );

  /* ── Vue home ───────────────────────────────────────────────────────── */
  const results = globalSearch(search);

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: TH.bg, color: TH.text,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{makeCSS(isDark)}</style>

      <div
        className={homeClass}
        style={{ height:'100%', display:'flex', flexDirection:'column', transition:'background 0.3s ease' }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{
          background: TH.surface,
          borderBottom: `1px solid ${TH.border}`,
          padding: '14px 18px 14px',
          flexShrink: 0,
          boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.04)' : '0 1px 12px rgba(0,0,0,0.04)',
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          {/* Top row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10, color:TH.muted, fontFamily:'monospace', letterSpacing:2.5, textTransform:'uppercase', marginBottom:2 }}>
                N-Planr
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:TH.text, letterSpacing:'-0.5px', display:'flex', alignItems:'center', gap:6, transition:'color 0.3s' }}>
                Soins Généraux
                <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#38B6FF' }}/>
              </div>
            </div>
            <button
              onClick={toggleDark}
              className={toggling ? 'toggle-btn-anim' : ''}
              style={{
                background: isDark ? '#232D3F' : '#F0F3F8',
                border: `1px solid ${TH.border}`,
                borderRadius: 100, width:44, height:44, fontSize:20,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                transition:'background 0.3s, border-color 0.3s', flexShrink:0,
              }}
              aria-label="Basculer mode nuit"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Barre de recherche */}
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:14, color:TH.muted, pointerEvents:'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher : RCP, pansement, morphine…"
              style={{
                width:'100%',
                background: isDark ? '#1C2333' : '#F0F3F8',
                border: `1.5px solid ${search.length >= 2 ? '#38B6FF' : 'transparent'}`,
                borderRadius: 100,
                padding: '11px 40px 11px 40px',
                color: TH.text, fontSize:14, outline:'none',
                boxSizing:'border-box', fontFamily:'inherit', fontWeight:500,
                transition:'border-color 0.2s, background 0.3s',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background: isDark ? '#232D3F' : '#E4E9F2',
                border:'none', borderRadius:'50%', width:22, height:22,
                color:TH.muted, cursor:'pointer', fontSize:14,
                display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
              }}>×</button>
            )}
          </div>

          {/* Résultats recherche */}
          {search.length >= 2 && (
            <div style={{
              marginTop:8, background:TH.surface, border:`1px solid ${TH.border}`,
              borderRadius:16, overflow:'hidden',
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.10)',
              animation:'fadeIn 0.2s ease',
            }}>
              {results.length === 0
                ? <div style={{ padding:'14px 16px', color:TH.muted, fontSize:13 }}>Aucun résultat pour « {search} »</div>
                : results.map((r, i) => {
                    const mod = MODULES.find(m => m.id === r.mod);
                    return (
                      <div key={i} className="search-result-row"
                        onClick={() => { openModule(r.mod); setSearch(''); }}
                        style={{ borderBottom: i < results.length-1 ? `1px solid ${TH.border}` : 'none' }}
                      >
                        <div style={{ width:36, height:36, borderRadius:10, background:modBg(mod), display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {mod?.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:mod?.color, fontWeight:700, fontSize:13 }}>{r.label}</div>
                          <div style={{ color:TH.muted, fontSize:11, marginTop:1 }}>{mod?.label}</div>
                        </div>
                        <span style={{ color:TH.border2, fontSize:18, fontWeight:300 }}>›</span>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>

        {/* ── Corps scrollable ──────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 14px 90px' }}>

          {/* Favoris */}
          {favs.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:10, color:TH.muted, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:600 }}>⭐ Favoris</span>
                <span style={{ fontSize:11, color:TH.muted }}>{favs.length} épinglé{favs.length>1?'s':''}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {favs.map((fav, i) => {
                  const mod = MODULES.find(m => m.id === fav.mod);
                  return (
                    <div key={i} className="fav-card" onClick={() => openModule(fav.mod, fav.toolId)} style={{ animationDelay:`${i*0.05}s` }}>
                      <div style={{ width:4, height:36, borderRadius:4, background:fav.color, flexShrink:0 }}/>
                      <div style={{ width:38, height:38, borderRadius:10, background:mod ? modBg(mod) : fav.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {fav.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:TH.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fav.label}</div>
                        <div style={{ color:TH.muted, fontSize:11, marginTop:1 }}>{mod?.label}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFavs(toggleFav(fav)); }}
                        style={{ background:'none', border:'none', color:'#FBBF24', fontSize:17, cursor:'pointer', padding:4, flexShrink:0 }}>⭐</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ height:1, background:TH.border, margin:'18px 0 0', borderRadius:1 }}/>
            </div>
          )}

          {/* En-tête modules */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:10, color:TH.muted, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:600 }}>Modules</span>
            <span style={{ fontSize:11, color:TH.muted }}>{MODULES.length} disponibles</span>
          </div>

          {/* Grille modules */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {MODULES.map((m, idx) => (
              <div key={m.id} className="mod-card" onClick={() => openModule(m.id)} style={{ animationDelay:`${idx*0.06}s` }}>
                {m.badge && <span className="pill-badge">{m.badge}</span>}
                <div style={{ width:44, height:44, borderRadius:12, background:modBg(m), display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:12 }}>
                  {m.icon}
                </div>
                <div style={{ fontWeight:800, fontSize:14.5, color:TH.text, letterSpacing:'-0.3px', lineHeight:1.2, marginBottom:5 }}>
                  {m.label}
                </div>
                <div style={{ color:TH.muted, fontSize:11, lineHeight:1.55 }}>
                  {m.desc}
                </div>
                <div style={{ marginTop:14, height:3, borderRadius:100, background:`linear-gradient(90deg, ${m.color}55, ${m.color}11)` }}/>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop:22, background:TH.surface, border:`1px solid ${TH.border}`,
            borderRadius:14, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:10,
            boxShadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.03)',
            transition:'background 0.3s',
          }}>
            <span style={{ fontSize:18 }}>⚕️</span>
            <div style={{ fontSize:11, color:TH.muted, lineHeight:1.5 }}>
              <strong style={{ color:TH.text, fontWeight:700 }}>Usage professionnel</strong>
              {' '}· Toujours vérifier avec le prescripteur
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
