import { useState } from 'react';
import { T, s } from '../../theme.js';
const C = T.soins || '#06b6d4';

const TYPES = [
  {
    id: 'hd',
    label: 'Hémodialyse (HD)',
    icon: '🔵',
    color: '#3b82f6',
    abrev: 'HD',
    def: 'Épuration du sang par diffusion à travers une membrane semi-perméable (dialyseur). Le sang circule hors du corps (circuit extracorporel) en contact avec le dialysat.',
    principes: [
      { p: 'Diffusion', d: 'Gradient de concentration entre sang et dialysat → passage des toxines (urée, créatinine, K⁺...)' },
      { p: 'Ultrafiltration', d: 'Pression transmembranaire → élimination de l\'eau en excès (correction surcharge hydrique)' },
      { p: 'Convection', d: 'Passage de solutés avec le flux liquidien (hémofiltration associée dans l\'hémodiafiltration)' },
    ],
    acces: ['FAV (Fistule Artério-Veineuse) — accès de référence longue durée', 'Prothèse vasculaire (PTFE)', 'KCC (Cathéter Central de Dialyse) — temporaire ou tunnelisé (Tesio, Permcath)'],
    seance: '3 séances / semaine · Durée : 4h en général · En centre ou hors centre',
    surveillance: [
      'Poids sec (objectif de poids sans surcharge)',
      'PA avant, pendant, après (hypotension fréquente)',
      'Perméabilité de la FAV (thrill/souffle à palper)',
      'Signes hémorragiques (anticoagulation)',
      'Malaise, crampes, nausées (syndrome de déséquilibre)',
    ],
    bgColor: T.soinsDim,
  },
  {
    id: 'dp',
    label: 'Dialyse Péritonéale (DP)',
    icon: '🟢',
    color: '#22c55e',
    abrev: 'DP',
    def: 'Utilise le péritoine comme membrane d\'échange. Un liquide de dialyse (dialysat) est infusé dans la cavité péritonéale via un cathéter (Tenckhoff). Les échanges se font entre le sang des capillaires péritonéaux et le dialysat.',
    principes: [
      { p: 'Osmose', d: 'Le glucose du dialysat crée un gradient osmotique → attire l\'eau (ultrafiltration)' },
      { p: 'Diffusion', d: 'Les toxines passent des capillaires péritonéaux vers le dialysat selon gradient de concentration' },
    ],
    acces: ['Cathéter de Tenckhoff implanté chirurgicalement (sous-cutané → intrapéritonéal)'],
    seance: 'Quotidienne — Manuelle (DPCA : 3–5 échanges/j) ou Automatisée (DPA : la nuit)',
    surveillance: [
      'Aspect du liquide de drainage (clair = normal, trouble = suspicion péritonite)',
      'Bilan hydrique quotidien (poids, diurèse, ultrafiltration)',
      'Site de sortie cathéter (rougeur, écoulement)',
      'Signes de péritonite : douleur abdo, fièvre, dialysat trouble',
      'Glycémie (glucose absorbé par le péritoine)',
    ],
    bgColor: T.orgaDim,
  },
  {
    id: 'epure',
    label: 'Épuration Réa (EERC)',
    icon: '🟡',
    color: '#f59e0b',
    abrev: 'EERC',
    def: 'Épuration Extra-Rénale Continue (EERC) utilisée en réanimation pour les insuffisances rénales aiguës graves. Plus douce hémodynamiquement que l\'HD intermittente. Mode continu 24h/24.',
    principes: [
      { p: 'CVVH (Hémofiltration continue)', d: 'Convection uniquement → solutés entraînés avec l\'ultrafiltrat. Substitution liquidienne importante.' },
      { p: 'CVVHD (Hémodialyse continue)', d: 'Diffusion uniquement (dialysat). Épuration efficace des petites molécules.' },
      { p: 'CVVHDF', d: 'Combinaison convection + diffusion. Mode le plus complet.' },
    ],
    acces: ['KCC fémorale ou jugulaire interne (double lumière) — cathéter de gros calibre'],
    seance: 'Continue 24h/24 — Changement de kit toutes 72h (caillotage) ou selon protocole',
    surveillance: [
      'Pressions du circuit (artérielle, veineuse, transmembranaire)',
      'Caillotage filtre (alarmes pression, débits)',
      'Bilan entrées/sorties horaire (ultrafiltrat)',
      'Anticoagulation : Héparine ou Citrate (selon protocole)',
      'Kaliémie, calcémie fréquentes (correction électrolytes)',
      'T° patient (hypothermie possible)',
    ],
    bgColor: T.surface2,
  },
];

const ACCESVASCULAIRES = [
  { type: 'FAV (Fistule Artério-Veineuse)', avantages: 'Durée de vie longue, faible risque infectieux, débit optimal', soins: 'Auscultation thrill, pas de prise de sang ni TA sur le membre, prévention compression' },
  { type: 'Prothèse (PTFE)', avantages: 'Alternative si FAV impossible', soins: 'Mêmes précautions que FAV. Risque de thrombose + élevé.' },
  { type: 'KCC tunnelisé (Permcath, Tesio)', avantages: 'Si FAV non possible ou délai', soins: 'Pansement stérile, verrou héparine/citrate, ne jamais aspirer sur le verrou sans protocole' },
  { type: 'Cathéter Tenckhoff (DP)', avantages: 'Dialyse péritonéale quotidienne à domicile', soins: 'Sortie cutanée stérile, technique aseptique OBLIGATOIRE aux échanges' },
];

const COMPLICATIONS_COMMUNES = [
  { comp: 'Hypotension per-séance (HD)', action: 'Mise en position Trendelenburg, ralentir UF, NaCl IV, appel médecin si persistant' },
  { comp: 'Péritonite (DP)', action: 'Dialysat trouble + douleur → prélèvement bactériologique du liquide + antibiothérapie IP urgente' },
  { comp: 'Caillotage circuit (EERC)', action: 'Alarmes pression, purge circuit selon protocole, changement filtre' },
  { comp: 'Thrombose FAV', action: 'Absence thrill/souffle → appel médecin urgence (chirurgie vasculaire)' },
  { comp: 'Infection KCC', action: 'Fièvre + frissons pendant ou après HD → hémocultures + retrait KCC si nécessaire' },
  { comp: 'Syndrome de déséquilibre (HD)', action: 'Céphalées, confusion, convulsions → ralentir, appel médecin, osmothérapie' },
];

export default function Dialyse() {
  const [typeOpen, setTypeOpen] = useState('hd');
  const [section, setSection] = useState('principes');

  const data = TYPES.find(t => t.id === typeOpen);

  return (
    <div style={{ padding: '14px' }}>
      {/* Header */}
      <div style={{ ...s.card, background: T.surface2, borderLeft: `4px solid ${C}` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          🫀 Dialyse — Principes généraux
        </div>
        <div style={{ color: T.muted, fontSize: 12 }}>
          Techniques d'épuration extra-rénale. Mécanismes, accès vasculaires, surveillance IDE.
        </div>
      </div>

      {/* Choix technique */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button key={t.id} onClick={() => { setTypeOpen(t.id); setSection('principes'); }}
            style={{ ...s.btn(typeOpen === t.id ? t.color : T.border), flex: 1, padding: '10px 6px', fontSize: 12, minWidth: 90 }}>
            {t.icon} {t.abrev}
          </button>
        ))}
      </div>

      {/* Définition */}
      <div style={{ ...s.card, background: data.bgColor, borderLeft: `4px solid ${data.color}` }}>
        <div style={{ color: data.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{data.icon} {data.label}</div>
        <div style={{ color: T.text, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{data.def}</div>
        <div style={{ background: data.color + '22', borderRadius: 6, padding: '6px 10px' }}>
          <span style={{ color: data.color, fontSize: 11, fontFamily: 'monospace' }}>🕐 {data.seance}</span>
        </div>
      </div>

      {/* Onglets section */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {[
          { id: 'principes', label: '⚗️ Mécanismes' },
          { id: 'acces', label: '💉 Accès vasc.' },
          { id: 'surveillance', label: '👁️ Surveillance' },
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            style={{ ...s.btn(section === t.id ? data.color : T.border), padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {section === 'principes' && (
        <div>
          {data.principes.map((p, i) => (
            <div key={i} style={{ ...s.card, borderLeft: `3px solid ${data.color}` }}>
              <div style={{ color: data.color, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{p.p}</div>
              <div style={{ color: T.text, fontSize: 13, lineHeight: 1.5 }}>{p.d}</div>
            </div>
          ))}
        </div>
      )}

      {section === 'acces' && (
        <div>
          {data.acces.map((a, i) => (
            <div key={i} style={{ ...s.card, borderLeft: `3px solid ${data.color}` }}>
              <div style={{ color: T.text, fontSize: 13 }}>• {a}</div>
            </div>
          ))}
        </div>
      )}

      {section === 'surveillance' && (
        <div style={{ ...s.card, borderLeft: `3px solid #f59e0b` }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>👁️ Points de surveillance IDE</div>
          {data.surveillance.map((sv, i) => (
            <div key={i} style={{ color: T.text, fontSize: 13, padding: '4px 0', borderBottom: i < data.surveillance.length-1 ? '1px solid #1e293b' : 'none' }}>
              • {sv}
            </div>
          ))}
        </div>
      )}

      {/* Accès vasculaires */}
      <div style={{ ...s.card, marginTop: 10 }}>
        <div style={{ color: C, fontWeight: 700, marginBottom: 10 }}>🩺 Soins des accès vasculaires</div>
        {ACCESVASCULAIRES.map((a, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < ACCESVASCULAIRES.length-1 ? '1px solid #1e293b' : 'none' }}>
            <div style={{ color: T.text, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{a.type}</div>
            <div style={{ color: '#22c55e', fontSize: 11, marginBottom: 2 }}>+ {a.avantages}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>🩺 {a.soins}</div>
          </div>
        ))}
      </div>

      {/* Complications communes */}
      <div style={{ ...s.card, marginTop: 10 }}>
        <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 10 }}>⚠️ Complications & CAT</div>
        {COMPLICATIONS_COMMUNES.map((c, i) => (
          <div key={i} style={{ padding: '7px 0', borderBottom: i < COMPLICATIONS_COMMUNES.length-1 ? '1px solid #1e293b' : 'none' }}>
            <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{c.comp}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>→ {c.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
