import { T } from '../../theme.js';
import ModuleShell        from '../shared/ModuleShell.jsx';
import StarButton         from '../shared/StarButton.jsx';

import Quiz               from './Quiz.jsx';
import CasCliniques       from './CasCliniques.jsx';
import Lexique            from './Lexique.jsx';
import DoseCalcEntrainement from './DoseCalcEntrainement.jsx';

const MOD = 'form';

const TOOLS = [
  { id:'quiz',    icon:'🎯', label:'Quiz clinique',  desc:'QCM · 5 thèmes · Score · Explications' },
  { id:'cas',     icon:'📖', label:'Cas cliniques',  desc:'Situations réelles · Raisonnement IDE' },
  { id:'dose',    icon:'💉', label:'Calcul de dose', desc:'Entraînement · 3 niveaux de difficulté' },
  { id:'lexique', icon:'📚', label:'Lexique médical',desc:'Abréviations · Définitions' },
];

const MAP = {
  quiz:<Quiz/>, cas:<CasCliniques/>,
  dose:<DoseCalcEntrainement/>, lexique:<Lexique/>,
};

export default function Formation({ onBack, initialTool = null, onFavChange, onBackOverride }) {
  const C = T.form;

  return (
    <ModuleShell
      onBackOverride={onBackOverride}
      onBack={onBack}
      color={C}
      dimBg={() => T.formDim}
      icon="🎓"
      title="Formation"
      subtitle="🎓 Quiz, cas cliniques et lexique pour consolider vos connaissances IDE."
      items={TOOLS}
      initialTool={initialTool}
      onFavChange={onFavChange}
      renderItem={(t, openTool) => (
        <div
          style={{
            background: T.surface,
            border: `1px solid ${C}33`,
            borderRadius: 16,
            padding: '16px 14px',
            marginBottom: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
          onClick={() => openTool(t.id)}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: C + '18',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {t.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:C, fontWeight:700, fontSize:14, marginBottom:3 }}>{t.label}</div>
            <div style={{ color:T.muted, fontSize:12 }}>{t.desc}</div>
          </div>
          <StarButton mod={MOD} toolId={t.id} label={t.label} icon={t.icon} color={C} onFavChange={onFavChange} />
          <span style={{ color:T.muted }}>›</span>
        </div>
      )}
      renderDetail={(toolId) => MAP[toolId] || null}
    />
  );
}
