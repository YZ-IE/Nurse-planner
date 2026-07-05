import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card } from '../../ui/index.js';
const C = T.urg;
export default function Hypoglycemie() {
  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      <Card dim={T.warningDim} style={{border:`1px solid ${T.warning}44`}}>
        <div style={{color:T.warning,fontWeight:700,fontSize:tk.font.base}}>Hypoglycémie sévère : glycémie &lt; 0,50 g/L (2,8 mmol/L)</div>
      </Card>
      {[
        {title:'Patient CONSCIENT',color:T.success,content:['Sucre en morceau : 3 morceaux ou 15g','Jus de fruit : 150 ml · Soda : 150 ml','Attendre 15 min · Resucrer si besoin','Collation pain + fromage après correction','Surveiller glycémie 30 min puis 1h']},
        {title:'Patient INCONSCIENT',color:T.danger,content:['NE PAS donner per os (fausse route)','G30% IV : 50-100 ml (1-2 ampoules) à passer rapidement','OU Glucagon IM/SC : 1 mg (adulte)','Récupération 10-15 min · Resucrer ensuite','Appeler le médecin · Rechercher la cause']},
        {title:'Surveillance post-correction',color:C,content:['Glycémie à 30 min, 1h, 2h','Rechercher facteur déclenchant (repas sauté, exercice, erreur insuline)','Adapter traitement si récidive','Éducation patient sur signes précoces','Prévenir médecin si glycémie réfractaire']},
      ].map((sec,i)=>(
        <Card key={i} accent={sec.color}>
          <div style={{color:sec.color,fontWeight:700,fontSize:tk.font.base,marginBottom:8}}>{sec.title}</div>
          {sec.content.map((line,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,marginBottom:4,lineHeight:1.5}}>• {line}</div>)}
        </Card>
      ))}
    </div>
  );
}
