import { ClinicalSource } from '../../components/ClinicalSource.jsx';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Btn, Card, Banner } from '../../ui/index.js';
const C = T.urg;

export default function AVC() {
  const [fast, setFast] = useState({F:null,A:null,S:null});
  const score = Object.values(fast).filter(v=>v===true).length;
  const answered = Object.values(fast).some(v=>v!==null);

  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      <Banner kind="info" icon="⏰" title="LE TEMPS C'EST DU CERVEAU">
        2 millions de neurones meurent par minute · Objectif : thrombolyse &lt; 4h30
      </Banner>

      {/* TEST FAST */}
      <Card>
        <div style={{color:C,fontSize:tk.font.xs,fontWeight:700,marginBottom:12}}>Test FAST — Évaluation rapide</div>
        {[
          {key:'F',letter:'F',title:'Face — Asymétrie faciale',desc:'Demander de sourire. Un côté tombe ?',oui:'Asymétrie présente',non:'Symétrique'},
          {key:'A',letter:'A',title:'Arms — Déficit moteur',desc:'Lever les 2 bras. L\'un chute ?',oui:'Chute d\'un bras',non:'Symétrique'},
          {key:'S',letter:'S',title:'Speech — Troubles du langage',desc:'Dire une phrase. Dysarthrie/Aphasie ?',oui:'Langage anormal',non:'Normal'},
        ].map(item=>(
          <div key={item.key} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:8}}>
              <div style={{background:fast[item.key]===true?T.dangerDim:fast[item.key]===false?T.successDim:T.surface2,border:`1.5px solid ${fast[item.key]===true?T.danger:fast[item.key]===false?T.success:T.border}`,borderRadius:8,width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',color:fast[item.key]===true?T.danger:fast[item.key]===false?T.success:T.muted,fontWeight:700,fontSize:18,flexShrink:0}}>{item.letter}</div>
              <div><div style={{color:T.text,fontWeight:700,fontSize:tk.font.base}}>{item.title}</div>
              <div style={{color:T.muted,fontSize:tk.font.sm}}>{item.desc}</div></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn color={T.danger} variant={fast[item.key]===true?'soft':'outline'} size="md" onClick={()=>setFast(p=>({...p,[item.key]:true}))} style={{flex:1}}>⚠️ {item.oui}</Btn>
              <Btn color={T.success} variant={fast[item.key]===false?'soft':'outline'} size="md" onClick={()=>setFast(p=>({...p,[item.key]:false}))} style={{flex:1}}>✓ {item.non}</Btn>
            </div>
          </div>
        ))}
        {answered && (
          <Banner kind={score>0?'danger':'success'} icon={score>0?'🚨':'✓'} title={score>0?'AVC PROBABLE — ALERTER EN URGENCE':'Test FAST négatif'}>
            {score>0?'Appeler le 15 immédiatement · Préciser heure de début des symptômes':'Surveiller et réévaluer'}
          </Banner>
        )}
      </Card>

      {/* Conduite à tenir */}
      <Card>
        <div style={{color:C,fontSize:tk.font.xs,fontWeight:700,marginBottom:10}}>Conduite à tenir</div>
        {[
          ['1. ALERTER','Médecin + SAMU 15 · Préciser heure exacte de début · Ne pas donner à manger/boire'],
          ['2. SCOPE','FC · PA aux 2 bras · SpO₂ · Glycémie capillaire · ECG 12D'],
          ['3. VVP','G18 minimum · NaCl 0,9% · Prélèvements : NFS, coag, bilan hépatique, groupe'],
          ['4. NEURO','Glasgow · Pupilles · Déficit moteur · NIHSS si formé'],
          ['5. CI THROMBOLYSE','PA > 185/110 · Chirurgie < 14j · Anticoag · Glycémie < 0,5 ou > 4 g/L'],
          ['6. IMAGERIE','Scanner cérébral en urgence (< 25 min) · IRM si disponible'],
        ].map(([titre,contenu],i)=>(
          <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<5?`1px solid ${T.border}`:'none'}}>
            <div style={{color:C,fontSize:tk.font.sm,fontWeight:700,marginBottom:4}}>{titre}</div>
            <div style={{color:T.text,fontSize:tk.font.sm,lineHeight:1.5}}>{contenu}</div>
          </div>
        ))}
      </Card>
      <ClinicalSource sourceKey="AVC" />
    </div>
  );
}
