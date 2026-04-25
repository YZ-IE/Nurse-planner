import { useState } from 'react';
import { T, s } from '../../theme.js';
const C = T.soins || '#06b6d4';

// ── Images libres de droit — Wikimedia Commons (CC BY-SA) ────────────────────
// Sources : commons.wikimedia.org — usage médical professionnel
const WOUND_IMAGES = {
  infecte:      'https://commons.wikimedia.org/wiki/Special:FilePath/Infected_foot_ulcer.jpg',
  necrose_sec:  'https://commons.wikimedia.org/wiki/Special:FilePath/Dry_gangrene_of_the_toes.jpg',
  necrose_hum:  'https://commons.wikimedia.org/wiki/Special:FilePath/Fournier_gangrene.jpg',
  fibrine_sec:  'https://commons.wikimedia.org/wiki/Special:FilePath/Venous_ulcer_with_slough.jpg',
  fibrine_mod:  'https://commons.wikimedia.org/wiki/Special:FilePath/Leg_ulcer_slough.jpg',
  fibrine_abon: 'https://commons.wikimedia.org/wiki/Special:FilePath/Exudating_wound.jpg',
  bourgeon_peu: 'https://commons.wikimedia.org/wiki/Special:FilePath/Granulation_tissue.jpg',
  bourgeon_abon:'https://commons.wikimedia.org/wiki/Special:FilePath/Granulation_tissue.jpg',
  epith:        'https://commons.wikimedia.org/wiki/Special:FilePath/Wound_healing_epithelialization.jpg',
};

// ── SVG de secours si l'image ne charge pas ───────────────────────────────────
const WoundSVG = ({ id, color }) => {
  const size = 80;
  const svgs = {
    infecte: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#450a0a" stroke="#ef4444" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="16" fill="#7f1d1d"/>
        {[[30,34,4],[46,38,3],[36,46,3.5]].map(([cx,cy,r],i)=>(
          <circle key={i} cx={cx} cy={cy} r={r} fill="#ef4444" opacity="0.7"/>
        ))}
        <ellipse cx="28" cy="32" rx="3" ry="1.5" fill="#fca5a5" opacity="0.9" transform="rotate(-20 28 32)"/>
        <ellipse cx="48" cy="36" rx="3" ry="1.5" fill="#fca5a5" opacity="0.9" transform="rotate(15 48 36)"/>
        <text x="40" y="72" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="monospace">INFECTÉ</text>
      </svg>
    ),
    necrose_sec: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#1c1917" stroke="#78716c" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="16" fill="#44403c"/>
        <path d="M26 34 L36 40 L30 50" stroke="#292524" strokeWidth="2" fill="none"/>
        <path d="M46 32 L50 44 L42 50" stroke="#292524" strokeWidth="2" fill="none"/>
        <text x="40" y="72" textAnchor="middle" fill="#78716c" fontSize="7" fontFamily="monospace">NÉCROSE SÈCHE</text>
      </svg>
    ),
    necrose_hum: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#1c1507" stroke="#a16207" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="16" fill="#713f12"/>
        <ellipse cx="34" cy="38" rx="4" ry="6" fill="#a16207" opacity="0.8"/>
        <ellipse cx="46" cy="40" rx="3" ry="5" fill="#92400e" opacity="0.7"/>
        <text x="40" y="72" textAnchor="middle" fill="#a16207" fontSize="7" fontFamily="monospace">NÉCROSE HUMIDE</text>
      </svg>
    ),
    fibrine_sec: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#1c1507" stroke="#ca8a04" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="15" fill="#854d0e"/>
        <path d="M24 36 Q34 30 44 38 Q52 42 56 38" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.7"/>
        <path d="M26 42 Q36 38 46 42 Q52 46 56 42" stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.6"/>
        <text x="40" y="72" textAnchor="middle" fill="#ca8a04" fontSize="7" fontFamily="monospace">FIBRINE SÈCHE</text>
      </svg>
    ),
    fibrine_mod: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#1c1007" stroke="#d97706" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="15" fill="#92400e"/>
        <path d="M24 36 Q34 30 44 38 Q52 42 56 38" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.8"/>
        <ellipse cx="36" cy="44" rx="4" ry="5" fill="#d97706" opacity="0.6"/>
        <text x="40" y="72" textAnchor="middle" fill="#d97706" fontSize="7" fontFamily="monospace">FIBRINE MOD.</text>
      </svg>
    ),
    fibrine_abon: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#1c0a07" stroke="#ea580c" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="15" fill="#9a3412"/>
        <ellipse cx="34" cy="42" rx="5" ry="6" fill="#ea580c" opacity="0.6"/>
        <ellipse cx="46" cy="40" rx="4" ry="5.5" fill="#c2410c" opacity="0.6"/>
        <text x="40" y="72" textAnchor="middle" fill="#ea580c" fontSize="7" fontFamily="monospace">FIBRINE +++</text>
      </svg>
    ),
    bourgeon_peu: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#052e16" stroke="#16a34a" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="15" fill="#14532d"/>
        {[[32,36],[38,32],[45,35],[42,42],[33,44],[48,40],[40,48]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="4" fill="#16a34a" opacity="0.7"/>
        ))}
        <text x="40" y="72" textAnchor="middle" fill="#16a34a" fontSize="7" fontFamily="monospace">BOURGEON +</text>
      </svg>
    ),
    bourgeon_abon: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#052e16" stroke="#15803d" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="20" ry="15" fill="#166534"/>
        {[[30,34],[36,30],[43,32],[48,38],[45,46],[38,48],[32,46],[26,40],[29,36],[42,38],[37,42]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="3.5" fill="#22c55e" opacity="0.65"/>
        ))}
        <text x="40" y="72" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="monospace">BOURGEON +++</text>
      </svg>
    ),
    epith: (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="#0c1a2e" stroke="#0ea5e9" strokeWidth="2"/>
        <ellipse cx="40" cy="40" rx="22" ry="17" fill="#075985"/>
        <path d="M20 40 Q22 30 32 32 Q40 34 40 40 Q40 34 48 32 Q58 30 60 40" fill="#0ea5e9" opacity="0.5"/>
        <path d="M20 40 Q22 50 32 48 Q40 46 40 40 Q40 46 48 48 Q58 50 60 40" fill="#0ea5e9" opacity="0.5"/>
        <path d="M30 40 Q40 37 50 40" stroke="#7dd3fc" strokeWidth="1.5" fill="none" opacity="0.8"/>
        <text x="40" y="72" textAnchor="middle" fill="#0ea5e9" fontSize="7" fontFamily="monospace">ÉPITHÉLIALISATION</text>
      </svg>
    ),
  };
  return svgs[id] || null;
};

// ── Composant image avec fallback SVG ─────────────────────────────────────────
function WoundImage({ phaseId, color, label }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = WOUND_IMAGES[phaseId];

  if (imgFailed || !url) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <WoundSVG id={phaseId} color={color} />
        <div style={{ color: T.border, fontSize: 9, fontFamily: 'monospace' }}>illustration schématique</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <img
        src={url}
        alt={`Plaie — ${label}`}
        onError={() => setImgFailed(true)}
        style={{
          width: 80, height: 80,
          objectFit: 'cover',
          borderRadius: 10,
          border: `2px solid ${color}66`,
        }}
      />
      <div style={{ color: '#475569', fontSize: 9, fontFamily: 'monospace' }}>© Wikimedia Commons CC</div>
    </div>
  );
}

// ── Données ────────────────────────────────────────────────────────────────────
const PHASES = [
  {
    id: 'infecte', label: 'INFECTÉ', color: '#ef4444', icon: '🦠',
    desc: 'Exsudat tous niveaux · Chaleur · Érythème · Douleur · Odeur · Fièvre possible',
    action: 'Antisepsie + prélèvement bactério', freq: 'TLJ (24h)', bgColor: '#450a0a',
    pansements: [
      { nom: 'Argent (Ag)', ex: 'Mepilex Ag, Aquacel Ag', detail: 'Argent ionique bactéricide large spectre. Ne pas utiliser >14j en continu.' },
      { nom: 'Miel médical (Medihoney)', ex: 'Medihoney, L-Mesitran', detail: 'Actif osmotique + H₂O₂ → antibactérien. Ramollit la fibrine. Odeur forte normale.' },
      { nom: 'PHMB', ex: 'Kerlix AMD, Suprasorb X+PHMB', detail: 'Antiseptique non cytotoxique. Compatible avec cicatrisation.' },
    ],
  },
  {
    id: 'necrose_sec', label: 'NÉCROSE — Sèche', color: '#78716c', icon: '🪨',
    desc: 'Escarre noire/marron · Surface dure · Exsudat absent · Tissu mort déshydraté',
    action: 'Hydrater pour ramollir (autolyse)', freq: 'TLJ', bgColor: T.surface2,
    pansements: [
      { nom: 'Hydrogel', ex: 'Purilon, Intrasite, Askina Gel', detail: '>80% eau. Ramollit la nécrose par réhydratation. Appliquer généreusement. Couvrir d\'un film.' },
      { nom: 'Film semi-perméable (couverture)', ex: 'Tegaderm, Opsite', detail: 'En 2ème couche pour maintenir l\'humidité du gel.' },
      { nom: 'Hydrocolloïde (si nécrose fine)', ex: 'Comfeel, Duoderm', detail: 'Milieu humide favorisant l\'autolyse. Éviter si suspicion d\'infection.' },
    ],
  },
  {
    id: 'necrose_hum', label: 'NÉCROSE — Humide', color: '#a16207', icon: '💧',
    desc: 'Tissu noir/marron mou · Exsudat modéré à abondant · Risque infectieux élevé',
    action: 'Détersion + absorption', freq: 'TLJ', bgColor: T.surface2,
    pansements: [
      { nom: 'Alginate de calcium', ex: 'Algostéril, Seasorb, Melgisorb', detail: 'Très haute absorption. Forme un gel au contact → favorise la détersion. Hémostase. Humidifier avant retrait si sec.' },
      { nom: 'Hydrofibre (CMC)', ex: 'Aquacel, Versiva XC', detail: 'Gélification verticale (anti-macération des berges). Haute absorption. Forme un gel cohésif.' },
    ],
  },
  {
    id: 'fibrine_sec', label: 'FIBRINE — Sèche', color: '#ca8a04', icon: '🟡',
    desc: 'Dépôt jaune-blanc adhérent · Exsudat peu ou absent · Nécrose partielle possible',
    action: 'Détersion / Ramollissement', freq: 'TLJ', bgColor: T.surface2,
    pansements: [
      { nom: 'Hydrogel', ex: 'Purilon, Intrasite Gel', detail: 'Réhydrate la fibrine et favorise l\'autolyse. Couvrir d\'un film ou compresse.' },
      { nom: 'Film semi-perméable', ex: 'Tegaderm, Opsite', detail: 'Couverture légère maintenant l\'humidité. Transparent → surveillance aisée.' },
    ],
  },
  {
    id: 'fibrine_mod', label: 'FIBRINE — Modérée', color: '#d97706', icon: '🟠',
    desc: 'Dépôt fibrineux partiel · Exsudat + à ++ · Berges mal délimitées',
    action: 'Absorber + détersion', freq: 'TLJ', bgColor: '#1c1007',
    pansements: [
      { nom: 'Alginate de calcium', ex: 'Algostéril, Melgisorb', detail: 'Absorption modérée à élevée. Déterse la fibrine. Hémostase. Réhydrater avant retrait si collé.' },
      { nom: 'Hydrofibre', ex: 'Aquacel Extra, Durafiber', detail: 'Gélification verticale → protège les berges. Haute capacité d\'absorption.' },
    ],
  },
  {
    id: 'fibrine_abon', label: 'FIBRINE — Abondante', color: '#ea580c', icon: '🔶',
    desc: 'Fibrine extensive · Exsudat +++ · Risque macération péri-lésionnelle',
    action: 'Pomper (absorber max)', freq: 'TLJ', bgColor: '#1c0a07',
    pansements: [
      { nom: 'Super-absorbant', ex: 'Zetuvit Plus, Eclypse, Kerramax', detail: 'Capacité d\'absorption extrême. Évite les fuites, protège la peau péri-lésionnelle.' },
      { nom: 'Irrigo-détersif', ex: 'Prontosan gel, Octenilin gel', detail: 'Détersion + antisepsie locale douce. En lavage ou compresse imprégnée.' },
    ],
  },
  {
    id: 'bourgeon_peu', label: 'BOURGEONNEMENT — Faible', color: '#16a34a', icon: '🌱',
    desc: 'Tissu rouge vif granuleux · Exsudat faible · Fragile · Saigne au contact',
    action: 'Protéger le tissu fragile', freq: '2 à 3 jours', bgColor: T.orgaDim,
    pansements: [
      { nom: 'Interface silicone (atraumatique)', ex: 'Mepitel, Urgotul, Physiotulle', detail: 'Contact doux non adhérent → retrait sans traumatisme ni douleur.' },
      { nom: 'Tulle gras', ex: 'Jelonet, Adaptic', detail: 'Classique. Non adhérent. Peu absorbant → associer compresse si exsudat.' },
      { nom: 'Mousse fine', ex: 'Mepilex Lite, Biatain Silicone Lite', detail: 'Protection + légère absorption. Silicone en contact → atraumatique.' },
    ],
  },
  {
    id: 'bourgeon_abon', label: 'BOURGEONNEMENT — Abondant', color: '#15803d', icon: '🌿',
    desc: 'Tissu de granulation exubérant · Exsudat ++ à +++ · Risque hyperbourgeonnement',
    action: 'Absorber + protéger', freq: '2 à 3 jours', bgColor: T.orgaDim,
    pansements: [
      { nom: 'Hydrocellulaire / Mousse', ex: 'Mepilex, Biatain, Allevyn', detail: 'Absorption verticale importante. Anti-macération. Nombreuses formes (sacrum, talon, border...).' },
      { nom: 'Super-absorbant', ex: 'Zetuvit Plus, Eclypse Border', detail: 'Pour exsudats très importants. Évite les changements trop fréquents.' },
    ],
  },
  {
    id: 'epith', label: 'ÉPITHÉLIALISATION', color: '#0ea5e9', icon: '✨',
    desc: 'Bords roses nacrés refermant la plaie · Exsudat minime · Tissu très fragile',
    action: 'Protéger la cicatrice naissante', freq: '3 à 4 jours', bgColor: T.surface2,
    pansements: [
      { nom: 'Hydrocolloïde mince', ex: 'Duoderm Thin, Comfeel Plus Transparent', detail: 'Milieu humide optimal. Transparent pour surveillance. Change tous 3-4j.' },
      { nom: 'Interface silicone', ex: 'Mepitel One, Urgotul Duo', detail: 'Contact doux. Atraumatique. Protège l\'épithélium néoformé fragile.' },
      { nom: 'Film semi-perméable', ex: 'Tegaderm, Opsite Flexigrid', detail: 'Protection légère imperméable. Pour petites plaies en épithélialisation avancée.' },
    ],
  },
];

const PROPRIETES = [
  { nom: 'Hydrogel', prop: '>80% eau — Réhydrate et ramollit', usage: 'Nécrose sèche, fibrine sèche', icon: '💧' },
  { nom: 'Alginate / Hydrofibre', prop: 'Absorption max + Hémostase', usage: 'Nécrose humide, fibrine modérée', icon: '🧽' },
  { nom: 'Hydrocellulaire (Mousse)', prop: 'Absorption verticale — anti-macération', usage: 'Bourgeonnement exsudatif', icon: '🟩' },
  { nom: 'Super-absorbant', prop: 'Capacité extrême — fuites évitées', usage: 'Exsudats +++ quelle que soit la phase', icon: '🔵' },
  { nom: 'Charbon actif', prop: 'Neutralise les odeurs', usage: 'Plaies nécrotiques malodorantes', icon: '⚫' },
  { nom: 'Interface silicone', prop: 'Atraumatique — retrait sans douleur', usage: 'Peau fragile, bourgeonnement', icon: '🌸' },
  { nom: 'Argent (Ag)', prop: 'Bactéricide large spectre', usage: 'Plaies infectées ou à risque', icon: '⚡' },
  { nom: 'Miel médical', prop: 'Antibactérien osmotique + détersion', usage: 'Infection, fibrine résistante', icon: '🍯' },
  { nom: 'Film semi-perméable', prop: 'Transparent, imperméable, fin', usage: 'Couverture, épithélialisation', icon: '🪟' },
];

// ── Règles cliniques — redessinées ────────────────────────────────────────────
const REGLES = [
  {
    situation: 'Plaie chronique',
    niveau: 'INFO',
    couleur: '#06b6d4',
    protocole: [
      { etape: 'Nettoyage', detail: 'Eau + savon doux OU sérum physiologique' },
      { etape: 'Rinçage', detail: 'Obligatoire si antiseptique utilisé (cytotoxique !)' },
    ],
    attention: null,
  },
  {
    situation: 'Antiseptique utilisé',
    niveau: 'ALERTE',
    couleur: '#f97316',
    protocole: [
      { etape: '⚠️ Rinçage OBLIGATOIRE', detail: 'Les antiseptiques sont cytotoxiques pour les cellules de cicatrisation' },
      { etape: 'Alternative', detail: 'Préférer PHMB ou octénidine (moins cytotoxiques)' },
    ],
    attention: 'La chlorhexidine et la Bétadine retardent la cicatrisation si non rincées',
  },
  {
    situation: 'Escarre',
    niveau: 'PRIORITÉ',
    couleur: '#ef4444',
    protocole: [
      { etape: '🛏️ DÉCHARGE N°1', detail: 'Suppression de l\'appui AVANT tout autre geste' },
      { etape: 'Matelas', detail: 'Mousse haute densité, alternating, ou eau selon stade' },
      { etape: 'Repositionnement', detail: 'Toutes les 2-3h · Consigner dans le dossier' },
    ],
    attention: 'Sans décharge = cicatrisation impossible quelle que soit la qualité du pansement',
  },
  {
    situation: 'Ulcère veineux',
    niveau: 'PRIORITÉ',
    couleur: '#a78bfa',
    protocole: [
      { etape: '🩹 Compression INDISPENSABLE', detail: 'Bandes à étirement court (Biflex, Rosidal) ou bas Classe III' },
      { etape: 'Pression', detail: '30-40 mmHg à la cheville' },
      { etape: 'Contre-indication', detail: 'Vérifier IPS > 0,8 avant pose (Doppler)' },
    ],
    attention: 'L\'absence de compression est la première cause de récidive',
  },
  {
    situation: 'Pied diabétique',
    niveau: 'ALERTE',
    couleur: '#f43f5e',
    protocole: [
      { etape: '🚫 PAS d\'occlusion totale', detail: 'Danger infectieux — la plaie doit pouvoir "respirer"' },
      { etape: 'Détersion', detail: 'Prudente — neuropathie = absence de douleur protectrice' },
      { etape: 'Surveillance', detail: 'Glycémie + signes locaux + température cutanée' },
    ],
    attention: 'Toute plaie du pied diabétique = avis médical urgent',
  },
  {
    situation: 'Retrait d\'un pansement adhésif',
    niveau: 'TECHNIQUE',
    couleur: '#22c55e',
    protocole: [
      { etape: '↔️ Traction parallèle', detail: 'Jamais perpendiculaire à la peau (arrachement épidermique)' },
      { etape: 'Décollage progressif', detail: 'Soulever un bord · Contention de la peau péri-lésionnelle' },
      { etape: 'Si adhérence forte', detail: 'Humidifier ou utiliser spray décollant silicone' },
    ],
    attention: null,
  },
];

const CLASSIFICATION = [
  { classe: 'Classe I', ex: 'Compresses, tulles simples', remb: 'Inscription liste + tarif fixé' },
  { classe: 'Classe II', ex: 'Pansements actifs (hydrocolloïdes, alginates...)', remb: 'Prescription médicale nécessaire' },
  { classe: 'Classe III', ex: 'Argent, résorbables', remb: 'Prescription + protocole validé' },
];

const NIVEAU_STYLE = {
  'INFO':     { bg: T.surface2, badge: '#06b6d4' },
  'ALERTE':   { bg: '#1c1007', badge: '#f97316' },
  'PRIORITÉ': { bg: '#1c0a07', badge: '#ef4444' },
  'TECHNIQUE':{ bg: T.orgaDim, badge: '#22c55e' },
};

export default function Pansements() {
  const [vue, setVue] = useState('tableau');
  const [phaseOpen, setPhaseOpen] = useState(null);
  const [disclaimerOk, setDisclaimerOk] = useState(false);

  const tabs = [
    { id: 'tableau',    label: 'Tableau décisionnel', icon: '📊' },
    { id: 'proprietes', label: 'Propriétés DM',       icon: '🔬' },
    { id: 'regles',     label: 'Règles cliniques',    icon: '📏' },
    { id: 'lppr',       label: 'LPPR / Légal',        icon: '⚖️' },
  ];

  return (
    <div style={{ padding: '14px' }}>

      {/* Rappel anatomique */}
      <div style={{ ...s.card, background: T.surface2, marginBottom: 10 }}>
        <div style={{ color: C, fontWeight: 700, marginBottom: 4 }}>🩻 Rappel — Structure de la peau</div>
        <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
          <b style={{ color: T.text }}>3 couches :</b> Épiderme (5 ss-couches) · Derme (collagène + nerfs) · Hypoderme (tissu gras){'\n'}
          <b style={{ color: T.text }}>Thermorégulation :</b> 32–36°C · <b style={{ color: T.text }}>Élasticité</b> → plasticité cutanée
        </div>
      </div>

      {/* Phases de cicatrisation */}
      <div style={{ ...s.card, background: T.surface2, marginBottom: 12 }}>
        <div style={{ color: C, fontWeight: 700, marginBottom: 8 }}>🔄 Phases de cicatrisation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { phase: 'J0',     label: 'Hémostase',        detail: 'Caillot fibrine',             color: '#ef4444' },
            { phase: 'J0–21',  label: 'Inflammation',     detail: 'Macrophages / nettoyage',     color: '#f97316' },
            { phase: 'J3–21',  label: 'Bourgeonnement',   detail: 'Angiogenèse / fibroblastes',  color: '#22c55e' },
            { phase: 'Final',  label: 'Épithélialisation', detail: 'Fermeture cutanée',           color: '#0ea5e9' },
          ].map(p => (
            <div key={p.phase} style={{ background: T.bg, borderRadius: 8, padding: '8px 10px', borderLeft: `3px solid ${p.color}` }}>
              <div style={{ color: p.color, fontFamily: 'monospace', fontSize: 10, marginBottom: 2 }}>{p.phase}</div>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 12 }}>{p.label}</div>
              <div style={{ color: T.muted, fontSize: 11 }}>{p.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setVue(t.id)}
            style={{ ...s.btn(vue === t.id ? C : T.border), padding: '7px 11px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tableau décisionnel ── */}
      {vue === 'tableau' && (
        <div>
          {/* Disclaimer images médicales */}
          {!disclaimerOk ? (
            <div style={{ background: T.urgDim, border: '1px solid #ef444466', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                ⚕️ Contenu à usage professionnel
              </div>
              <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                Cette section contient des <b style={{ color: T.text }}>photographies cliniques réelles</b> de plaies à différents stades (infection, nécrose, bourgeonnement...).{'\n\n'}
                Ces images sont issues de <b style={{ color: T.text }}>Wikimedia Commons</b> (licence CC BY-SA) et sont destinées à la <b style={{ color: T.text }}>formation et à la pratique infirmière professionnelle</b>.
              </div>
              <button
                onClick={() => setDisclaimerOk(true)}
                style={{ ...s.btn('#ef4444'), padding: '10px 20px', fontSize: 13, fontWeight: 700, width: '100%' }}>
                ✓ Je suis professionnel de santé — Afficher le contenu
              </button>
            </div>
          ) : (
            <div style={{ background: T.orgaDim, border: '1px solid #16a34a44', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ color: '#16a34a', fontSize: 11, fontFamily: 'monospace' }}>
                ⚕️ Contenu professionnel · Photos © Wikimedia Commons CC BY-SA
              </div>
            </div>
          )}

          <div style={{ color: T.muted, fontSize: 12, marginBottom: 10 }}>
            Sélectionner le stade de la plaie pour voir les pansements adaptés.
          </div>

          {PHASES.map(p => (
            <div key={p.id}>
              <div onClick={() => setPhaseOpen(phaseOpen === p.id ? null : p.id)}
                style={{ ...s.card, background: p.bgColor, borderLeft: `4px solid ${p.color}`, cursor: 'pointer', marginBottom: phaseOpen === p.id ? 0 : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <span style={{ color: p.color, fontWeight: 700, fontSize: 14 }}>{p.label}</span>
                    </div>
                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 3 }}>{p.desc}</div>
                    <div style={{ color: p.color, fontSize: 11, fontFamily: 'monospace' }}>🎯 {p.action}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                    <span style={{ background: p.color + '22', color: p.color, fontSize: 9, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 10 }}>
                      {p.freq}
                    </span>
                    <span style={{ color: T.muted, fontSize: 16 }}>{phaseOpen === p.id ? '▲' : '▼'}</span>
                  </div>
                </div>
              </div>

              {phaseOpen === p.id && (
                <div style={{ background: T.bg, border: `1px solid ${p.color}44`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '12px', marginBottom: 10 }}>

                  {/* Zone image + description clinique */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '10px', background: T.bg, borderRadius: 10, alignItems: 'flex-start' }}>
                    {disclaimerOk
                      ? <WoundImage phaseId={p.id} color={p.color} label={p.label} />
                      : <WoundSVG id={p.id} color={p.color} />
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ color: p.color, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Aspect clinique</div>
                      <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.6 }}>{p.desc}</div>
                      <div style={{ color: p.color, fontSize: 11, fontFamily: 'monospace', marginTop: 6 }}>🎯 {p.action}</div>
                    </div>
                  </div>

                  {/* Pansements */}
                  {p.pansements.map((pm, i) => (
                    <div key={i} style={{ background: T.surface, borderRadius: 8, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${p.color}88` }}>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{pm.nom}</div>
                      <div style={{ color: p.color, fontSize: 11, marginBottom: 4, fontStyle: 'italic' }}>Ex : {pm.ex}</div>
                      <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>{pm.detail}</div>
                    </div>
                  ))}

                  <div style={{ color: T.muted, fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
                    🕐 Fréquence de change : {p.freq}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Propriétés DM ── */}
      {vue === 'proprietes' && (
        <div>
          {PROPRIETES.map((p, i) => (
            <div key={i} style={{ ...s.card }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.nom}</div>
                  <div style={{ color: C, fontSize: 12, marginBottom: 4 }}>{p.prop}</div>
                  <div style={{ color: T.muted, fontSize: 11 }}>Indiqué : {p.usage}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Règles cliniques — redessinées ── */}
      {vue === 'regles' && (
        <div>
          <div style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
            Protocoles et points de vigilance essentiels pour la prise en charge des plaies.
          </div>

          {REGLES.map((r, i) => {
            const style = NIVEAU_STYLE[r.niveau] || NIVEAU_STYLE['INFO'];
            return (
              <div key={i} style={{
                background: style.bg,
                border: `1px solid ${style.badge}44`,
                borderRadius: 12,
                padding: '14px',
                marginBottom: 12,
              }}>
                {/* En-tête */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ color: style.badge, fontWeight: 700, fontSize: 14 }}>{r.situation}</div>
                  <span style={{
                    background: style.badge + '22',
                    color: style.badge,
                    fontSize: 9,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 10,
                    letterSpacing: 1,
                  }}>{r.niveau}</span>
                </div>

                {/* Étapes du protocole */}
                {r.protocole.map((etape, j) => (
                  <div key={j} style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    marginBottom: 8,
                    paddingBottom: j < r.protocole.length - 1 ? 8 : 0,
                    borderBottom: j < r.protocole.length - 1 ? `1px solid ${style.badge}22` : 'none',
                  }}>
                    <div style={{
                      background: style.badge + '22',
                      color: style.badge,
                      fontFamily: 'monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      flexShrink: 0,
                      marginTop: 1,
                    }}>{j + 1}</div>
                    <div>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{etape.etape}</div>
                      <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>{etape.detail}</div>
                    </div>
                  </div>
                ))}

                {/* Point d'attention */}
                {r.attention && (
                  <div style={{
                    background: T.bg,
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginTop: 4,
                    borderLeft: `3px solid ${style.badge}`,
                  }}>
                    <div style={{ color: style.badge, fontSize: 11, lineHeight: 1.5 }}>
                      💡 {r.attention}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LPPR ── */}
      {vue === 'lppr' && (
        <div>
          <div style={{ ...s.card, background: T.surface2, borderLeft: '3px solid #a78bfa' }}>
            <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: 6 }}>⚖️ Classification LPPR des pansements</div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
              Liste des Produits et Prestations Remboursables — pansements remboursables sur prescription médicale.
            </div>
          </div>
          {CLASSIFICATION.map((c, i) => (
            <div key={i} style={{ ...s.card, borderLeft: '3px solid #a78bfa' }}>
              <div style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }}>{c.classe}</div>
              <div style={{ color: T.text, fontSize: 13, marginBottom: 4 }}>{c.ex}</div>
              <div style={{ color: T.muted, fontSize: 12 }}>{c.remb}</div>
            </div>
          ))}
          <div style={{ ...s.card, background: T.urgDim, borderLeft: '3px solid #ef4444' }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>⚠️ Rappel réglementaire</div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>
              Les pansements de classe II et III nécessitent une ordonnance médicale.
              La pose et le choix clinique relèvent du rôle propre infirmier (art. R.4311-5 CSP)
              mais la prescription médicale reste obligatoire pour le remboursement.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
