import { T, tk } from '../../theme.js';
import ModuleShell   from '../shared/ModuleShell.jsx';
import StarButton     from '../shared/StarButton.jsx';
import { Card, Chip } from '../../ui/index.js';

import Pansements     from './Pansements.jsx';
import PiccMidline    from './PiccMidline.jsx';
import PAC            from './PAC.jsx';
import KTA            from './KTA.jsx';
import Dialyse        from './Dialyse.jsx';
import Timers         from './Timers.jsx';
import ChecklistPreOp from './ChecklistPreOp.jsx';

const MOD = 'soins';

const SOINS_LIST = [
  { id:'timers',      icon:'⏱',  label:'Timers de soins',           sub:'Antiseptiques · Perfusions · Chronomètres simultanés', badge:'NOUVEAU' },
  { id:'checklistop', icon:'✅', label:'Checklist bloc opératoire', sub:'OMS Sign In · Time Out · Sign Out',                    badge:'NOUVEAU' },
  { id:'pansements',  icon:'🩹', label:'Pansements',                sub:'Tableau décisionnel par stade · Types · Règles cliniques' },
  { id:'piccmidline', icon:'🩸', label:'Piccline / Midline',        sub:'Indications · Pose · Entretien · Surveillance · Comparatif' },
  { id:'pac',         icon:'🔵', label:'PAC — Chambre implantable', sub:'Ponction · Déponction · Aiguille Huber · Complications' },
  { id:'kta',         icon:'🔴', label:'KTA — Cathéter artériel',   sub:"PAI · Prélèvements GDS · Sécurité · Test d'Allen" },
  { id:'dialyse',     icon:'🫀', label:'Dialyse',                   sub:'HD · DP · EERC — Principes · Accès vasculaires · Surveillance' },
];

const MAP = {
  timers:<Timers/>, checklistop:<ChecklistPreOp/>,
  pansements:<Pansements/>, piccmidline:<PiccMidline/>,
  pac:<PAC/>, kta:<KTA/>, dialyse:<Dialyse/>,
};

export default function Soins({ onBack, initialTool = null, onFavChange, onBackOverride }) {
  const C = T.soins;

  return (
    <ModuleShell
      onBackOverride={onBackOverride}
      onBack={onBack}
      color={C}
      dimBg={() => T.soinsDim}
      icon="💉"
      title="Soins"
      subtitle="💡 Protocoles et outils pour les soins infirmiers spécialisés."
      items={SOINS_LIST}
      initialTool={initialTool}
      onFavChange={onFavChange}
      renderItem={(o, openTool) => (
        <Card onClick={() => openTool(o.id)} style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:28 }}>{o.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:T.text, fontWeight:700, fontSize:tk.font.base, marginBottom:2, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {o.label}
              {o.badge && (
                <Chip color={C} active style={{ height:24, padding:'0 8px', fontSize:tk.font.xs }}>{o.badge}</Chip>
              )}
            </div>
            <div style={{ color:T.muted, fontSize:tk.font.xs, lineHeight:1.5 }}>{o.sub}</div>
          </div>
          <StarButton mod={MOD} toolId={o.id} label={o.label} icon={o.icon} color={C} onFavChange={onFavChange} />
          <span style={{ color:T.muted, fontSize:20 }}>›</span>
        </Card>
      )}
      renderDetail={(toolId) => MAP[toolId] || null}
    />
  );
}
