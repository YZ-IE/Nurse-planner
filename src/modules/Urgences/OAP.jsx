import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, tk } from '../../theme.js';
import { Card, Banner } from '../../ui/index.js';
const C = T.urg;
export default function OAP() {
  return (
    <div style={{ padding: '14px' }}>
      <MedicalDisclaimer level="standard" />
      <Banner kind="danger" icon="🫁" title="OAP — Œdème Aigu du Poumon">
        Appeler le médecin immédiatement · Urgence vitale
      </Banner>

      {[
        { titre: '1. Signes cliniques', couleur: T.danger, items: ['Dyspnée intense, orthopnée, polypnée > 30/min', 'SpO₂ < 90% malgré O₂', 'Crépitants bilatéraux "en marée montante"', 'Expectoration mousseuse rosée (signe de gravité)', 'Sueurs, cyanose, agitation', 'Turgescence jugulaire, œdèmes des membres inférieurs'] },
        { titre: '2. Actions immédiates — LMNOP', couleur: C, items: [
          'L — Lasix (Furosémide) 40-80 mg IV selon prescription',
          'M — Morphine 2-4 mg IV titration (réduction anxiété et précharge)',
          'N — Nitrés (Trinitrine) sublingual ou IV si PA ≥ 100 mmHg',
          'O — Oxygène : débuter au masque haute concentration · Objectif SpO₂ ≥ 94%',
          'P — Position demi-assise / jambes pendantes (↓ retour veineux)',
          '+ VNI (CPAP) si SpO₂ < 90% malgré O₂',
        ]},
        { titre: '3. Monitoring', couleur: T.success, items: ['Scope continu (FC, PA, SpO₂)', 'ECG 12 dérivations (recherche SCA déclenchant)', 'Diurèse horaire (sondage si rétention)', 'FR toutes les 15 min', 'Gaz du sang artériels si aggravation', 'Bilan biologique : BNP, troponine, NFS, ionogramme'] },
        { titre: '4. Facteurs déclenchants à rechercher', couleur: '#8b5cf6', items: ['SCA (cause la plus fréquente)', 'Poussée HTA', 'Arythmie (FA rapide)', 'Infection / sepsis', 'Écart de régime (sel) ou arrêt traitement', 'Insuffisance rénale aiguë'] },
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
