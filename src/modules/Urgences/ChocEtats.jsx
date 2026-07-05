import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card } from '../../ui/index.js';
const C = T.urg;
const CHOCS = [
  {type:'Hypovolémique',color:'#ef4444',signes:['Tachycardie','Hypotension','Pâleur · Sueurs froides','TRC > 3s · Marbrures','Oligurie'],causes:['Hémorragie (digestive, traumatique)','Déshydratation sévère','3e secteur (brûlures, pancréatite)'],ttt:['2 VVP larges (G14-G16)','Remplissage NaCl 0,9% ou Cristalloïdes rapide','Contrôle hémorragie si visible','Transfusion si choc hémorragique','Position de Trendelenburg']},
  {type:'Cardiogénique',color:'#8b5cf6',signes:['Tachycardie ou bradycardie','Hypotension','OAP · Crépitants','Turgescence jugulaire','Extrémités froides'],causes:['IDM étendu','Trouble du rythme grave','Tamponnade','EP massive'],ttt:['Scope + ECG urgent','O₂ · Position demi-assise','VVP · Pas de remplissage massif','Dobutamine si prescrite','Appel cardio en urgence']},
  {type:'Distributif (septique/anaphylactique)',color:'#f97316',signes:['Vasodilatation · Peau chaude','Tachycardie · Hypotension','Fièvre ou hypothermie (septique)','Urticaire (anaphylactique)'],causes:['Sepsis / Choc septique','Anaphylaxie','Choc neurogénique'],ttt:['Noradrénaline si septique','Adrénaline si anaphylaxie','Remplissage modéré','Antibiotiques urgents (septique)']},
  {type:'Obstructif',color:'#06b6d4',signes:['Dyspnée + hypotension','Turgescence jugulaire','Absence murmure vésiculaire (PNO)','Tachycardie · Cyanose'],causes:['Pneumothorax compressif','Tamponnade cardiaque','EP massive'],ttt:['Exsufflation si PNO compressif','Péricardiocentèse si tamponnade (médecin)','Thrombolyse si EP massive','O₂ + scope + ECG urgent']},
];
export default function ChocEtats() {
  return (
    <div style={{padding:'14px'}}>
      <MedicalDisclaimer level="standard" />
      {CHOCS.map((choc,i)=>(
        <Card key={i} accent={choc.color}>
          <div style={{color:choc.color,fontWeight:700,fontSize:tk.font.md,marginBottom:10}}>Choc {choc.type}</div>
          <div style={{color:T.muted,fontSize:tk.font.xs,fontWeight:600,marginBottom:6}}>Signes</div>
          {choc.signes.map((s,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,marginBottom:3,lineHeight:1.5}}>• {s}</div>)}
          <div style={{color:T.muted,fontSize:tk.font.xs,fontWeight:600,margin:'10px 0 6px'}}>Causes</div>
          {choc.causes.map((c,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,marginBottom:3,lineHeight:1.5}}>• {c}</div>)}
          <div style={{color:choc.color,fontSize:tk.font.xs,fontWeight:700,margin:'10px 0 6px'}}>Traitement infirmier</div>
          {choc.ttt.map((t,j)=><div key={j} style={{color:T.text,fontSize:tk.font.sm,marginBottom:3,lineHeight:1.5}}>→ {t}</div>)}
        </Card>
      ))}
    </div>
  );
}
