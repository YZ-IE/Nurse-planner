import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card } from '../../ui/index.js';
const C = T.urg;
export default function Convulsions() {
  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      {[
        {title:'PENDANT LA CRISE',color:'#f97316',content:['Sécuriser l\'environnement (retirer objets dangereux)','Allonger en position latérale de sécurité (après)','Ne PAS mettre d\'objet dans la bouche','Ne PAS immobiliser les membres','Chronométrer la durée','O₂ si possible · Appel médecin si > 5 min']},
        {title:'TRAITEMENT MÉDICAL',color:'#ef4444',content:['Diazépam IR : 10 mg (adulte) — 1ère intention si pas de VVP','Clonazépam (Rivotril) IV : 1 mg lent (2 min)','Midazolam IM/IN : 10 mg si pas d\'accès veineux','État de mal > 30 min : Phénytoïne ou Lévétiracétam IV','Phénobarbital si réfractaire']},
        {title:'APRÈS LA CRISE — Phase postcritique',color:'#22c55e',content:['Position latérale de sécurité','Surveiller respiration, SpO₂, conscience','Glasgow · Déficit focal ? (AVC ?)','Glycémie capillaire systématique','Température · ECG','NFS · Ionogramme · EEG si prescrit']},
        {title:'CAUSES À RECHERCHER',color:'#8b5cf6',content:['Épilepsie connue · Oubli traitement','Hypoglycémie · Hyponatrémie','Fièvre (convulsions fébriles enfant)','AVC · Traumatisme crânien','Sevrage alcoolique · Toxiques','Méningite · Encéphalite']},
      ].map((sec,i)=>(
        <Card key={i} accent={sec.color}>
          <div style={{color:sec.color,fontWeight:700,fontSize:tk.font.base,marginBottom:8}}>{sec.title}</div>
          {sec.content.map((line,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,marginBottom:4,lineHeight:1.5}}>• {line}</div>)}
        </Card>
      ))}
    </div>
  );
}
