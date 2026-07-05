import { ClinicalSource } from '../../components/ClinicalSource.jsx';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, Banner } from '../../ui/index.js';
const C = T.urg;
export default function Sepsis() {
  const [qsofa, setQsofa] = useState({resp:false,mental:false,pa:false});
  const score = Object.values(qsofa).filter(Boolean).length;
  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      <Card>
        <div style={{color:C,fontSize:tk.font.xs,fontWeight:700,marginBottom:12}}>Score qSOFA — Dépistage rapide</div>
        {[
          {key:'resp',label:'FR ≥ 22/min',icon:'🫁'},
          {key:'mental',label:'Altération de la conscience (GCS < 15)',icon:'🧠'},
          {key:'pa',label:'PAS ≤ 100 mmHg',icon:'🩺'},
        ].map(item=>(
          <div key={item.key} onClick={()=>setQsofa(p=>({...p,[item.key]:!p[item.key]}))} style={{display:'flex',alignItems:'center',gap:12,minHeight:48,padding:'10px 0',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}}>
            <div style={{width:28,height:28,borderRadius:6,background:qsofa[item.key]?C+'33':T.surface,border:`2px solid ${qsofa[item.key]?C:T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{qsofa[item.key]?'✓':''}</div>
            <span style={{fontSize:18}}>{item.icon}</span>
            <span style={{color:T.text,fontSize:tk.font.base}}>{item.label}</span>
          </div>
        ))}
        <div style={{marginTop:12}}>
          <Banner kind={score>=2?'danger':'success'} icon={score>=2?'⚠️':'✓'} title={`qSOFA : ${score}/3`}>
            {score>=2?'Risque élevé de sepsis — BUNDLE 1H IMMÉDIAT':'Surveillance rapprochée'}
          </Banner>
        </div>
      </Card>
      <Card>
        <div style={{color:C,fontSize:tk.font.xs,fontWeight:700,marginBottom:10}}>Bundle sepsis — 1 heure</div>
        {[
          ['1. Hémocultures','2 paires avant antibiotiques · Ne pas retarder ATB pour hémocultures'],
          ['2. Antibiotiques','Administration dans l\'heure · Spectre large · Selon foyer suspecté'],
          ['3. Lactates','Lactatémie > 2 mmol/L = hypoperfusion · > 4 = choc septique'],
          ['4. Remplissage','Si hypotension ou lactate > 4 : 30 ml/kg NaCl 0,9% en 3h'],
          ['5. Vasopresseurs','Si PA non corrigée : Noradrénaline cible PAM > 65 mmHg'],
        ].map(([titre,contenu],i)=>(
          <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<4?`1px solid ${T.border}`:'none'}}>
            <div style={{color:C,fontSize:tk.font.sm,fontWeight:700,marginBottom:4}}>{titre}</div>
            <div style={{color:T.text,fontSize:tk.font.sm,lineHeight:1.5}}>{contenu}</div>
          </div>
        ))}
      </Card>
      <ClinicalSource sourceKey="SEPSIS" />
    </div>
  );
}
