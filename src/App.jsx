import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { getTheme, loadDarkPref, saveDarkPref } from './theme.js';
import { loadFavs, toggleFav } from './favorites.js';
import SplashOverlay from './modules/shared/SplashOverlay.jsx';
import ToastHost from './ui/ToastHost.jsx';

const Urgences     = lazy(() => import('./modules/Urgences/index.jsx'));
const Soins        = lazy(() => import('./modules/Soins/index.jsx'));
const Organisation = lazy(() => import('./modules/Organisation/index.jsx'));
const Formation    = lazy(() => import('./modules/Formation/index.jsx'));
const ECG          = lazy(() => import('./modules/ECG/index.jsx'));
const AideMemoire  = lazy(() => import('./modules/AideMemoire/index.jsx'));
const Medicaments  = lazy(() => import('./modules/Medicaments/index.jsx'));

const MODULES = [
  { id:'urg',     label:'Urgences',     icon:'🚨', color:'#FF5A35', bgL:'#FFF2EE', bgD:'#1F0E08', desc:'RCP · AVC · Anaphylaxie · Sepsis' },
  { id:'ecg',     label:'ECG',          icon:'💓', color:'#00C47A', bgL:'#EDFAF5', bgD:'#071A10', desc:'Rythmes · Tracés · Quiz', badge:'NOUVEAU' },
  { id:'soins',   label:'Soins',        icon:'💉', color:'#38B6FF', bgL:'#EAF6FF', bgD:'#08182A', desc:'Pansements · PAC · Piccline · Timers' },
  { id:'orga',    label:'Organisation', icon:'📋', color:'#2DD47A', bgL:'#EDFAF4', bgD:'#071A10', desc:'Planning · SBAR · Transmissions' },
  { id:'form',    label:'Formation',    icon:'🎓', color:'#FBBF24', bgL:'#FFFBEA', bgD:'#1C1404', desc:'Quiz · Cas cliniques · Lexique' },
  { id:'meds',    label:'Médicaments',  icon:'💊', color:'#D946EF', bgL:'#FCF0FF', bgD:'#1A0820', desc:'Fiches · Posologies · Surveillance', badge:'NOUVEAU' },
  { id:'aidemem', label:'Aide-Mémoire', icon:'🗒️', color:'#6366F1', bgL:'#F0F0FF', bgD:'#10102A', desc:'Notes chiffrées · Services · Soins' },
];

const SEARCH_INDEX = [
  { q:['rcp','arrêt cardiaque','réanimation','acr'],           mod:'urg',   label:'RCP' },
  { q:['anaphylaxie','allergie','choc allergique'],             mod:'urg',   label:'Anaphylaxie' },
  { q:['sepsis','choc septique'],                              mod:'urg',   label:'Sepsis' },
  { q:['avc','stroke','hémiplégie'],                           mod:'urg',   label:'AVC' },
  { q:['hypoglycémie','glycémie','sucre'],                     mod:'urg',   label:'Hypoglycémie' },
  { q:['convulsion','épilepsie'],                              mod:'urg',   label:'Convulsions' },
  { q:['oap','oedème pulmonaire','détresse respiratoire'],     mod:'urg',   label:'OAP' },
  { q:['timer','chrono','antiseptique'],                       mod:'soins', label:'Timers de soins' },
  { q:['pansement','plaie','escarre','cicatrice'],             mod:'soins', label:'Pansements' },
  { q:['piccline','midline','voie centrale'],                  mod:'soins', label:'Piccline / Midline' },
  { q:['pac','chambre implantable'],                           mod:'soins', label:'PAC — Chambre implantable' },
  { q:['kta','cathéter artériel'],                             mod:'soins', label:'KTA — Cathéter artériel' },
  { q:['dialyse','hémodialyse','rein'],                        mod:'soins', label:'Dialyse' },
  { q:['sbar','transmission','relève'],                        mod:'orga',  label:'SBAR' },
  { q:['planning','journée','tâche','horaire'],                mod:'orga',  label:'Planning de la journée' },
  { q:['transmissions','ciblées','dla'],                       mod:'orga',  label:'Transmissions ciblées' },
  { q:['normes','biologie','bio','labo'],                      mod:'orga',  label:'Normes biologiques' },
  { q:['5b','cinq b','checklist médicament'],                  mod:'orga',  label:'Checklist 5B médicaments' },
  { q:['morphine','opioïde','antalgique'],                     mod:'meds',  label:'Morphine' },
  { q:['adrénaline','epinephrine'],                            mod:'meds',  label:'Adrénaline' },
  { q:['noradrénaline','vasopresseur','choc'],                 mod:'meds',  label:'Noradrénaline' },
  { q:['furosémide','diurétique','lasix'],                     mod:'meds',  label:'Furosémide' },
  { q:['midazolam','sédatif','hypnovel'],                      mod:'meds',  label:'Midazolam' },
  { q:['héparine','anticoagulant'],                            mod:'meds',  label:'Héparine' },
  { q:['insuline','diabète','glycémie'],                       mod:'meds',  label:'Insuline' },
  { q:['paracétamol','doliprane','antipyrétique'],             mod:'meds',  label:'Paracétamol' },
  { q:['médicament','fiche','posologie'],                      mod:'meds',  label:'Fiches médicaments' },
];

const DUR = 310;
function normalize(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function fuzzyMatch(h,n) {
  const hh=normalize(h),nn=normalize(n);
  if(hh.includes(nn)) return true;
  if(nn.length>=5) for(let i=0;i<nn.length-2;i++) if(hh.includes(nn.slice(0,i)+nn.slice(i+1))) return true;
  return false;
}
function globalSearch(q) {
  if(!q||q.length<2) return [];
  return SEARCH_INDEX.filter(e=>e.q.some(kw=>fuzzyMatch(kw,q)||fuzzyMatch(q,kw))).slice(0,8);
}

/* ── CSS global ───────────────────────────────────────────────────────────── */
const makeCSS = (dark) => `
  @keyframes slideInRight  { from{transform:translateX(100%)}  to{transform:translateX(0)} }
  @keyframes slideOutRight { from{transform:translateX(0)}     to{transform:translateX(100%)} }
  @keyframes homeEnter     { from{transform:translateX(-22px) scale(.98);opacity:0} to{transform:translateX(0) scale(1);opacity:1} }
  @keyframes homeExit      { from{transform:translateX(0) scale(1);opacity:1} to{transform:translateX(-22px) scale(.98);opacity:0} }
  @keyframes tabSlide      { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp        { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin          { to{transform:rotate(360deg)} }
  @keyframes themePulse    { 0%{transform:scale(1)} 50%{transform:scale(1.18) rotate(12deg)} 100%{transform:scale(1)} }

  .screen-slide-in  { animation:slideInRight  ${DUR}ms cubic-bezier(.32,.72,0,1) both; }
  .screen-slide-out { animation:slideOutRight ${DUR}ms cubic-bezier(.32,.72,0,1) both; pointer-events:none; }
  .home-enter       { animation:homeEnter     ${DUR}ms cubic-bezier(.32,.72,0,1) both; }
  .home-exit        { animation:homeExit      ${DUR}ms cubic-bezier(.32,.72,0,1) both; pointer-events:none; }
  .tab-slide        { animation:tabSlide 200ms ease both; }

  .mod-card {
    background:${dark?'#161C26':'#FFFFFF'}; border:1px solid ${dark?'#232D3F':'#E4E9F2'};
    border-radius:20px; padding:18px 16px 14px; cursor:pointer; position:relative;
    box-shadow:${dark?'0 2px 16px rgba(0,0,0,.3)':'0 2px 14px rgba(0,0,0,.045)'};
    transition:transform .14s,box-shadow .14s; animation:fadeUp .35s ease both;
    overflow:hidden; -webkit-tap-highlight-color:transparent;
  }
  .mod-card:active { transform:scale(.96); }
  .fav-card {
    background:${dark?'#161C26':'#FFFFFF'}; border:1px solid ${dark?'#232D3F':'#E4E9F2'};
    border-radius:16px; padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:12px;
    box-shadow:${dark?'none':'0 2px 10px rgba(0,0,0,.04)'};
    transition:transform .14s; -webkit-tap-highlight-color:transparent;
  }
  .fav-card:active { transform:scale(.97); }
  .srow { display:flex;align-items:center;gap:12px;padding:11px 16px;cursor:pointer;transition:background .1s; }
  .srow:active { background:${dark?'#1C2333':'#F0F3F8'}; }
  .pill-badge { position:absolute;top:12px;right:12px;background:#0D1117;color:#FFF;font-size:8.5px;font-weight:700;letter-spacing:.8px;padding:3px 8px;border-radius:100px;font-family:monospace;text-transform:uppercase; }
  .nav-btn { display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:6px 14px;border-radius:14px;cursor:pointer;transition:all .18s;-webkit-tap-highlight-color:transparent;flex:1; }
  .nav-btn.on { background:${dark?'#232D3F':'#EAF6FF'}; }
  .nav-btn:active { transform:scale(.92); }
  .toggle-anim { animation:themePulse .35s ease; }
  .swt { width:50px;height:28px;border-radius:100px;display:flex;align-items:center;padding:3px;cursor:pointer;transition:background .25s; }
  .swt-dot { width:22px;height:22px;border-radius:50%;background:#FFF;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.2); }
`;

/* ── COMPOSANTS EXTRAITS EN DEHORS DE APP ─────────────────────────────────
   ⚠️  Critique pour le clavier : définir les composants ici (scope module)
   et non à l'intérieur de App évite leur remontage à chaque render.        */

function AppHeader({ isDark, TH, tab, search, onSearchChange, onSearchFocus, onClearSearch, onToggleDark, toggling, searchRef }) {
  return (
    <div style={{
      background:TH.surface, borderBottom:`1px solid ${TH.border}`,
      padding:'14px 18px 14px', flexShrink:0,
      boxShadow:isDark?'0 1px 0 rgba(255,255,255,.04)':'0 1px 12px rgba(0,0,0,.04)',
      transition:'background .3s,border-color .3s',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:(tab==='home'||tab==='search')?12:0}}>
        <div>
          <div style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2.5,textTransform:'uppercase',marginBottom:2}}>N-Planr</div>
          <div style={{fontSize:22,fontWeight:800,color:TH.text,letterSpacing:'-.5px',display:'flex',alignItems:'center',gap:6}}>
            {tab==='home'     && <>Soins Généraux <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#38B6FF'}}/></>}
            {tab==='search'   && 'Recherche'}
            {tab==='favs'     && 'Favoris'}
            {tab==='settings' && 'Réglages'}
          </div>
        </div>
        {tab !== 'search' && (
          <button
            onClick={onToggleDark}
            className={toggling ? 'toggle-anim' : ''}
            style={{background:isDark?'#232D3F':'#F0F3F8',border:`1px solid ${TH.border}`,borderRadius:100,width:44,height:44,fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .3s',flexShrink:0}}
          >{isDark?'☀️':'🌙'}</button>
        )}
      </div>
      {/* ── Barre de recherche — toujours dans le DOM sur onglets home+search ── */}
      {(tab==='home'||tab==='search') && (
        <div style={{position:'relative',marginTop:tab==='search'?12:0}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,color:TH.muted,pointerEvents:'none'}}>🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Rechercher : RCP, pansement, morphine…"
            style={{
              width:'100%',
              background:isDark?'#1C2333':'#F0F3F8',
              border:`1.5px solid ${search.length>=2?'#38B6FF':'transparent'}`,
              borderRadius:100, padding:'11px 40px 11px 40px',
              color:TH.text, fontSize:14, outline:'none',
              boxSizing:'border-box', fontFamily:'inherit', fontWeight:500,
              transition:'border-color .2s,background .3s',
            }}
          />
          {search && (
            <button
              onClick={onClearSearch}
              style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:isDark?'#232D3F':'#E4E9F2',border:'none',borderRadius:'50%',width:22,height:22,color:TH.muted,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}
            >×</button>
          )}
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { id:'home',     icon:'🏠', label:'Accueil' },
  { id:'search',   icon:'🔍', label:'Recherche' },
  { id:'favs',     icon:'⭐', label:'Favoris' },
  { id:'settings', icon:'⚙️', label:'Réglages' },
];
function AppBottomNav({ tab, onTab, TH, isDark }) {
  return (
    <div style={{flexShrink:0,background:TH.surface,borderTop:`1px solid ${TH.border}`,padding:'6px 8px 20px',display:'flex',boxShadow:isDark?'0 -1px 0 rgba(255,255,255,.04)':'0 -4px 20px rgba(0,0,0,.05)',transition:'background .3s'}}>
      {NAV_ITEMS.map(n => (
        <div key={n.id} className={`nav-btn${tab===n.id?' on':''}`} onClick={()=>onTab(n.id)}>
          <span style={{fontSize:22}}>{n.icon}</span>
          <span style={{color:tab===n.id?'#38B6FF':TH.muted,transition:'color .18s'}}>{n.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── App principal ────────────────────────────────────────────────────────── */
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [isDark,     setIsDark]     = useState(loadDarkPref);
  const [tab,        setTab]        = useState('home');
  const [active,     setActive]     = useState(null);
  const [initialTool,setInitialTool]= useState(null);
  const [phase,      setPhase]      = useState('idle');
  const [search,     setSearch]     = useState('');
  const [favs,       setFavs]       = useState(loadFavs);
  const [toggling,   setToggling]   = useState(false);
  const backOverride  = useRef(null);
  const timerRef      = useRef(null);
  const searchRef     = useRef(null);

  const TH = getTheme(isDark);

  useEffect(() => {
    document.body.style.background = TH.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark?'#0D1117':'#F0F3F8');
  }, [isDark, TH.bg]);

  // Bouton retour Android — recréé sur [active, tab] comme l'original
  // setActive/setInitialTool appelés DIRECTEMENT (pas handleBack) → pas de stale closure
  useEffect(() => {
    let h = null;
    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        h = await CapApp.addListener('backButton', () => {
          if (backOverride.current)   { backOverride.current(); return; }
          if (active !== null)        { setActive(null); setInitialTool(null); setPhase('idle'); return; }
          if (tab !== 'home')         { setTab('home'); return; }
          CapApp.exitApp();
        });
      } catch {}
    })();
    return () => { if (h) h.remove(); };
  }, [active, tab]);

  function openModule(mod, toolId=null) {
    if (phase!=='idle') return;
    setActive(mod); setInitialTool(toolId); setPhase('entering');
    timerRef.current = setTimeout(()=>setPhase('idle'), DUR);
  }
  const handleBack = useCallback(() => {
    if (phase!=='idle') return;
    setPhase('returning');
    timerRef.current = setTimeout(()=>{
      setActive(null); setInitialTool(null); setPhase('homing');
      timerRef.current = setTimeout(()=>setPhase('idle'), DUR);
    }, DUR);
  }, [phase]);

  function toggleDark() {
    setToggling(true);
    setTimeout(()=>setToggling(false), 400);
    setIsDark(v=>{ saveDarkPref(!v); return !v; });
  }
  function changeTab(t) {
    if (t===tab) return;
    if (t!=='search') setSearch('');
    setTab(t);
    if (t==='search') setTimeout(()=>searchRef.current?.focus(), 80);
  }
  function handleFavChange() { setFavs(loadFavs()); }
  const modBg = m => isDark ? m.bgD : m.bgL;

  /* ── Module actif ──────────────────────────────────────────────────────── */
  const renderModule = () => {
    const p = { onBack:()=>{ setActive(null); setInitialTool(null); setPhase('idle'); }, initialTool, onFavChange:handleFavChange, onBackOverride:fn=>{backOverride.current=fn;} };
    switch(active) {
      case 'urg':     return <Urgences     {...p}/>;
      case 'ecg':     return <ECG          onBack={()=>{ setActive(null); setInitialTool(null); setPhase('idle'); }} onBackOverride={p.onBackOverride}/>;
      case 'soins':   return <Soins        {...p}/>;
      case 'orga':    return <Organisation {...p}/>;
      case 'form':    return <Formation    {...p}/>;
      case 'meds':    return <Medicaments  {...p}/>;
      case 'aidemem': return <AideMemoire  onBack={()=>{ setActive(null); setInitialTool(null); setPhase('idle'); }} onBackOverride={p.onBackOverride}/>;
      default: return null;
    }
  };

  const modClass  = phase==='entering' ?'screen-slide-in' : phase==='returning'?'screen-slide-out':'';
  const homeClass = phase==='exiting'  ?'home-exit'       : phase==='homing'   ?'home-enter':'';

  if (active) return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:TH.bg}}>
      <style>{makeCSS(isDark)}</style>
      <div className={modClass} style={{height:'100%',overflowY:'auto'}}>
        <Suspense fallback={
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:12}}>
            <div style={{width:34,height:34,borderRadius:'50%',border:`3px solid ${TH.border}`,borderTopColor:MODULES.find(m=>m.id===active)?.color||'#38B6FF',animation:'spin .7s linear infinite'}}/>
            <span style={{color:TH.muted,fontSize:13}}>Chargement…</span>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        }>
          {renderModule()}
        </Suspense>
      </div>
      <ToastHost/>
    </div>
  );

  const results = globalSearch(search);

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:TH.bg,color:TH.text,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{makeCSS(isDark)}</style>
      {!splashDone && <SplashOverlay onDone={()=>setSplashDone(true)}/>}

      <div className={homeClass} style={{height:'100%',display:'flex',flexDirection:'column',transition:'background .3s'}}>

        {/* ── Header stable — ne se remonte JAMAIS ──────────────────────── */}
        <AppHeader
          isDark={isDark} TH={TH} tab={tab}
          search={search}
          onSearchChange={e=>{ setSearch(e.target.value); if(tab==='home'&&e.target.value.length>0) setTab('search'); }}
          onSearchFocus={()=>{ if(tab==='home') setTab('search'); }}
          onClearSearch={()=>setSearch('')}
          onToggleDark={toggleDark}
          toggling={toggling}
          searchRef={searchRef}
        />

        {/* ── Contenu tab ───────────────────────────────────────────────── */}
        <div key={tab} className="tab-slide" style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

          {/* HOME */}
          {tab==='home' && (
            <div style={{flex:1,overflowY:'auto',padding:'18px 14px 16px'}}>
              {favs.length>0 && (
                <div style={{marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:600}}>⭐ Favoris</span>
                    <span style={{fontSize:11,color:TH.muted}}>{favs.length} épinglé{favs.length>1?'s':''}</span>
                  </div>
                  {favs.map((fav,i)=>{
                    const mod=MODULES.find(m=>m.id===fav.mod);
                    return (
                      <div key={i} className="fav-card" onClick={()=>openModule(fav.mod,fav.toolId)} style={{marginBottom:8}}>
                        <div style={{width:4,height:36,borderRadius:4,background:fav.color,flexShrink:0}}/>
                        <div style={{width:38,height:38,borderRadius:10,background:mod?modBg(mod):fav.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{fav.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:TH.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fav.label}</div>
                          <div style={{color:TH.muted,fontSize:11,marginTop:1}}>{mod?.label}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();setFavs(toggleFav(fav));}} style={{background:'none',border:'none',color:'#FBBF24',fontSize:17,cursor:'pointer',padding:4,flexShrink:0}}>⭐</button>
                      </div>
                    );
                  })}
                  <div style={{height:1,background:TH.border,margin:'14px 0',borderRadius:1}}/>
                </div>
              )}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <span style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:600}}>Modules</span>
                <span style={{fontSize:11,color:TH.muted}}>{MODULES.length} disponibles</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {MODULES.map((m,idx)=>(
                  <div key={m.id} className="mod-card" onClick={()=>openModule(m.id)} style={{animationDelay:`${idx*.06}s`}}>
                    {m.badge&&<span className="pill-badge">{m.badge}</span>}
                    <div style={{width:44,height:44,borderRadius:12,background:modBg(m),display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:12}}>{m.icon}</div>
                    <div style={{fontWeight:800,fontSize:14.5,color:TH.text,letterSpacing:'-.3px',lineHeight:1.2,marginBottom:5}}>{m.label}</div>
                    <div style={{color:TH.muted,fontSize:11,lineHeight:1.55}}>{m.desc}</div>
                    <div style={{marginTop:14,height:3,borderRadius:100,background:`linear-gradient(90deg,${m.color}55,${m.color}11)`}}/>
                  </div>
                ))}
              </div>
              <div style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>⚕️</span>
                <div style={{fontSize:11,color:TH.muted,lineHeight:1.5}}>
                  <strong style={{color:TH.text,fontWeight:700}}>Usage professionnel</strong>{' '}· Toujours vérifier avec le prescripteur
                </div>
              </div>
            </div>
          )}

          {/* SEARCH */}
          {tab==='search' && (
            <div style={{flex:1,overflowY:'auto',padding:'8px 0 16px'}}>
              {search.length<2
                ? (
                  <div style={{padding:'32px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
                    <div style={{fontSize:48}}>🔍</div>
                    <div style={{color:TH.muted,fontSize:14,textAlign:'center',lineHeight:1.6}}>Tapez au moins 2 caractères<br/>pour rechercher dans tous les modules</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:4}}>
                      {['RCP','Morphine','Pansement','SBAR','Sepsis','Insuline'].map(s=>(
                        <button key={s} onClick={()=>setSearch(s)} style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:100,padding:'6px 14px',fontSize:12,fontWeight:600,color:TH.text,cursor:'pointer',fontFamily:'inherit'}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
                : results.length===0
                  ? <div style={{padding:'32px 24px',textAlign:'center',color:TH.muted,fontSize:14}}>Aucun résultat pour « {search} »</div>
                  : (
                    <div style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:16,overflow:'hidden',margin:'8px 14px',boxShadow:isDark?'none':'0 4px 20px rgba(0,0,0,.06)'}}>
                      {results.map((r,i)=>{
                        const mod=MODULES.find(m=>m.id===r.mod);
                        return (
                          <div key={i} className="srow" onClick={()=>{openModule(r.mod);setSearch('');setTab('home');}} style={{borderBottom:i<results.length-1?`1px solid ${TH.border}`:'none'}}>
                            <div style={{width:40,height:40,borderRadius:11,background:modBg(mod),display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{mod?.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{color:mod?.color,fontWeight:700,fontSize:14}}>{r.label}</div>
                              <div style={{color:TH.muted,fontSize:11,marginTop:1}}>{mod?.label}</div>
                            </div>
                            <span style={{color:TH.border2,fontSize:20,fontWeight:300}}>›</span>
                          </div>
                        );
                      })}
                    </div>
                  )
              }
            </div>
          )}

          {/* FAVS */}
          {tab==='favs' && (
            <div style={{flex:1,overflowY:'auto',padding:'16px 14px'}}>
              {favs.length===0
                ? (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,paddingTop:48}}>
                    <div style={{fontSize:52}}>☆</div>
                    <div style={{color:TH.muted,fontSize:14,textAlign:'center',lineHeight:1.6}}>
                      Aucun favori enregistré<br/>
                      <span style={{fontSize:12}}>Appuyez sur ☆ dans un outil pour l'épingler ici</span>
                    </div>
                  </div>
                )
                : <>
                    <div style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:600,marginBottom:12}}>
                      {favs.length} outil{favs.length>1?'s':''} épinglé{favs.length>1?'s':''}
                    </div>
                    {favs.map((fav,i)=>{
                      const mod=MODULES.find(m=>m.id===fav.mod);
                      return (
                        <div key={i} className="fav-card" onClick={()=>openModule(fav.mod,fav.toolId)} style={{marginBottom:10}}>
                          <div style={{width:4,height:40,borderRadius:4,background:fav.color,flexShrink:0}}/>
                          <div style={{width:42,height:42,borderRadius:11,background:mod?modBg(mod):fav.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{fav.icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:14,color:TH.text}}>{fav.label}</div>
                            <div style={{color:TH.muted,fontSize:11,marginTop:2}}>{mod?.label}</div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();setFavs(toggleFav(fav));}} style={{background:'none',border:'none',color:'#FBBF24',fontSize:18,cursor:'pointer',padding:4,flexShrink:0}}>⭐</button>
                        </div>
                      );
                    })}
                  </>
              }
            </div>
          )}

          {/* SETTINGS */}
          {tab==='settings' && (
            <div style={{flex:1,overflowY:'auto',padding:'16px 14px'}}>
              <div style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:600,marginBottom:10}}>Apparence</div>
              <div style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:16,overflow:'hidden',marginBottom:20,boxShadow:isDark?'none':'0 2px 10px rgba(0,0,0,.04)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:TH.text}}>Mode nuit</div>
                    <div style={{color:TH.muted,fontSize:12,marginTop:2}}>Fond sombre · Économie batterie OLED</div>
                  </div>
                  <div className="swt" onClick={toggleDark} style={{background:isDark?'#38B6FF':'#E4E9F2'}}>
                    <div className="swt-dot" style={{transform:isDark?'translateX(22px)':'translateX(0)'}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:TH.muted,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:600,marginBottom:10}}>Application</div>
              <div style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:16,overflow:'hidden',marginBottom:20}}>
                {[
                  {label:'Version',    value:'1.0.0'},
                  {label:'Modules',    value:`${MODULES.length} disponibles`},
                  {label:'Favoris',    value:`${favs.length} épinglé${favs.length>1?'s':''}`},
                  {label:'Plateforme', value:'Android (Capacitor)'},
                ].map((row,i,arr)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderBottom:i<arr.length-1?`1px solid ${TH.border}`:'none'}}>
                    <span style={{color:TH.text,fontSize:13,fontWeight:500}}>{row.label}</span>
                    <span style={{color:TH.muted,fontSize:13,fontFamily:'monospace'}}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{background:TH.surface,border:`1px solid ${TH.border}`,borderRadius:16,padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <span style={{fontSize:22}}>⚕️</span>
                <div style={{fontSize:12,color:TH.muted,lineHeight:1.6}}>
                  <strong style={{color:TH.text,fontWeight:700}}>Avertissement médical</strong><br/>
                  Cette application est un outil d'aide à la pratique infirmière. Elle ne remplace pas le jugement clinique ni les prescriptions médicales.
                </div>
              </div>
            </div>
          )}
        </div>

        <AppBottomNav tab={tab} onTab={changeTab} TH={TH} isDark={isDark}/>
      </div>
      <ToastHost/>
    </div>
  );
}
