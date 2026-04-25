import { useState } from 'react';
import { T, s } from '../../theme.js';
const C = T.soins || '#06b6d4';

const SECTIONS = [
  {
    id: 'midline',
    label: 'MIDLINE',
    icon: '🩸',
    color: '#22c55e',
    def: 'Cathéter veineux périphérique long (8–25 cm). Introduit dans une veine du bras (basilique, céphalique, brachiale) — extrémité distale restant EN DESSOUS de l\'aisselle (creux axillaire).',
    duree: '≤ 4 semaines (29j max)',
    indic: [
      'Traitements IV ≤ 1 mois',
      'Antibiotiques NON vésicants',
      'Hydratation, nutrition parentérale partielle',
      'Alternative à la VVP pour capital veineux limité',
    ],
    ci: [
      'pH < 5 ou > 9',
      'Osmolarité > 600 mOsm/L (nutrition parentérale totale → Picc)',
      'Chimiothérapie vésicante',
      'Durée > 4 semaines',
    ],
    pose: [
      'Vérification prescription + consentement patient',
      'Matériel stérile : kit midline, écho-guidage recommandé',
      'Désinfection + champ stérile',
      'Ponction veineuse écho-guidée (basilique +++)',
      'Introduction cathéter — longueur définie pré-insertion',
      'Radiographie NON obligatoire pour le midline (extrémité veineuse périphérique)',
      'Pansement transparent stérile + fixateur cathéter',
      'Traçabilité dans dossier patient (date, calibre, bras, longueur)',
    ],
    surveillance: [
      { item: 'Point de ponction', signe: 'Rougeur, œdème, douleur → thrombophlébite' },
      { item: 'Perméabilité', signe: 'Reflux sanguin avant chaque utilisation' },
      { item: 'Pansement', signe: 'Renouvellement tous les 7 jours ou si décollé/souillé' },
      { item: 'Longueur externalisée', signe: 'Vérifier à chaque soin — noter dans dossier' },
      { item: 'Signes infection', signe: 'Fièvre inexpliquée, frissons → bilan infectieux' },
    ],
    entretien: [
      'Rinçage sérum phy 10 mL avant et après chaque utilisation (push-pause)',
      'Héparine 100 UI/mL si protocole institutionnel',
      'Clampages selon protocole',
      'Changement bouchon Luer-lock stérile à chaque déconnexion',
    ],
    bgColor: T.orgaDim,
  },
  {
    id: 'piccline',
    label: 'PICCLINE (PICC)',
    icon: '💉',
    color: C,
    def: 'Peripherally Inserted Central Catheter. Cathéter central inséré dans une veine du bras (basilique ++) dont l\'extrémité distale remonte jusqu\'en veine cave supérieure (jonction VCS-OD).',
    duree: 'Jusqu\'à 1 an (6 mois en pratique courante)',
    indic: [
      'Chimiothérapies (IV compatibles + vésicantes selon validation)',
      'Nutrition parentérale totale (osmolarité élevée)',
      'Traitements IV prolongés > 4 semaines',
      'Antibiotiques longue durée',
      'pH extrêmes, médicaments veineux agressifs',
      'Prélèvements sanguins répétés',
    ],
    ci: [
      'Infection du site de ponction prévu',
      'Thrombose veineuse du membre concerné',
      'Mastectomie ipsilatérale avec curage ganglionnaire',
      'Insuffisance rénale stade 4-5 (préservation du capital veineux pour la fistule)',
    ],
    pose: [
      'Prescription médicale obligatoire',
      'Mesure du bras (brachio-radiale) pour calibrer la longueur',
      'Désinfection large + champ stérile grand format',
      'Écho-guidage systématique (veine basilique +++)',
      'Introducteur + insert/guide → mise en place cathéter',
      'Radiographie thoracique OBLIGATOIRE — vérification position (jonction VCS-OD)',
      'Validation médicale de la RX avant première utilisation',
      'Pansement transparent stérile + fixateur sans suture (StatLock)',
      'Traçabilité complète : date, site, calibre, longueur, lot',
    ],
    surveillance: [
      { item: 'Position', signe: 'RX thoracique si doute (migration)' },
      { item: 'Bras', signe: 'Œdème bras/cou → suspicion thrombose → écho-doppler' },
      { item: 'Point de ponction', signe: 'Rougeur, écoulement, induration' },
      { item: 'Pansement', signe: 'Tous les 7 jours + si souillé/décollé' },
      { item: 'Longueur externalisée', signe: 'Notée à chaque changement — alerte si variation ≥ 2 cm' },
      { item: 'Perméabilité', signe: 'Reflux AVANT toute utilisation (si absent : ne pas forcer)' },
    ],
    entretien: [
      'Rinçage 10–20 mL NaCl 0,9% (push-pause) avant et après chaque utilisation',
      'Verrou hépariné selon protocole service (100–500 UI/mL)',
      'Changement prolongateur et bouchon hebdomadaire',
      'Ne jamais forcer si résistance — risque d\'embolie cathéter',
      'Clamp fermé lors des déconnexions',
    ],
    bgColor: T.surface2,
  },
];

const COMPARATIF = [
  { crit: 'Position extrémité', midline: 'Veine périphérique (sous aisselle)', picc: 'Veine cave supérieure (central)' },
  { crit: 'Durée max', midline: '≤ 4 semaines', picc: 'Jusqu\'à 1 an' },
  { crit: 'Radio thorax', midline: 'Non obligatoire', picc: 'OBLIGATOIRE avant 1ère utilisation' },
  { crit: 'Osmolarité max', midline: '≤ 600 mOsm/L', picc: 'Illimitée' },
  { crit: 'Chimio vésicante', midline: '❌ Contre-indiqué', picc: '✅ Possible (selon validation)' },
  { crit: 'Nutrition parent. totale', midline: '⚠️ Partielle seulement', picc: '✅ Totale' },
  { crit: 'Prélèvements', midline: '⚠️ Avec précaution', picc: '✅ Possible voie dédiée' },
];

export default function PiccMidline() {
  const [active, setActive] = useState('midline');
  const [sectionOpen, setSectionOpen] = useState('def');

  const data = SECTIONS.find(s => s.id === active);

  const sections = [
    { id: 'def',         label: 'Définition & Durée' },
    { id: 'indic',       label: 'Indications' },
    { id: 'ci',          label: 'Contre-indications' },
    { id: 'pose',        label: 'Pose — étapes IDE' },
    { id: 'surveillance',label: 'Surveillance' },
    { id: 'entretien',   label: 'Entretien' },
  ];

  return (
    <div style={{ padding: '14px' }}>
      {/* Choix Midline / PICC */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} onClick={() => { setActive(sec.id); setSectionOpen('def'); }}
            style={{ ...s.btn(active === sec.id ? sec.color : T.border), flex: 1, padding: '12px 8px', fontSize: 13 }}>
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>

      {/* Badge résumé */}
      <div style={{ ...s.card, background: data.bgColor, borderLeft: `4px solid ${data.color}`, marginBottom: 12 }}>
        <div style={{ color: data.color, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{data.icon} {data.label}</div>
        <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{data.def}</div>
        <div style={{ background: data.color + '22', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>
          <span style={{ color: data.color, fontFamily: 'monospace', fontSize: 12 }}>🕐 Durée : {data.duree}</span>
        </div>
      </div>

      {/* Navigation sous-sections */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
        {sections.map(sec => (
          <button key={sec.id} onClick={() => setSectionOpen(sectionOpen === sec.id ? null : sec.id)}
            style={{ ...s.btn(sectionOpen === sec.id ? data.color : T.border), padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {sec.label}
          </button>
        ))}
      </div>

      {/* Contenu sections */}
      {sectionOpen === 'indic' && (
        <div style={{ ...s.card, borderLeft: `3px solid ${data.color}` }}>
          <div style={{ color: data.color, fontWeight: 700, marginBottom: 8 }}>✅ Indications</div>
          {data.indic.map((i, idx) => (
            <div key={idx} style={{ color: T.text, fontSize: 13, padding: '4px 0', borderBottom: idx < data.indic.length-1 ? `1px solid #1e293b` : 'none' }}>
              • {i}
            </div>
          ))}
        </div>
      )}

      {sectionOpen === 'ci' && (
        <div style={{ ...s.card, background: T.urgDim, borderLeft: '3px solid #ef4444' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>❌ Contre-indications</div>
          {data.ci.map((c, idx) => (
            <div key={idx} style={{ color: T.text, fontSize: 13, padding: '4px 0', borderBottom: idx < data.ci.length-1 ? `1px solid #2d1a1a` : 'none' }}>
              ⚠️ {c}
            </div>
          ))}
        </div>
      )}

      {sectionOpen === 'pose' && (
        <div style={{ ...s.card, borderLeft: `3px solid ${data.color}` }}>
          <div style={{ color: data.color, fontWeight: 700, marginBottom: 8 }}>🔧 Étapes de pose (IDE)</div>
          {data.pose.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: idx < data.pose.length-1 ? '1px solid #1e293b' : 'none' }}>
              <span style={{ color: data.color, fontFamily: 'monospace', fontSize: 11, minWidth: 22 }}>{idx + 1}.</span>
              <span style={{ color: T.text, fontSize: 13, lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
      )}

      {sectionOpen === 'surveillance' && (
        <div style={{ ...s.card, borderLeft: `3px solid #f59e0b` }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>👁️ Surveillance IDE</div>
          {data.surveillance.map((sv, idx) => (
            <div key={idx} style={{ padding: '6px 0', borderBottom: idx < data.surveillance.length-1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 12 }}>{sv.item}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>→ {sv.signe}</div>
            </div>
          ))}
        </div>
      )}

      {sectionOpen === 'entretien' && (
        <div style={{ ...s.card, borderLeft: `3px solid ${data.color}` }}>
          <div style={{ color: data.color, fontWeight: 700, marginBottom: 8 }}>🔄 Entretien & Rinçage</div>
          {data.entretien.map((e, idx) => (
            <div key={idx} style={{ color: T.text, fontSize: 13, padding: '4px 0', borderBottom: idx < data.entretien.length-1 ? '1px solid #1e293b' : 'none' }}>
              • {e}
            </div>
          ))}
        </div>
      )}

      {/* Tableau comparatif */}
      <div style={{ ...s.card, marginTop: 10 }}>
        <div style={{ color: C, fontWeight: 700, marginBottom: 10 }}>⚖️ Midline vs PICC — Comparatif</div>
        {COMPARATIF.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '6px 0', borderBottom: i < COMPARATIF.length-1 ? '1px solid #1e293b' : 'none' }}>
            <div style={{ color: T.muted, fontSize: 10, fontFamily: 'monospace' }}>{row.crit}</div>
            <div style={{ color: '#22c55e', fontSize: 11 }}>{row.midline}</div>
            <div style={{ color: C, fontSize: 11 }}>{row.picc}</div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
          <div />
          <div style={{ color: '#22c55e', fontSize: 10, fontFamily: 'monospace' }}>MIDLINE</div>
          <div style={{ color: C, fontSize: 10, fontFamily: 'monospace' }}>PICC</div>
        </div>
      </div>
    </div>
  );
}
