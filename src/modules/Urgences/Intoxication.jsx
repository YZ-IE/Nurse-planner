import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Btn, Card, Input, Banner } from '../../ui/index.js';
const C = T.urg;

const ANTIDOTES = [
  { toxique: 'Opioïdes (Morphine, Codéine, Fentanyl)', antidote: 'Naloxone (Narcan)', dose: '0,4-2 mg IV/IM/SC · Répéter toutes les 2-3 min si nécessaire · Perfusion continue possible', signes: 'Myosis bilatéral, bradypnée, somnolence, coma' },
  { toxique: 'Benzodiazépines', antidote: 'Flumazénil (Anexate)', dose: '0,2 mg IV lent · Répéter 0,1 mg/min jusqu\'à réponse · Max 1 mg', signes: 'Sédation, amnésie, dépression respiratoire modérée · ⚠️ Attention convulsions au réveil' },
  { toxique: 'Paracétamol', antidote: 'N-Acétylcystéine (Fluimucil)', dose: 'Perfusion IV selon protocole poids/heure · Efficace si < 10h post-ingestion', signes: 'Phase 1 (0-24h) : nausées · Phase 2-3 : cytolyse hépatique · Dosage paracétamolémie obligatoire' },
  { toxique: 'Anticoagulants AVK (Warfarine)', antidote: 'Vitamine K + PPSB si hémorragie', dose: 'Vitamine K 10 mg IV lent (délai 6-24h) · PPSB si urgence hémorragique', signes: 'INR élevé · Saignements' },
  { toxique: 'Héparine', antidote: 'Sulfate de protamine', dose: '1 mg pour 100 UI HNF · IV lente en 10 min · Max 50 mg', signes: 'TCA allongé · Saignements' },
  { toxique: 'Organophosphorés / Carbamates (pesticides)', antidote: 'Atropine + Pralidoxime', dose: 'Atropine 2-4 mg IV toutes les 5-10 min · Pralidoxime 1-2 g IV si < 6h', signes: 'SLUDGE : Salivation, Larmoiement, Urination, Diarrhée, crampes Gastro, Emesis · Bradycardie, myosis, bronchospasme' },
  { toxique: 'Bêta-bloquants', antidote: 'Glucagon + Insuline-Glucose (HDI)', dose: 'Glucagon 5-10 mg IV puis 1-5 mg/h · HDI : insuline 1 UI/kg + G10%', signes: 'Bradycardie, hypotension, BAV, bronchospasme' },
  { toxique: 'Digitaliques (Digoxine)', antidote: 'Anticorps anti-digitale (Digidot)', dose: '1 flacon pour 0,5 mg digoxine ingérée (calcul selon digoxinémie)', signes: 'BAV, bradycardie, troubles du rythme, nausées, troubles visuels (halos colorés)' },
  { toxique: 'Cyanures / Fumées incendie', antidote: 'Hydroxocobalamine (Cyanokit)', dose: '5 g IV en 15 min · Peut être répété', signes: 'Céphalées, dyspnée, coma, acidose lactique sévère · Coloration rouge des urines après antidote' },
  { toxique: 'Méthanol / Éthylène glycol', antidote: 'Éthanol ou Fomépizole', dose: 'Fomépizole 15 mg/kg IV puis 10 mg/kg/12h · Dialyse si sévère', signes: 'Acidose métabolique, troubles visuels (méthanol), insuffisance rénale (éthylène glycol)' },
  { toxique: 'Insuline / Hypoglycémiants', antidote: 'Glucose IV + Glucagon', dose: 'G30% 50 ml IVD · Glucagon 1 mg IM/SC si voie veineuse impossible', signes: 'Glycémie < 0,6 g/L · Sueurs, tremblements, convulsions, coma' },
];

export default function Intoxication() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = ANTIDOTES.filter(a =>
    a.toxique.toLowerCase().includes(search.toLowerCase()) ||
    a.antidote.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) return (
    <div style={{ padding: '14px' }}>
      <MedicalDisclaimer level="standard" />
      <Btn color={C} onClick={() => setSelected(null)} style={{ marginBottom: 14 }}>← Retour</Btn>
      <Card dim={C + '14'} style={{ border: `1px solid ${C}44` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: tk.font.base }}>{selected.toxique}</div>
        <div style={{ color: T.success, fontWeight: 700, fontSize: tk.font.sm, marginTop: 4 }}>Antidote : {selected.antidote}</div>
      </Card>
      {[
        { label: '💊 Posologie antidote', val: selected.dose, color: T.success },
        { label: '🔍 Signes cliniques / orientation', val: selected.signes, color: T.warning },
      ].map(({ label, val, color }) => (
        <Card key={label} accent={color}>
          <div style={{ color, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 8 }}>{label}</div>
          <div style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.6 }}>{val}</div>
        </Card>
      ))}
      <Banner kind="warning" icon="⚠️" title="TOUJOURS">
        {['Appeler le 15 (SAMU) ou le centre antipoison (0 800 59 59 59)', 'Voie veineuse + scope + ECG', 'Recueillir emballages / flacons du toxique', 'Heure d\'ingestion + quantité estimée', 'Éviter le vomissement provoqué (contre-indiqué)', 'Charbon activé si < 1h et patient conscient (selon prescription)'].map((item, i) => (
          <div key={i} style={{ marginTop: i > 0 ? 3 : 6 }}>• {item}</div>
        ))}
      </Banner>
    </div>
  );

  return (
    <div style={{ padding: '14px' }}>
      <Card dim={C + '14'} style={{ border: `1px solid ${C}44` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: tk.font.base }}>☠️ Intoxications — Antidotes</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm, marginTop: 4 }}>Centre antipoison : 0 800 59 59 59 (gratuit)</div>
      </Card>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un toxique ou antidote…" style={{ marginBottom: 12 }} />
      {filtered.map((a, i) => (
        <Card key={i} onClick={() => setSelected(a)}>
          <div style={{ color: C, fontWeight: 700, fontSize: tk.font.sm, marginBottom: 4 }}>{a.toxique}</div>
          <div style={{ color: T.success, fontSize: tk.font.sm }}>→ {a.antidote}</div>
        </Card>
      ))}
    </div>
  );
}
