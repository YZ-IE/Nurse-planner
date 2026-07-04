import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, toast } from '../../ui/index.js';
const C = T.orga;
const CINQ_B = [
  {b:'Bon médicament',icon:'💊',checks:['Nom DCI et spécialité vérifiés','Correspondance ordonnance ↔ médicament préparé']},
  {b:'Bonne dose',icon:'⚖️',checks:['Dose calculée et vérifiée','Unité correcte (mg, µg, UI, mEq)','Dilution conforme à la fiche technique']},
  {b:'Bonne voie',icon:'💉',checks:['Voie prescrite (IV, SC, IM, PO, inhalée…)','Compatibilité voie/médicament vérifiée']},
  {b:'Bon patient',icon:'👤',checks:['Identité vérifiée (nom + date naissance)','Bracelet d\'identification contrôlé','Allergies vérifiées']},
  {b:'Bon moment',icon:'⏰',checks:['Heure de la prescription respectée','Intervalle entre doses respecté','Jeûne requis respecté (si applicable)']},
];
export default function ChecklistMedoc() {
  const [checked,setChecked]=useState({});
  const max=CINQ_B.reduce((a,b)=>a+b.checks.length,0);
  const toggle=(key)=>setChecked(p=>{
    const next={...p,[key]:!p[key]};
    if(Object.values(next).filter(Boolean).length===max) toast('5B validés — administration sécurisée');
    return next;
  });
  const total=Object.values(checked).filter(Boolean).length;
  return (
    <div style={{padding:'14px'}}>
      <Card dim={T.orgaDim} style={{border:`1px solid ${C}30`}}>
        <div style={{color:C,fontWeight:tk.weight.bold,fontSize:tk.font.md,marginBottom:4}}>Règle des 5B</div>
        <div style={{color:T.muted,fontSize:tk.font.sm}}>Vérification systématique avant toute administration médicamenteuse</div>
        <div style={{background:C+'26',borderRadius:tk.radius.sm,padding:'10px 14px',marginTop:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{color:C,fontSize:tk.font.sm,fontWeight:tk.weight.semi}}>Progression</span>
          <span style={{color:C,fontWeight:tk.weight.bold,fontSize:tk.font.md}}>{total}/{max}</span>
        </div>
      </Card>
      {CINQ_B.map((b,bi)=>(
        <Card key={bi} accent={C}>
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:24}}>{b.icon}</span>
            <div style={{color:C,fontWeight:tk.weight.bold,fontSize:tk.font.md}}>{b.b}</div>
          </div>
          {b.checks.map((check,ci)=>{
            const key=`${bi}-${ci}`;
            return (
              <button key={ci} onClick={()=>toggle(key)}
                style={{display:'flex',alignItems:'center',gap:12,width:'100%',minHeight:tk.touch.min,background:checked[key]?C+'14':T.bg,border:`1.5px solid ${checked[key]?C:T.border}`,borderRadius:tk.radius.md,padding:'8px 14px',marginBottom:8,cursor:'pointer',textAlign:'left',WebkitTapHighlightColor:'transparent'}}>
                <div style={{width:26,height:26,borderRadius:7,background:checked[key]?C:'transparent',border:`2px solid ${checked[key]?C:T.border2}`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:800,flexShrink:0,transition:'background 0.15s'}}>{checked[key]?'✓':''}</div>
                <span style={{color:checked[key]?C:T.text,fontSize:tk.font.base,lineHeight:1.4}}>{check}</span>
              </button>
            );
          })}
        </Card>
      ))}
      {total===max&&(
        <Card dim={T.successDim} style={{border:`1px solid ${T.success}44`,textAlign:'center'}}>
          <div style={{fontSize:36}}>✅</div>
          <div style={{color:T.success,fontSize:tk.font.lg,fontWeight:tk.weight.bold}}>Toutes les vérifications effectuées</div>
          <div style={{color:T.muted,fontSize:tk.font.sm,marginTop:4}}>Administration sécurisée · Tracer dans le dossier</div>
        </Card>
      )}
    </div>
  );
}
