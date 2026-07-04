import { T, tk } from '../../theme.js';
import ModuleShell    from '../shared/ModuleShell.jsx';
import StarButton     from '../shared/StarButton.jsx';
import { Card }       from '../../ui/index.js';

import SBAR            from './SBAR.jsx';
import Transmissions   from './Transmissions.jsx';
import PlanningJournee from './PlanningJournee.jsx';
import NormesBio       from './NormesBio.jsx';
import ChecklistMedoc  from './ChecklistMedoc.jsx';

const MOD = 'orga';

const OUTILS = [
  { id:'planning',      icon:'📅', label:'Planning de la journée',        sub:'Tâches horodatées · Catégories · Priorités · Progression' },
  { id:'sbar',          icon:'📢', label:'SBAR — Transmission structurée', sub:'Communication urgente avec le médecin · Relèves · Transferts' },
  { id:'transmissions', icon:'📝', label:'Transmissions ciblées (DLA)',    sub:'Donnée → Lien → Action · Historique 24h' },
  { id:'normes',        icon:'🔬', label:'Normes biologiques',             sub:'Hémato · Biochimie · GDS · Enzymes · Alertes' },
  { id:'medoc',         icon:'💊', label:'Checklist 5B — Médicaments',     sub:'Bon médicament · Bonne dose · Bonne voie · Bon patient · Bon moment' },
];

const MAP = {
  planning:<PlanningJournee/>, sbar:<SBAR/>,
  transmissions:<Transmissions/>, normes:<NormesBio/>,
  medoc:<ChecklistMedoc/>,
};

export default function Organisation({ onBack, initialTool = null, onFavChange, onBackOverride }) {
  const C = T.orga;

  return (
    <ModuleShell
      onBackOverride={onBackOverride}
      onBack={onBack}
      color={C}
      dimBg={() => T.orgaDim}
      icon="📋"
      title="Organisation"
      subtitle="📋 Outils de coordination · Planning, transmissions, normes et sécurité médicamenteuse."
      items={OUTILS}
      initialTool={initialTool}
      onFavChange={onFavChange}
      renderItem={(o, openTool) => (
        <Card onClick={() => openTool(o.id)} style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:28 }}>{o.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:T.text, fontWeight:tk.weight.bold, fontSize:tk.font.base, marginBottom:2 }}>{o.label}</div>
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
