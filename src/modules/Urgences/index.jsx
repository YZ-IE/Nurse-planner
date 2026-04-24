import { T, s } from '../../theme.js';
import ModuleShell from '../shared/ModuleShell.jsx';
import StarButton  from '../shared/StarButton.jsx';

import RCP          from './RCP.jsx';
import AVC          from './AVC.jsx';
import Anaphylaxie  from './Anaphylaxie.jsx';
import Sepsis       from './Sepsis.jsx';
import ChocEtats    from './ChocEtats.jsx';
import DetressResp  from './DetressResp.jsx';
import Hypoglycemie from './Hypoglycemie.jsx';
import Convulsions  from './Convulsions.jsx';
import OAP          from './OAP.jsx';
import Hyperkaliemie from './Hyperkaliemie.jsx';
import Intoxication from './Intoxication.jsx';

const MOD = 'urg';

const PROTOS = [
  { id:'rcp',   icon:'❤️',  label:'Arrêt Cardio-Respiratoire',          sub:'RCP adulte · ACLS',                            urgent:true },
  { id:'avc',   icon:'🧠',  label:'AVC / Accident Vasculaire Cérébral', sub:'FAST · Thrombolyse',                           urgent:true },
  { id:'ana',   icon:'💉',  label:'Anaphylaxie / Choc allergique',       sub:'Adrénaline · Conduite',                        urgent:true },
  { id:'sep',   icon:'🦠',  label:'Sepsis & Choc septique',              sub:'qSOFA · Bundle 1h',                            urgent:true },
  { id:'cho',   icon:'🩸',  label:'États de choc',                       sub:'Hypovolémique · Cardiogénique · Distributif',  urgent:true },
  { id:'det',   icon:'🫁',  label:'Détresse respiratoire',               sub:'SDRA · OAP · Bronchospasme',                   urgent:true },
  { id:'oap',   icon:'💧',  label:'OAP — Œdème Aigu du Poumon',          sub:'LMNOP · Furosémide · VNI',                     urgent:true },
  { id:'hk',    icon:'⚡',  label:'Hyperkaliémie',                       sub:'ECG · Calcium · Insuline-Glucose',             urgent:true },
  { id:'intox', icon:'☠️',  label:'Intoxications — Antidotes',           sub:'Naloxone · Flumazénil · NAC…',                 urgent:true },
  { id:'hyp',   icon:'💊',  label:'Hypoglycémie sévère',                 sub:'Resucrage · Glucagon · G30%',                  urgent:false },
  { id:'epi',   icon:'⚡',  label:'Crise convulsive / Épilepsie',        sub:'Diazépam · Clonazépam',                        urgent:false },
];

const MAP = {
  rcp:<RCP/>, avc:<AVC/>, ana:<Anaphylaxie/>, sep:<Sepsis/>,
  cho:<ChocEtats/>, det:<DetressResp/>, hyp:<Hypoglycemie/>,
  epi:<Convulsions/>, oap:<OAP/>, hk:<Hyperkaliemie/>, intox:<Intoxication/>,
};

export default function Urgences({ onBack, initialTool = null, onFavChange, onBackOverride }) {
  const C = T.urg;

  return (
    <ModuleShell
      onBackOverride={onBackOverride}
      onBack={onBack}
      color={C}
      dimBg={() => T.urgDim}
      icon="🚨"
      title="Urgences"
      subtitle="⚠️ En cas d'urgence réelle, appeler le médecin et le 15/18 en priorité."
      items={PROTOS}
      initialTool={initialTool}
      onFavChange={onFavChange}
      renderItem={(p, openTool) => (
        <div
          style={{
            ...s.card,
            display:'flex', alignItems:'center', gap:14,
            borderColor: p.urgent ? C+'44' : T.border,
            cursor:'pointer',
          }}
          onClick={() => openTool(p.id)}
        >
          <span style={{ fontSize:26 }}>{p.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color: p.urgent ? C : T.text, fontWeight:700, fontSize:14, marginBottom:2 }}>{p.label}</div>
            <div style={{ color:T.muted, fontSize:12 }}>{p.sub}</div>
          </div>
          {p.urgent && (
            <span style={{ background:C+'22', color:C, fontSize:9, fontFamily:'monospace', padding:'2px 7px', borderRadius:10, flexShrink:0 }}>
              URGENT
            </span>
          )}
          <StarButton mod={MOD} toolId={p.id} label={p.label} icon={p.icon} color={C} onFavChange={onFavChange} />
          <span style={{ color:T.muted }}>›</span>
        </div>
      )}
      renderDetail={(toolId) => MAP[toolId] || null}
    />
  );
}
