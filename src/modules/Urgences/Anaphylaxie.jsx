import { ClinicalSource } from '../../components/ClinicalSource.jsx';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card } from '../../ui/index.js';
const C = T.urg;
export default function Anaphylaxie() {
  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      <Card dim={T.dangerDim} style={{border:`1px solid ${T.danger}44`}}>
        <div style={{color:T.danger,fontWeight:700,fontSize:tk.font.base}}>🚨 ADRÉNALINE = TRAITEMENT DE 1ère INTENTION</div>
        <div style={{color:T.muted,fontSize:tk.font.sm,marginTop:4}}>Ne jamais attendre pour injecter l&apos;adrénaline</div>
      </Card>
      {[
        {title:'1. RECONNAÎTRE',color:T.warning,content:['Urticaire généralisée · Angio-œdème','Bronchospasme · Stridor laryngé','Hypotension · Tachycardie','Troubles digestifs · Perte de conscience']},
        {title:'2. ADRÉNALINE IM',color:T.danger,content:['Adulte : 0,5 mg IM (face antérolatérale cuisse)','Enfant : 0,01 mg/kg IM (max 0,5 mg)','Auto-injecteur : Jext®/Anapen® (cuisse, directement)','Répéter si besoin après 5-15 min']},
        {title:'3. POSITION',color:C,content:['Allonger jambes surélevées (sauf dyspnée)','Assis si détresse respiratoire dominante','Ne pas lever si hypotension']},
        {title:'4. APPEL & O₂',color:C,content:['Appeler le 15 immédiatement','O₂ haut débit au masque 15 L/min','Scope · SaO₂ · PA · ECG']},
        {title:'5. VVP + REMPLISSAGE',color:C,content:['2 VVP G16 minimum','NaCl 0,9% : 500-1000 ml rapide si hypotension','Adrénaline IV si choc réfractaire : 0,1-1 mg/h SAP']},
        {title:'6. TRAITEMENTS 2e LIGNE',color:T.info,content:['Corticoïdes : Méthylprednisolone 1-2 mg/kg IV (prévention rebond)','Antihistaminiques : Phénergan 25-50 mg IV lent','Salbutamol nébulisé si bronchospasme : 5 mg','Ne pas retarder l\'adrénaline pour ces traitements']},
      ].map((step,i)=>(
        <Card key={i} accent={step.color}>
          <div style={{color:step.color,fontWeight:700,fontSize:tk.font.base,marginBottom:8}}>{step.title}</div>
          {step.content.map((line,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,padding:'2px 0',lineHeight:1.5}}>• {line}</div>)}
        </Card>
      ))}
      <ClinicalSource sourceKey="ANAPHYLAXIE" />
    </div>
  );
}
