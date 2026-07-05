import { useState, useEffect, useRef } from 'react';
import { T } from '../../theme.js';

// ── Couleur ECG ──────────────────────────────────────────────────────────────
const ECG_GREEN = '#00e676';
const ECG_BG    = '#030a05';
const ECG_SURF  = '#070f09';
const ECG_SURF2 = '#0a1a10';
const ECG_BORD  = '#143d20';
const ECG_MUTED = '#8ab89a';
const ECG_TEXT  = '#c8e6c9';

// ── ECG Strip Generators ─────────────────────────────────────────────────────
const B = 65, W = 800;

function normalComplex(x0, bw = 160, b = B) {
  const p = dx => x0 + dx * (bw / 160), a = dy => b - dy;
  return [
    `L${p(18)},${b}`, `C${p(23)},${b} ${p(26)},${a(8)} ${p(30)},${a(11)}`,
    `C${p(34)},${a(13)} ${p(38)},${b} ${p(42)},${b}`, `L${p(56)},${b}`,
    `L${p(58)},${a(-5)}`, `L${p(62)},${a(47)}`, `L${p(66)},${a(-9)}`, `L${p(71)},${b}`,
    `L${p(86)},${b}`, `C${p(93)},${b} ${p(100)},${a(12)} ${p(108)},${a(14)}`,
    `C${p(116)},${a(12)} ${p(124)},${b} ${p(132)},${b}`, `L${p(bw)},${b}`
  ].join(' ');
}

function generateStrip(id) {
  let path = `M 0,${B}`;
  if (id === 'normal')   { for (let i=0;i<5;i++) path += normalComplex(i*160); }
  else if (id==='tachy') { for (let i=0;i<8;i++) path += normalComplex(i*100,100); }
  else if (id==='brady') { const bw=267; for (let i=0;i<3;i++) if (i*bw<W+50) path+=normalComplex(i*bw,bw); }
  else if (id==='avblock1') {
    for (let i=0;i<5;i++) {
      const x0=i*160,p=dx=>x0+dx,a=dy=>B-dy;
      path+=[`L${p(14)},${B}`,`C${p(18)},${B} ${p(21)},${a(8)} ${p(24)},${a(11)}`,`C${p(27)},${a(13)} ${p(31)},${B} ${p(34)},${B}`,`L${p(78)},${B}`,`L${p(80)},${a(-5)}`,`L${p(84)},${a(47)}`,`L${p(88)},${a(-9)}`,`L${p(93)},${B}`,`L${p(105)},${B}`,`C${p(112)},${B} ${p(118)},${a(12)} ${p(125)},${a(14)}`,`C${p(132)},${a(12)} ${p(138)},${B} ${p(145)},${B}`,`L${p(160)},${B}`].join(' ');
    }
  } else if (id==='afib') {
    const rrs=[125,95,148,110,138,102,118,88]; let x=0;
    for (let k=0;k<rrs.length&&x<W;k++) {
      const rr=rrs[k],qx=x+rr-22;
      for (let px=x;px<Math.min(qx,W);px+=7) { const n=Math.sin(px*0.48+k*1.1)*3.2+Math.sin(px*0.85)*2; path+=` L${px+3.5},${B+n} L${px+7},${B-n*0.6}`; }
      if (qx<W) path+=` L${qx},${B+4} L${qx+4},${B-38} L${qx+8},${B+6} L${qx+13},${B}`;
      x+=rr;
    }
  } else if (id==='vtach') {
    for (let i=0;i<10;i++) {
      const x0=i*82; if (x0>=W) break;
      path+=[`L${x0+4},${B}`,`C${x0+13},${B+6} ${x0+20},${B-18} ${x0+28},${B-48}`,`C${x0+36},${B-66} ${x0+41},${B-60} ${x0+49},${B-44}`,`C${x0+55},${B-26} ${x0+58},${B+12} ${x0+62},${B+22}`,`C${x0+66},${B+26} ${x0+72},${B+14} ${x0+79},${B}`,`L${x0+82},${B}`].join(' ');
    }
  } else if (id==='flutter') {
    for (let i=0;i<17;i++) {
      const fx=i*47; if (fx>=W) break;
      path+=` C${fx+14},${B-7} ${fx+34},${B-9} ${fx+38},${B-8} L${fx+47},${B+9}`;
      if (i%4===1) { const qx=fx+40; path+=` L${qx},${B+4} L${qx+4},${B-38} L${qx+8},${B+5} L${qx+12},${B+9}`; }
    }
  } else if (id==='esv') {
    path+=normalComplex(0); path+=normalComplex(160);
    const ex=292;
    path+=[`L${ex+4},${B}`,`C${ex+11},${B+9} ${ex+18},${B-22} ${ex+26},${B-52}`,`C${ex+34},${B-70} ${ex+40},${B-63} ${ex+48},${B-45}`,`C${ex+54},${B-18} ${ex+58},${B+14} ${ex+63},${B+23}`,`C${ex+67},${B+28} ${ex+73},${B+16} ${ex+79},${B}`,`C${ex+85},${B} ${ex+92},${B+16} ${ex+100},${B+19}`,`C${ex+108},${B+16} ${ex+116},${B} ${ex+124},${B}`,`L${ex+174},${B}`].join(' ');
    path+=normalComplex(ex+174);
  } else if (id==='lbbb') {
    for (let i=0;i<5;i++) {
      const x0=i*160,p=dx=>x0+dx,a=dy=>B-dy;
      path+=[`L${p(17)},${B}`,`C${p(21)},${B} ${p(24)},${a(8)} ${p(27)},${a(11)}`,`C${p(30)},${a(13)} ${p(34)},${B} ${p(38)},${B}`,`L${p(51)},${B}`,`L${p(53)},${a(-2)}`,`C${p(57)},${a(10)} ${p(62)},${a(30)} ${p(67)},${a(40)}`,`C${p(71)},${a(32)} ${p(74)},${a(37)} ${p(77)},${a(44)}`,`C${p(81)},${a(54)} ${p(86)},${a(52)} ${p(90)},${a(40)}`,`C${p(94)},${a(20)} ${p(98)},${a(4)} ${p(103)},${a(-4)}`,`L${p(109)},${B}`,`C${p(115)},${B} ${p(121)},${a(-11)} ${p(127)},${a(-13)}`,`C${p(133)},${a(-11)} ${p(139)},${B} ${p(145)},${B}`,`L${p(160)},${B}`].join(' ');
    }
  } else { for (let i=0;i<5;i++) path+=normalComplex(i*160); }
  return path;
}

// ── Données rythmes ───────────────────────────────────────────────────────────
const RHYTHMS = [
  { id:'normal',   label:'Rythme Sinusal Normal',     hr:'60–100 bpm',              color:'#00e676', category:'Normal',
    desc:'Rythme cardiaque normal originant du nœud sinusal avec conduction régulière AV normale.',
    signs:["Onde P avant chaque QRS",'PR: 0,12–0,20 s','QRS < 0,12 s','Rythme régulier'],
    nursing:{ priority:'routine', actions:[
      {icon:'📋',step:'Surveillance',text:'Surveiller la FC toutes les 4–8h. Documenter dans le dossier de soins.'},
      {icon:'💊',step:'Médicaments',text:'Administrer les traitements prescrits. Vérifier les interactions médicamenteuses.'},
      {icon:'📚',step:'Éducation',text:"Rassurer le patient. Expliquer les signes d'alerte (palpitations, syncope, dyspnée)."},
    ]}},
  { id:'tachy',    label:'Tachycardie Sinusale',      hr:'> 100 bpm',               color:'#ff9800', category:'Tachycardie',
    desc:"Accélération du rythme sinusal. Causes fréquentes : fièvre, douleur, déshydratation, anémie.",
    signs:['Morphologie sinusale normale','FC > 100/min','RR raccourci','Onde P visible'],
    nursing:{ priority:'surveillance', actions:[
      {icon:'🔔',step:'1 — Appeler le médecin',text:'Prévenir si FC > 130/min, si symptomatique ou si tachycardie nouvelle.'},
      {icon:'🩺',step:'2 — Évaluation',text:'PA, SpO₂, température, FR. Rechercher cause : fièvre, douleur, hémorragie, hypovolémie.'},
      {icon:'💉',step:'3 — VVP + bilan',text:'VVP. Prélèvements selon prescription : NFS, ionogramme, TSH, D-dimères.'},
      {icon:'🫁',step:'4 — Oxygène',text:"O₂ si SpO₂ < 94%. Position demi-assise."},
      {icon:'📊',step:'5 — Monitorage',text:'Scope. ECG 12 dérivations. Surveillance toutes les 30 min.'},
    ]}},
  { id:'brady',    label:'Bradycardie Sinusale',      hr:'< 60 bpm',                color:'#42a5f5', category:'Bradycardie',
    desc:"Ralentissement du rythme sinusal. Peut être normal chez l'athlète. Causes : hypothyroïdie, médicaments.",
    signs:['Morphologie sinusale normale','FC < 60/min','RR allongé','Onde P présente'],
    nursing:{ priority:'surveillance', actions:[
      {icon:'🔔',step:'1 — Tolérance',text:"FC < 50/min avec hypotension/syncope/douleur thoracique → MÉDECIN EN URGENCE."},
      {icon:'🧪',step:'2 — Cause',text:'Vérifier médicaments : bêta-bloquants, digitaliques, antiarythmiques.'},
      {icon:'💊',step:'3 — Atropine',text:"Préparer 1 mg Atropine IV sur prescription. Ne pas administrer sans ordre médical."},
      {icon:'⚡',step:'4 — Stimulation',text:"Échec médical → préparer matériel de pacemaker transcutané."},
    ]}},
  { id:'afib',     label:'Fibrillation Auriculaire',  hr:'Irrégulier 100–180 bpm',  color:'#f06292', category:'Arythmie',
    desc:"Arythmie supraventriculaire la plus fréquente. Activité auriculaire chaotique, risque thrombo-embolique.",
    signs:["Absence d'onde P",'Ligne isoélectrique fibrillante','RR totalement irrégulier','QRS fin (< 0,12 s)'],
    nursing:{ priority:'urgent', actions:[
      {icon:'🚨',step:'1 — Alerte',text:"Médecin immédiatement. FA récente < 48h : risque thrombo-embolique lors d'une cardioversion."},
      {icon:'🩺',step:'2 — Constantes',text:"FC (pouls radial), PA, SpO₂. Rechercher signes d'AVC (FAST)."},
      {icon:'💉',step:'3 — VVP + bilan',text:'NFS, ionogramme, TP/TCA, TSH, troponine. Anticoagulation selon prescription.'},
      {icon:'⚡',step:'4 — Cardioversion',text:'Si instabilité : chariot urgence, défibrillateur, sédation (Midazolam, Propofol).'},
    ]}},
  { id:'flutter',  label:'Flutter Auriculaire',       hr:'75–150 bpm (4:1 ou 2:1)', color:'#ce93d8', category:'Arythmie',
    desc:"Circuit de réentrée dans l'oreillette droite. Ondes F en dents de scie à 300/min.",
    signs:['Ondes F en dents de scie (V1)',"Pas d'isoélectrique entre ondes F",'Bloc AV 2:1 ou 4:1','QRS fin'],
    nursing:{ priority:'urgent', actions:[
      {icon:'🔔',step:'1 — Appel',text:'Prévenir le médecin. Risque de décompensation cardiaque.'},
      {icon:'💊',step:'2 — Médicaments',text:"Amiodarone IV, Bêta-bloquant IV selon prescription. Digoxine souvent inefficace sur le flutter."},
      {icon:'⚡',step:'3 — Cardioversion',text:'Flutter répond bien à la cardioversion électrique (50–100J biphasique).'},
    ]}},
  { id:'vtach',    label:'Tachycardie Ventriculaire', hr:'> 120 bpm',               color:'#ff5252', category:'URGENCE',
    desc:"⚠️ URGENCE ! Activité ventriculaire rapide et autonome. Risque de dégénération en FV.",
    signs:['QRS large > 0,12 s','Dissociation auriculo-ventriculaire','Rythme régulier ou sub-régulier',"Pas d'onde P discernable"],
    nursing:{ priority:'critique', actions:[
      {icon:'🚨',step:'1 — URGENCE IMMÉDIATE',text:"APPELER MÉDECIN + ÉQUIPE. Patient conscient ? Pouls palpable ? Absence de pouls → RCP immédiate."},
      {icon:'🛏',step:'2 — O₂ haut débit',text:'15 L/min masque à réservoir. Défibrillateur allumé en place.'},
      {icon:'💉',step:'3 — Accès veineux',text:'VVP G16 minimum, 2 voies. K⁺ en urgence, troponine, GDS.'},
      {icon:'💊',step:'4 — Amiodarone',text:'300 mg dans 250 mL G5% sur prescription si TV tolérée.'},
      {icon:'⚡',step:'5 — CEE',text:'TV mal tolérée ou sans pouls : choc 200J biphasique ou RCP si FV.'},
      {icon:'🏥',step:'6 — Transfert USIC',text:'Préparer transfert soins intensifs cardiologiques avec scope portable.'},
    ]}},
  { id:'avblock1', label:'Bloc AV 1er Degré',          hr:'Variable',                color:'#ffcc02', category:'Bloc',
    desc:"Allongement de la conduction auriculo-ventriculaire. Souvent bénin.",
    signs:['PR > 0,20 s (> 1 grand carré)','Chaque P conduit au QRS','QRS fin','Rythme régulier'],
    nursing:{ priority:'routine', actions:[
      {icon:'📋',step:'1 — Signalement',text:'Informer le médecin si bloc AV 1° nouveau ou associé à bradycardie/médicaments.'},
      {icon:'💊',step:'2 — Traitements',text:'Vérifier : bêta-bloquants, anticalciques, digitaliques, Amiodarone.'},
      {icon:'📊',step:'3 — Surveillance',text:"ECG de contrôle. Surveiller évolution vers bloc AV 2° ou 3°."},
    ]}},
  { id:'esv',      label:'Extrasystole Ventriculaire', hr:'Variable',                color:'#80cbc4', category:'Ectopie',
    desc:"Battement prématuré d'origine ventriculaire. Isolée, souvent bénigne.",
    signs:["QRS large prématuré sans onde P",'Pause compensatrice complète',"T inversé après l'ESV",'Retour au rythme sinusal'],
    nursing:{ priority:'surveillance', actions:[
      {icon:'📊',step:'1 — Quantifier',text:'Isolées, doublets, triplets, bigéminisme ? > 5/min ou polymorphes = avis médical.'},
      {icon:'🔬',step:'2 — Bilan ionique',text:'Kaliémie et magnésémie : hypokaliémie = cause fréquente.'},
      {icon:'⚠️',step:'3 — Surveillance',text:'ESV fréquentes : scope continu, prévenir médecin, préparer Amiodarone.'},
    ]}},
  { id:'lbbb',     label:'Bloc de Branche Gauche',     hr:'Variable',                color:'#a5d6a7', category:'Bloc',
    desc:"Trouble de conduction dans la branche gauche. QRS ≥ 0,12 s avec aspect caractéristique.",
    signs:['QRS ≥ 0,12 s','R large et encochée en V5–V6',"Absence d'onde Q septale",'Troubles repolarisation secondaires'],
    nursing:{ priority:'surveillance', actions:[
      {icon:'🚨',step:'1 — BBG NOUVEAU = SCA',text:"BBG apparu récemment < 24h = SCA jusqu'à preuve du contraire. MÉDECIN IMMÉDIATEMENT."},
      {icon:'🩺',step:'2 — Évaluation SCA',text:"Douleur thoracique, irradiation, sueurs. Troponine HS en urgence."},
      {icon:'💉',step:'3 — Bilan urgent',text:'Troponine, NFS, TP/TCA, groupe sanguin. VVP G16.'},
      {icon:'🏥',step:'4 — Transfert USIC',text:"Préparer transfert coronarienne. ECG série toutes les 15–30 min."},
    ]}},
];

const PRIORITY_CFG = {
  critique:     { label:'🚨 CRITIQUE',     bg:'#2d0a0a', border:'#ff5252', text:'#ff5252' },
  urgent:       { label:'⚠️ URGENT',       bg:'#2a1a00', border:'#ff9800', text:'#ff9800' },
  surveillance: { label:'👁 SURVEILLANCE', bg:'#0a1a2d', border:'#42a5f5', text:'#42a5f5' },
  routine:      { label:'✅ ROUTINE',      bg:'#0a1f12', border:'#00e676', text:'#00e676' },
};

// ── Composants SVG ───────────────────────────────────────────────────────────
function EcgGrid({ width=W, height=130 }) {
  const minor=[], major=[];
  for (let x=0;x<=width;x+=20) (x%100===0?major:minor).push(`M${x},0 L${x},${height}`);
  for (let y=0;y<=height;y+=20) (y%100===0?major:minor).push(`M0,${y} L${width},${y}`);
  return (<><path d={minor.join(' ')} stroke="#0d2d18" strokeWidth="0.5" fill="none"/><path d={major.join(' ')} stroke={ECG_BORD} strokeWidth="1" fill="none"/></>);
}

function EcgStrip({ rhythmId, color=ECG_GREEN, height=130, animate=false, onZoom=null }) {
  const pathRef = useRef(null);
  const stripPath = generateStrip(rhythmId);
  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const el = pathRef.current;
    el.style.strokeDasharray='3000'; el.style.strokeDashoffset='3000'; el.style.transition='none';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ el.style.transition='stroke-dashoffset 2s ease-out'; el.style.strokeDashoffset='0'; }));
  }, [animate, rhythmId]);
  return (
    <div style={{position:'relative',cursor:onZoom?'zoom-in':'default'}} onClick={onZoom}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} style={{display:'block'}}>
        <defs><filter id={`glow-${rhythmId}`}><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <rect width={W} height={height} fill="#050f0a"/>
        <EcgGrid width={W} height={height}/>
        <path ref={pathRef} d={stripPath} fill="none" stroke={color} strokeWidth="2" filter={`url(#glow-${rhythmId})`} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {onZoom && (
        <div style={{position:'absolute',bottom:6,right:8,background:'#000000aa',border:`1px solid ${color}44`,borderRadius:6,padding:'3px 8px',fontSize:12,color:color,fontFamily:'monospace',pointerEvents:'none'}}>
          ⛶ gros plan
        </div>
      )}
    </div>
  );
}

// ── Modal plein écran ECG ────────────────────────────────────────────────────
function EcgModal({ rhythm, onClose }) {
  const stripPath = generateStrip(rhythm.id);
  // Génère un tracé plus long (double longueur) pour le plein écran
  const longPath = (() => {
    let p = `M 0,${B}`;
    const id = rhythm.id;
    if (id==='normal')    { for(let i=0;i<10;i++) p+=normalComplex(i*160); }
    else if (id==='tachy'){ for(let i=0;i<16;i++) p+=normalComplex(i*100,100); }
    else if (id==='brady'){ const bw=267; for(let i=0;i<6;i++) p+=normalComplex(i*bw,bw); }
    else { p = `M 0,${B} ` + stripPath.slice(stripPath.indexOf('L')); }
    return p;
  })();
  const W2 = 1600;

  useEffect(() => {
    // Bloquer le scroll du body
    // position:fixed gère le scroll — pas besoin de bloquer body
  }, []);

  const p = PRIORITY_CFG[rhythm.nursing?.priority] || PRIORITY_CFG.routine;

  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.96)',display:'flex',flexDirection:'column',animation:'fadeIn 0.2s ease'}}
      onClick={onClose}>
      {/* Header modal */}
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${ECG_BORD}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}
        onClick={e=>e.stopPropagation()}>
        <div>
          <div style={{color:rhythm.color,fontFamily:'monospace',fontWeight:'bold',fontSize:15}}>{rhythm.label}</div>
          <div style={{display:'flex',gap:8,marginTop:4,alignItems:'center'}}>
            <span style={{color:ECG_MUTED,fontFamily:'monospace',fontSize:12}}>FC: {rhythm.hr}</span>
            <span style={{background:p.bg,border:`1px solid ${p.border}`,color:p.text,fontSize:12,fontFamily:'monospace',padding:'3px 8px',borderRadius:10}}>{p.label}</span>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{background:'none',border:`1px solid ${ECG_BORD}`,color:ECG_MUTED,borderRadius:8,minWidth:48,minHeight:44,padding:'6px 16px',fontSize:14,cursor:'pointer',fontFamily:'monospace'}}>✕ Fermer</button>
      </div>

      {/* Tracé plein écran — scrollable horizontalement */}
      <div style={{flex:1,overflowX:'auto',overflowY:'hidden',display:'flex',alignItems:'center',padding:'20px 0'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{minWidth:'max-content',padding:'0 16px'}}>
          <svg viewBox={`0 0 ${W2} 200`} height={200} width={W2} style={{display:'block'}}>
            <defs>
              <filter id="glow-modal">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <rect width={W2} height={200} fill="#050f0a" rx="8"/>
            <EcgGrid width={W2} height={200}/>
            <path d={longPath} fill="none" stroke={rhythm.color} strokeWidth="3"
              filter="url(#glow-modal)" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* Légende graduée */}
          <div style={{display:'flex',justifyContent:'space-between',paddingTop:6,width:W2}}>
            {Array.from({length:17},(_,i)=>(
              <span key={i} style={{color:'#ffffff33',fontFamily:'monospace',fontSize:12}}>{i*0.2>0?`${(i*0.2).toFixed(1)}s`:''}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Signes ECG en bas */}
      <div style={{padding:'12px 16px',borderTop:`1px solid ${ECG_BORD}`,flexShrink:0,overflowX:'auto'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',gap:8,flexWrap:'nowrap'}}>
          {rhythm.signs.map((sg,i)=>(
            <span key={i} style={{background:ECG_SURF2,border:`1px solid ${rhythm.color}44`,color:rhythm.color,padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'monospace',whiteSpace:'nowrap',flexShrink:0}}>✓ {sg}</span>
          ))}
        </div>
        <div style={{color:'#ffffff33',fontSize:12,fontFamily:'monospace',marginTop:8,textAlign:'center'}}>
          ← Faire défiler le tracé · Appuyer en dehors pour fermer →
        </div>
      </div>
    </div>
  );
}

// ── Onglet Bases ─────────────────────────────────────────────────────────────
function BasesTab() {
  const b=65, oneBeat=`M 0,${b} ${normalComplex(0,320,b)}`;
  const segs=[{x1:38,x2:88,label:'PR: 0,12–0,20s',y:100},{x1:108,x2:138,label:'QRS < 0,12s',y:108},{x1:138,x2:200,label:'QT: 0,35–0,45s',y:116}];
  const concepts=[
    {icon:'⚡',title:'Nœud sinusal',text:"Pace-maker naturel situé dans l'oreillette droite. Dépolarise à 60–100 fois/min. Le signal se propage via le nœud AV puis le faisceau de His."},
    {icon:'〰',title:"Onde P",text:"Dépolarisation auriculaire. Positive en D1, D2, aVF. Durée < 0,12s. Son absence signe une FA ou un rythme jonctionnel."},
    {icon:'→',title:'Intervalle PR',text:"Conduction nœud sinusal → ventricule. Normal: 0,12–0,20s. > 0,20s = bloc AV 1°."},
    {icon:'⬆',title:'Complexe QRS',text:"Dépolarisation ventriculaire. Durée normale < 0,12s. > 0,12s = bloc de branche."},
    {icon:'🌀',title:'Segment ST & onde T',text:"ST normalement isoélectrique. Sus-décalage > 1mm = ischémie. Onde T = repolarisation tardive."},
    {icon:'📏',title:'Intervalle QT',text:"QTc normal: < 440ms ♂, < 460ms ♀. QT long = risque de torsades de pointes."},
    {icon:'📄',title:'Vitesse du papier',text:"Standard: 25 mm/s. 1 petit carré = 0,04s, 1 grand carré = 0,20s. Amplitude: 1 grand carré = 1 mV."},
  ];
  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{color:ECG_GREEN,fontFamily:'monospace',fontSize:12,letterSpacing:3,marginBottom:10}}>ANATOMIE DU COMPLEXE ECG</div>
        <svg viewBox="0 0 380 140" width="100%" style={{display:'block',borderRadius:8}}>
          <rect width="380" height="140" fill="#050f0a" rx="8"/>
          <EcgGrid width={380} height={140}/>
          <path d={oneBeat} fill="none" stroke={ECG_GREEN} strokeWidth="2.5" strokeLinecap="round"/>
          <text x="28" y="32" fill="#ffcc02" fontSize="11" fontFamily="monospace" fontWeight="bold">P</text>
          <text x="100" y="10" fill={ECG_GREEN} fontSize="11" fontFamily="monospace" fontWeight="bold">QRS</text>
          <text x="150" y="32" fill="#42a5f5" fontSize="11" fontFamily="monospace" fontWeight="bold">T</text>
          {segs.map((s,i)=>(<g key={i}><line x1={s.x1} y1={s.y-3} x2={s.x2} y2={s.y-3} stroke="#ffffff44" strokeWidth="1"/><line x1={s.x1} y1={s.y-6} x2={s.x1} y2={s.y} stroke="#ffffff44" strokeWidth="1"/><line x1={s.x2} y1={s.y-6} x2={s.x2} y2={s.y} stroke="#ffffff44" strokeWidth="1"/><text x={(s.x1+s.x2)/2} y={s.y+9} fill="#ffffff77" fontSize="8" fontFamily="monospace" textAnchor="middle">{s.label}</text></g>))}
        </svg>
      </div>
      <div style={{color:ECG_GREEN,fontFamily:'monospace',fontSize:12,letterSpacing:3,marginBottom:10}}>NOTIONS FONDAMENTALES</div>
      {concepts.map((c,i)=>(
        <div key={i} style={{background:ECG_SURF2,border:`1px solid ${ECG_BORD}`,borderRadius:8,padding:'12px 14px',marginBottom:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <span style={{fontSize:18}}>{c.icon}</span>
            <span style={{color:ECG_GREEN,fontFamily:'monospace',fontSize:13,fontWeight:'bold'}}>{c.title}</span>
          </div>
          <p style={{color:ECG_MUTED,fontSize:13,lineHeight:1.6,margin:0}}>{c.text}</p>
        </div>
      ))}
    </div>
  );
}

// ── Onglet Rythmes ───────────────────────────────────────────────────────────
function DetailPanel({ rhythm, onClose }) {
  const [tab, setTab] = useState('ecg');
  const [zoom, setZoom] = useState(false);
  const p = PRIORITY_CFG[rhythm.nursing?.priority] || PRIORITY_CFG.routine;
  return (
    <div style={{background:ECG_BG,border:`1px solid ${rhythm.color}`,borderRadius:12,overflow:'hidden',boxShadow:`0 0 24px ${rhythm.color}22`,marginTop:12,animation:'fadeIn 0.3s ease'}}>
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${ECG_BORD}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{flex:1,paddingRight:8}}>
            <h2 style={{color:rhythm.color,fontFamily:'monospace',fontSize:14,margin:'0 0 4px',lineHeight:1.3}}>{rhythm.label}</h2>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{color:ECG_MUTED,fontSize:12,fontFamily:'monospace'}}>FC: {rhythm.hr}</span>
              <span style={{background:p.bg,border:`1px solid ${p.border}`,color:p.text,fontSize:12,fontFamily:'monospace',padding:'3px 8px',borderRadius:10}}>{p.label}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{background:'none',border:`1px solid ${ECG_BORD}`,color:ECG_MUTED,borderRadius:8,minWidth:44,minHeight:44,padding:'4px 12px',fontSize:14,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:6,marginTop:10}}>
          {[{id:'ecg',label:'📈 ECG'},{id:'nursing',label:'💉 Actions IDE'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?ECG_SURF2:'none',border:`1px solid ${tab===t.id?rhythm.color:ECG_BORD}`,color:tab===t.id?rhythm.color:ECG_MUTED,borderRadius:6,minHeight:44,padding:'7px 14px',fontSize:12,fontFamily:'monospace',cursor:'pointer'}}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{padding:'14px 16px'}}>
        {tab==='ecg' && <>
          {zoom && <EcgModal rhythm={rhythm} onClose={()=>setZoom(false)}/>}
          <EcgStrip rhythmId={rhythm.id} color={rhythm.color} animate height={100} onZoom={()=>setZoom(true)}/>
          <p style={{color:ECG_TEXT,fontSize:13,lineHeight:1.7,margin:'12px 0'}}>{rhythm.desc}</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {rhythm.signs.map((s,i)=>(<span key={i} style={{background:ECG_SURF2,border:`1px solid ${rhythm.color}44`,color:rhythm.color,padding:'4px 10px',borderRadius:20,fontSize:12,fontFamily:'monospace'}}>✓ {s}</span>))}
          </div>
        </>}
        {tab==='nursing' && rhythm.nursing && <>
          <div style={{background:p.bg,border:`1px solid ${p.border}`,borderRadius:8,padding:'8px 12px',marginBottom:12}}>
            <span style={{color:p.text,fontFamily:'monospace',fontSize:12,fontWeight:'bold'}}>{p.label}</span>
          </div>
          {rhythm.nursing.actions.map((a,i)=>(
            <div key={i} style={{background:ECG_SURF,border:`1px solid ${ECG_BORD}`,borderLeft:`3px solid ${rhythm.color}`,borderRadius:8,padding:'10px 12px',marginBottom:8,display:'flex',gap:10}}>
              <span style={{fontSize:20,flexShrink:0,marginTop:2}}>{a.icon}</span>
              <div>
                <div style={{color:rhythm.color,fontFamily:'monospace',fontSize:12,fontWeight:'bold',marginBottom:4}}>{a.step}</div>
                <div style={{color:ECG_TEXT,fontSize:13,lineHeight:1.6}}>{a.text}</div>
              </div>
            </div>
          ))}
          <div style={{marginTop:8,padding:'8px 12px',background:ECG_SURF,border:`1px dashed ${ECG_BORD}`,borderRadius:8,color:'#ffffff44',fontSize:12,fontFamily:'monospace'}}>
            ⚕️ Usage éducatif. Toute décision thérapeutique requiert validation médicale.
          </div>
        </>}
      </div>
    </div>
  );
}

function RythmesTab() {
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(null);
  const detailRef = useRef(null);
  const select = r => {
    setSelected(sel => sel?.id===r.id ? null : r);
    setTimeout(()=>detailRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
  };
  return (
    <div>
      {zoom && <EcgModal rhythm={zoom} onClose={()=>setZoom(null)}/>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
        {RHYTHMS.map(r=>(
          <div key={r.id} onClick={()=>select(r)} style={{background:selected?.id===r.id?ECG_SURF2:ECG_SURF,border:`1px solid ${selected?.id===r.id?r.color:ECG_BORD}`,borderRadius:8,padding:'10px 12px',cursor:'pointer',transition:'all 0.2s',boxShadow:selected?.id===r.id?`0 0 12px ${r.color}33`:'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:4}}>
              <span style={{color:r.color,fontFamily:'monospace',fontSize:12,fontWeight:'bold',lineHeight:1.3,flex:1}}>{r.label}</span>
              <span style={{background:r.category==='URGENCE'?'#ff525222':'#143d2088',color:r.category==='URGENCE'?'#ff5252':ECG_MUTED,fontSize:12,fontFamily:'monospace',padding:'2px 6px',borderRadius:4,flexShrink:0}}>{r.category}</span>
            </div>
            <div style={{height:46,overflow:'hidden',borderRadius:4,position:'relative'}}
              onClick={e=>{e.stopPropagation();setZoom(r);}}>
              <svg viewBox={`0 0 ${W} 130`} width="100%" height={46} style={{display:'block',cursor:'zoom-in'}}>
                <rect width={W} height={130} fill="#050f0a"/>
                <EcgGrid/>
                <path d={generateStrip(r.id)} fill="none" stroke={r.color} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{position:'absolute',bottom:2,right:4,color:r.color,fontSize:12,fontFamily:'monospace',background:'#000000aa',padding:'1px 6px',borderRadius:4}}>⛶</div>
            </div>
            <div style={{marginTop:4,color:'#ffffff55',fontSize:12,fontFamily:'monospace'}}>FC: {r.hr}</div>
          </div>
        ))}
      </div>
      <div ref={detailRef}>
        {selected && <DetailPanel rhythm={selected} onClose={()=>setSelected(null)}/>}
      </div>
    </div>
  );
}

// ── Onglet Quiz ──────────────────────────────────────────────────────────────
function shuffle(arr) { return [...arr].sort(()=>Math.random()-0.5); }
function generateQuestion(used=[]) {
  const pool = RHYTHMS.filter(r=>!used.includes(r.id));
  const target = pool.length>0 ? pool[Math.floor(Math.random()*pool.length)] : RHYTHMS[Math.floor(Math.random()*RHYTHMS.length)];
  const options = shuffle([target,...shuffle(RHYTHMS.filter(r=>r.id!==target.id)).slice(0,3)]);
  return { target, options };
}

function QuizTab() {
  const [score, setScore] = useState({correct:0,total:0});
  const [q, setQ] = useState(()=>generateQuestion());
  const [answered, setAnswered] = useState(null);
  const [streak, setStreak] = useState(0);
  const [zoom, setZoom] = useState(false);
  const usedRef = useRef([]);
  const resultRef = useRef(null);

  const handleAnswer = opt => {
    if (answered) return;
    setAnswered(opt.id);
    const correct = opt.id===q.target.id;
    setScore(s=>({correct:s.correct+(correct?1:0),total:s.total+1}));
    setStreak(s=>correct?s+1:0);
    if (correct) usedRef.current=[...usedRef.current.slice(-5),q.target.id];
    setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
  };
  const next = ()=>{setQ(generateQuestion(usedRef.current));setAnswered(null);};
  const accuracy = score.total>0 ? Math.round(score.correct/score.total*100) : 0;

  return (
    <div>
      <div style={{display:'flex',gap:0,marginBottom:14,background:ECG_SURF,border:`1px solid ${ECG_BORD}`,borderRadius:10,overflow:'hidden'}}>
        {[{label:'Score',value:`${score.correct}/${score.total}`,color:ECG_GREEN},
          {label:'Précision',value:`${accuracy}%`,color:accuracy>=80?ECG_GREEN:accuracy>=50?'#ffcc02':'#ff5252'},
          {label:'Série',value:`🔥 ${streak}`,color:streak>=3?'#ff9800':ECG_MUTED}
        ].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',padding:'12px 6px',borderRight:i<2?`1px solid ${ECG_BORD}`:'none'}}>
            <div style={{color:s.color,fontFamily:'monospace',fontSize:20,fontWeight:'bold'}}>{s.value}</div>
            <div style={{color:'#ffffff44',fontSize:12,fontFamily:'monospace',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:ECG_SURF,border:`1px solid ${ECG_BORD}`,borderRadius:10,padding:'14px',marginBottom:12}}>
        <div style={{color:'#ffffff55',fontFamily:'monospace',fontSize:12,marginBottom:10,letterSpacing:2}}>IDENTIFIEZ CE RYTHME</div>
        {zoom && <EcgModal rhythm={q.target} onClose={()=>setZoom(false)}/>}
        <EcgStrip rhythmId={q.target.id} color={q.target.color} height={100} animate={!answered} onZoom={()=>setZoom(true)}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {q.options.map(opt=>{
          const isCorrect=opt.id===q.target.id, isSel=answered===opt.id;
          let bg=ECG_SURF,bc=ECG_BORD,tc=ECG_TEXT;
          if (answered) { if (isCorrect){bg=ECG_SURF2;bc=ECG_GREEN;tc=ECG_GREEN;} else if (isSel){bg='#1f0a0a';bc='#ff5252';tc='#ff5252';} else {tc='#ffffff33';} }
          return (
            <button key={opt.id} onClick={()=>handleAnswer(opt)} style={{background:bg,border:`1px solid ${bc}`,borderRadius:8,minHeight:48,padding:'10px 12px',textAlign:'left',transition:'all 0.25s',fontFamily:'monospace',cursor:answered?'default':'pointer'}}>
              <div style={{color:tc,fontSize:12,fontWeight:'bold',marginBottom:2,lineHeight:1.3}}>{answered&&isCorrect?'✓ ':answered&&isSel?'✗ ':''}{opt.label}</div>
              <div style={{color:answered?(isCorrect?ECG_MUTED:'#ffffff33'):'#ffffff44',fontSize:12}}>{opt.hr}</div>
            </button>
          );
        })}
      </div>
      {answered && (
        <div ref={resultRef} style={{marginTop:12,background:answered===q.target.id?ECG_SURF2:'#1a0a0a',border:`1px solid ${answered===q.target.id?ECG_GREEN:'#ff5252'}`,borderRadius:10,overflow:'hidden',animation:'fadeIn 0.3s ease'}}>
          <div style={{padding:'12px 14px',borderBottom:`1px solid ${ECG_BORD}`}}>
            <div style={{color:answered===q.target.id?ECG_GREEN:'#ff5252',fontFamily:'monospace',fontSize:12,fontWeight:'bold',marginBottom:6}}>
              {answered===q.target.id ? '✓ BONNE RÉPONSE !' : `✗ C'était : ${q.target.label}`}
            </div>
            <p style={{color:ECG_TEXT,fontSize:13,lineHeight:1.6,margin:'0 0 8px'}}>{q.target.desc}</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {q.target.signs.map((s,i)=>(<span key={i} style={{background:ECG_SURF2,color:ECG_GREEN,padding:'3px 8px',borderRadius:20,fontSize:12,fontFamily:'monospace',border:`1px solid ${ECG_GREEN}44`}}>✓ {s}</span>))}
            </div>
          </div>
          {q.target.nursing && (
            <div style={{padding:'12px 14px',borderBottom:`1px solid ${ECG_BORD}`}}>
              <div style={{color:'#42a5f5',fontFamily:'monospace',fontSize:12,letterSpacing:2,marginBottom:8}}>💉 ACTIONS IDE CLÉS</div>
              {q.target.nursing.actions.slice(0,2).map((a,i)=>(
                <div key={i} style={{display:'flex',gap:8,background:ECG_SURF,borderLeft:`2px solid ${q.target.color}`,borderRadius:6,padding:'7px 10px',marginBottom:6}}>
                  <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
                  <div>
                    <div style={{color:q.target.color,fontFamily:'monospace',fontSize:12,marginBottom:2}}>{a.step}</div>
                    <div style={{color:ECG_MUTED,fontSize:12,lineHeight:1.5}}>{a.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{padding:'10px 14px'}}>
            <button onClick={next} style={{background:`${ECG_GREEN}18`,border:`1px solid ${ECG_GREEN}`,color:ECG_GREEN,fontFamily:'monospace',fontSize:13,minHeight:48,padding:'8px 20px',borderRadius:8,cursor:'pointer'}}>
              PROCHAIN ECG →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Module principal ─────────────────────────────────────────────────────────
const TABS = [
  {id:'bases',   label:'Bases',   icon:'📖'},
  {id:'rythmes', label:'Rythmes', icon:'💓'},
  {id:'quiz',    label:'Quiz',    icon:'🎯'},
];

export default function ECG({ onBack, onBackOverride }) {
  const [tab, setTab] = useState('bases');

  // Bouton retour Android → onBack (pas de drill-down dans ECG)
  useEffect(() => {
    if (onBackOverride) onBackOverride(onBack);
    return () => { if (onBackOverride) onBackOverride(null); };
  }, []);
  const normalPath = generateStrip('normal');

  return (
    <div style={{position:'fixed',inset:0,background:ECG_BG,color:ECG_TEXT,fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column'}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      {/* Header */}
      <div style={{background:ECG_SURF,borderBottom:`1px solid ${ECG_BORD}`,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={onBack} aria-label="Retour" style={{background:'none',border:`1px solid ${ECG_GREEN}44`,borderRadius:100,width:48,height:48,color:ECG_GREEN,fontSize:22,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>‹</button>
          <div>
            <div style={{fontFamily:'monospace',fontSize:12,color:ECG_GREEN,letterSpacing:3}}>MODULE</div>
            <h1 style={{fontFamily:'monospace',fontSize:17,margin:0,color:'#fff',letterSpacing:1}}>ECG <span style={{color:ECG_GREEN}}>Interactif</span></h1>
          </div>
        </div>
        <div style={{width:80,height:28,overflow:'hidden',opacity:0.6}}>
          <svg viewBox="100 40 700 80" width="80" height="28" style={{display:'block'}}>
            <path d={normalPath} fill="none" stroke={ECG_GREEN} strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:ECG_SURF,borderBottom:`1px solid ${ECG_BORD}`,flexShrink:0,zIndex:9}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:'none',border:'none',borderBottom:tab===t.id?`2px solid ${ECG_GREEN}`:'2px solid transparent',color:tab===t.id?ECG_GREEN:ECG_MUTED,fontFamily:'monospace',fontSize:12,minHeight:48,padding:'10px 2px',cursor:'pointer',transition:'all 0.2s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{flex:1, overflowY:'auto', padding:'14px 14px 40px'}}>
        {tab==='bases'   && <BasesTab/>}
        {tab==='rythmes' && <RythmesTab/>}
        {tab==='quiz'    && <QuizTab/>}
      </div>
    </div>
  );
}
