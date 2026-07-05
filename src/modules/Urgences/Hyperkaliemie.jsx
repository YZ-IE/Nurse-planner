import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card, Banner } from '../../ui/index.js';
const C = T.urg;
export default function Hyperkaliemie() {
  return (
    <div style={{ padding: '14px' }}>
      <MedicalDisclaimer level="standard" />
      <Banner kind="danger" icon="⚡" title="Hyperkaliémie — Urgence vitale si K⁺ > 6,5 mmol/L">
        Appeler le médecin immédiatement · Scope · ECG en urgence
      </Banner>

      {[
        { titre: '1. ECG — Signes de gravité', couleur: T.danger, items: ['Ondes T amples et pointues (premier signe)', 'Élargissement QRS > 120 ms', 'Onde P aplanie ou absente', 'Sinusoïde → Fibrillation ventriculaire', '⚠️ Tout ECG anormal = URGENCE VITALE'] },
        { titre: '2. Traitement — Par ordre de priorité', couleur: C, items: [
          'Gluconate de calcium 10% — 10 ml IV lent 2-3 min (protection cardiaque immédiate)',
          'Bicarbonate de sodium 8,4% — 50 ml IV si acidose',
          'Insuline-Glucose : 10 UI insuline rapide + G30% 125 ml IV (transfert K⁺ intracellulaire)',
          'Salbutamol 10-20 mg nébulisation (transfert K⁺)',
          'Kayexalate (résine échangeuse) ou dialyse si insuffisance rénale',
          'Furosémide IV si diurèse conservée',
        ]},
        { titre: '3. Causes à rechercher', couleur: '#8b5cf6', items: ['Insuffisance rénale aiguë ou chronique', 'IEC / ARA2 / Spironolactone', 'AINS', 'Apports en potassium excessifs (nutrition, KCl)', 'Lyse cellulaire (hémolyse, rhabdomyolyse)', 'Insuffisance surrénalienne'] },
        { titre: '4. Surveillance', couleur: T.success, items: ['Scope continu', 'Kaliémie de contrôle 1-2h après traitement', 'Diurèse horaire', 'ECG de contrôle', 'Glycémie si insuline administrée'] },
      ].map(({ titre, couleur, items }) => (
        <Card key={titre} accent={couleur}>
          <div style={{ color: couleur, fontWeight: 700, fontSize: tk.font.sm, marginBottom: 10 }}>{titre}</div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
              <span style={{ color: couleur, flexShrink: 0 }}>›</span>
              <span style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
