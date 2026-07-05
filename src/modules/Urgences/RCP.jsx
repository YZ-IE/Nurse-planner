import { ClinicalSource } from '../../components/ClinicalSource.jsx';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, Chip, Banner } from '../../ui/index.js';
const C = T.urg;

export default function RCP() {
  const [phase, setPhase] = useState('bls'); // bls=basique, acls=avancé, drugs=médicaments

  const BLS = [
    {num:1,title:'SÉCURITÉ',color:T.success,steps:['Sécuriser la zone','Se protéger (gants)','Évaluer les dangers environnants']},
    {num:2,title:'ÉVALUATION',color:C,steps:['Appeler : "Ça va ?"','Secouer les épaules doucement','Si pas de réponse → ALERTE']},
    {num:3,title:'ALERTE',color:C,steps:['Appeler le 15 (SAMU) ou 18 (SDIS)','Demander défibrillateur','Ne pas laisser la victime seule si possible']},
    {num:4,title:'LIBÉRER LES VOIES',color:C,steps:['Basculer tête en arrière','Soulever le menton','Retirer corps étranger visible']},
    {num:5,title:'ÉVALUER LA RESPIRATION',color:C,steps:['Regarder le thorax','Écouter','Sentir — max 10 secondes','Gasps = arrêt cardiaque !']},
    {num:6,title:'MCE — 30 COMPRESSIONS',color:T.danger,steps:['Talon de la main sur sternum','Dépression 5-6 cm','Fréquence : 100-120/min','Bras tendus, épaules au-dessus','Relâchement complet entre compressions']},
    {num:7,title:'2 INSUFFLATIONS',color:'#f97316',steps:['Maintenir bascule tête','Pincer les narines','Souffler 1 seconde','Voir le thorax se soulever','Si impossible : compressions seules']},
    {num:8,title:'CONTINUER 30:2',color:T.danger,steps:['Alterner 30 compressions / 2 insufflations','Changer de sauveteur toutes les 2 min','Ne pas interrompre plus de 10 secondes','Utiliser DAE dès disponible']},
  ];

  const DRUGS_RCP = [
    {drug:'Adrénaline',dose:'1 mg IV/IO',timing:'Dès que voie disponible, puis toutes les 3-5 min',note:'Diluée dans 20 ml NaCl 0,9% + flush'},
    {drug:'Amiodarone',dose:'300 mg IV/IO en bolus',timing:'Après 3e choc si FV/TV réfractaire',note:'Diluer dans 20 ml G5%. 2e dose 150 mg si nécessaire'},
    {drug:'Bicarbonate Na',dose:'1 mEq/kg IV',timing:'Arrêt prolongé > 15 min ou hyperkaliémie',note:'Après ROSC si pH < 7,1'},
    {drug:'Atropine',dose:'Non recommandée en routine',timing:'—',note:'Peut être utilisée pour bradycardie post-ROSC'},
    {drug:'Magnésium',dose:'2 g IV en 10 min',timing:'Torsades de pointes',note:'Dilué dans 10 ml G5%'},
    {drug:'Calcium gluconate',dose:'1 g IV lent',timing:'Hyperkaliémie / Hypocalcémie / Toxicité anti-calciques',note:'Voie dédiée'},
  ];

  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      <Banner kind="danger" icon="🚨" title="ARRÊT CARDIO-RESPIRATOIRE">
        Appeler le 15 · Demander le chariot d&apos;urgence et le DEA
      </Banner>

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {[['bls','BLS Basique'],['acls','ACLS Avancé'],['drugs','Médicaments']].map(([id,lbl])=>(
          <Chip key={id} color={C} active={phase===id} onClick={()=>setPhase(id)} style={{flex:1,justifyContent:'center'}}>{lbl}</Chip>
        ))}
      </div>

      {phase==='bls' && BLS.map((step,i)=>(
        <Card key={i} accent={step.color}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{background:step.color+'33',border:`1px solid ${step.color}`,borderRadius:'50%',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:step.color,fontWeight:700,fontSize:14,flexShrink:0}}>{step.num}</div>
            <div style={{color:step.color,fontWeight:700,fontSize:tk.font.base}}>{step.title}</div>
          </div>
          {step.steps.map((st,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,padding:'4px 0',borderBottom:j<step.steps.length-1?`1px solid ${T.border}`:'none',lineHeight:1.5}}>• {st}</div>)}
        </Card>
      ))}

      {phase==='acls' && (
        <div>
          <Card accent={C}>
            <div style={{color:C,fontWeight:700,fontSize:tk.font.base,marginBottom:10}}>Algorithme ACLS simplifié</div>
            {[
              ['Rythme choquable ?','FV / TV sans pouls → Choc 200J biphasique → MCE 2min → Adrénaline 1mg → Choc si nécessaire'],
              ['Rythme non choquable ?','Asystolie / DEM → MCE continu → Adrénaline 1mg dès que possible → Toutes les 3-5 min'],
              ['Causes réversibles (4H-4T)','Hypoxie · Hypovolémie · Hypo/Hyperkaliémie · Hypothermie\nTamponnade · Pneumo-T · Thrombose coronaire · Thrombose pulmonaire'],
              ['Post-ROSC (retour circulation)','O₂ pour SpO₂ 94-98% · PA systolique > 90 mmHg · Hypothermie thérapeutique si comateux · ECG 12D'],
            ].map(([titre, contenu],i)=>(
              <div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<3?`1px solid ${T.border}`:'none'}}>
                <div style={{color:C,fontSize:tk.font.sm,fontWeight:700,marginBottom:5}}>{titre}</div>
                <div style={{color:T.text,fontSize:tk.font.sm,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{contenu}</div>
              </div>
            ))}
          </Card>
          <Card dim={T.infoDim} style={{border:`1px solid ${T.info}33`}}>
            <div style={{color:T.info,fontSize:tk.font.xs,fontWeight:700,marginBottom:8}}>Accès vasculaire</div>
            <div style={{color:T.muted,fontSize:tk.font.sm,lineHeight:1.8}}>
              1️⃣ VVP en premier (antécubital ou jugulaire externe)<br/>
              2️⃣ Voie IO si VVP impossible (tibia proximal, humérus)<br/>
              3️⃣ KTC en dernier recours (ne pas retarder les chocs)
            </div>
          </Card>
        </div>
      )}

      {phase==='drugs' && DRUGS_RCP.map((d,i)=>(
        <Card key={i} accent={C}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{color:C,fontWeight:700,fontSize:tk.font.base}}>{d.drug}</span>
            <span style={{color:T.text,fontSize:tk.font.sm,fontWeight:600}}>{d.dose}</span>
          </div>
          <div style={{color:T.muted,fontSize:tk.font.sm,marginBottom:4}}>⏱ {d.timing}</div>
          <div style={{color:T.text,fontSize:tk.font.sm}}>📋 {d.note}</div>
        </Card>
      ))}
      <ClinicalSource sourceKey="RCP" />
    </div>
  );
}
