import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Btn, Card, Banner } from '../../ui/index.js';
const C = T.soins;

const PHASES = [
  {
    id: 'sign_in',
    label: 'SIGN IN',
    subtitle: 'Avant induction anesthésique',
    color: T.success,
    icon: '🟢',
    items: [
      { id: 'identite', label: 'Identité patient confirmée (bracelet + verbal)' },
      { id: 'site', label: 'Site opératoire confirmé et marqué' },
      { id: 'consentement', label: 'Consentement signé vérifié' },
      { id: 'allergie', label: 'Allergies vérifiées (médicaments, latex, iode)' },
      { id: 'voie_aerienne', label: 'Risque voie aérienne difficile évalué' },
      { id: 'sang', label: 'Risque hémorragique > 500 mL évalué' },
      { id: 'asa', label: 'Score ASA renseigné' },
      { id: 'antibio', label: 'Antibioprophylaxie administrée si indiquée (< 60 min)' },
      { id: 'materiel', label: 'Matériel d\'anesthésie vérifié' },
      { id: 'monitorage', label: 'Monitorage en place (SpO₂, PA, ECG)' },
    ],
  },
  {
    id: 'time_out',
    label: 'TIME OUT',
    subtitle: 'Avant incision cutanée',
    color: T.warning,
    icon: '🟡',
    items: [
      { id: 'equipe', label: 'Toute l\'équipe s\'est présentée (nom + rôle)' },
      { id: 'patient_site', label: 'Patient, site et procédure confirmés à voix haute' },
      { id: 'antibio2', label: 'Antibioprophylaxie < 60 min confirmée' },
      { id: 'images', label: 'Imagerie pertinente affichée' },
      { id: 'incidents', label: 'Incidents critiques anticipés (chirurgien + anesthésiste)' },
      { id: 'instruments', label: 'Stérilité des instruments confirmée' },
      { id: 'peau', label: 'Préparation cutanée effectuée (antisepsie)' },
    ],
  },
  {
    id: 'sign_out',
    label: 'SIGN OUT',
    subtitle: 'Avant que le patient quitte le bloc',
    color: T.danger,
    icon: '🔴',
    items: [
      { id: 'acte', label: 'Acte réalisé confirmé et consigné' },
      { id: 'compte', label: 'Compresses, instruments, aiguilles — compte correct' },
      { id: 'pieces', label: 'Pièces anatomiques étiquetées et transmises' },
      { id: 'dysfonct', label: 'Dysfonctionnements matériels à signaler ?' },
      { id: 'sspi', label: 'Informations clés pour SSPI transmises (chirurgien → IADE)' },
      { id: 'douleur', label: 'Analgésie postop prescrite' },
      { id: 'suivi', label: 'Consignes postopératoires et surveillance notées' },
    ],
  },
];

const STORAGE_KEY = 'checklist_preop_v1';

function loadChecked() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveChecked(v) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
}

export default function ChecklistPreOp() {
  const [checked, setChecked] = useState(loadChecked);
  const [phase, setPhase] = useState('sign_in');

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecked(next);
  };

  const reset = () => { setChecked({}); saveChecked({}); };

  const phaseData = PHASES.find(p => p.id === phase);
  const phaseDone = (p) => p.items.every(it => checked[it.id]);
  const totalDone = PHASES.flatMap(p => p.items).filter(it => checked[it.id]).length;
  const totalItems = PHASES.flatMap(p => p.items).length;

  return (
    <div style={{ padding: '14px' }}>
      <Card dim={C + '11'} style={{ border: `1px solid ${C}33` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: tk.font.sm }}>✅ Checklist Sécurité Bloc Opératoire — OMS</div>
        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 4 }}>Surgical Safety Checklist · {totalDone}/{totalItems} items cochés</div>
        <div style={{ background: T.bg, borderRadius: 20, height: 6, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ background: C, height: '100%', width: `${(totalDone / totalItems) * 100}%`, borderRadius: 20, transition: 'width 0.3s' }} />
        </div>
      </Card>

      {/* Tabs phases */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            style={{ flex: 1, minHeight: 56, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${phase === p.id ? p.color : T.border}`, background: phase === p.id ? p.color + '22' : T.surface, cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ fontSize: 14 }}>{p.icon}</div>
            <div style={{ color: phase === p.id ? p.color : T.muted, fontSize: tk.font.xs, fontWeight: 700 }}>{p.label}</div>
            <div style={{ color: phaseDone(p) ? T.success : T.muted, fontSize: tk.font.xs, marginTop: 1 }}>
              {p.items.filter(it => checked[it.id]).length}/{p.items.length}
            </div>
          </button>
        ))}
      </div>

      {/* Sous-titre */}
      <div style={{ background: phaseData.color + '18', border: `1px solid ${phaseData.color}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ color: phaseData.color, fontWeight: 700, fontSize: tk.font.sm }}>{phaseData.icon} {phaseData.label}</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm, marginTop: 2 }}>{phaseData.subtitle}</div>
      </div>

      {/* Items */}
      {phaseData.items.map(item => (
        <button key={item.id} onClick={() => toggle(item.id)}
          style={{ width: '100%', minHeight: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: checked[item.id] ? T.successDim : T.surface, border: `1.5px solid ${checked[item.id] ? T.success : T.border}`, borderRadius: tk.radius.lg, padding: '12px 14px', marginBottom: 8, textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${checked[item.id] ? T.success : T.border2}`, background: checked[item.id] ? T.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, color: '#fff', fontWeight: 800 }}>
            {checked[item.id] ? '✓' : ''}
          </div>
          <span style={{ color: checked[item.id] ? T.success : T.text, fontSize: tk.font.sm, lineHeight: 1.4 }}>{item.label}</span>
        </button>
      ))}

      {phaseDone(phaseData) && (
        <Banner kind="success" icon="✅" title={`${phaseData.label} — Complété`} />
      )}

      <Btn color={T.muted} variant="outline" size="lg" full onClick={reset} style={{ marginTop: 14 }}>
        🔄 Réinitialiser la checklist
      </Btn>
    </div>
  );
}
