import { useState } from 'react';
import { T, s } from '../../theme.js';
const C = T.soins || '#06b6d4';
const RED = '#ef4444';

const CONTENU = {
  def: {
    label: 'Définition',
    color: C,
    body: [
      { titre: 'Qu\'est-ce que le KTA ?', texte: 'Cathéter Transfixiant Artériel (KTA) = cathéter inséré dans une artère (radiale +++, fémorale, humérale) pour mesurer en continu la pression artérielle invasive (PAI) et permettre des prélèvements artériels répétés (gazométrie).' },
      { titre: 'Sites de pose', texte: 'Artère radiale (1er choix — test d\'Allen avant pose) · Artère fémorale (2ème choix) · Artère humérale (3ème choix)' },
      { titre: 'Durée recommandée', texte: '≤ 7 jours sur un même site. Rotation systématique.' },
    ],
  },
  indic: {
    label: 'Indications',
    color: '#22c55e',
    liste: [
      'Monitorage PAI en réanimation / soins intensifs',
      'Instabilité hémodynamique (choc, chirurgie lourde)',
      'Gazométries artérielles répétées (> 3/jour)',
      'Patients sous vasopresseurs (noradrénaline, adrénaline)',
      'Chirurgie cardiaque, vasculaire, neurochirurgie',
      'Insuffisance respiratoire grave nécessitant suivi GDS',
    ],
  },
  surveillance: {
    label: 'Surveillance',
    color: '#f59e0b',
    items: [
      { item: 'Courbe de pression', alerte: 'Amortissement anormal → coudure, caillot, positionnement' },
      { item: 'Site artériel', alerte: 'Pâleur, cyanose, froideur en aval → ischémie = urgence' },
      { item: 'Hémorragie', alerte: 'Toute déconnexion accidentelle = perte sanguine rapide' },
      { item: 'Connexions', alerte: 'Vérifier l\'absence de bulles d\'air dans le système (risque embolie)' },
      { item: 'Zéro de référence', alerte: 'Transducteur au niveau de l\'oreillette droite (4ème espace intercostal, ligne mid-axillaire)' },
      { item: 'Signes infectieux', alerte: 'Rougeur, œdème site, fièvre inexpliquée → hémocultures' },
      { item: 'Flush automatique', alerte: 'NaCl hépariné (ou NaCl seul selon protocole) 3 mL/h en continu' },
    ],
  },
  prelevements: {
    label: 'Prélèvements GAZ',
    color: C,
    steps: [
      { step: 'Vérification', detail: 'Courbe tracée + perméabilité correcte avant prélèvement' },
      { step: 'Purge', detail: 'Aspirer et jeter 3–5 mL de sang (purge du mort-volume + flush)' },
      { step: 'Prélèvement', detail: 'Prélever sur seringue héparinée (GDS) ou tube adapté. Volume minimum requis selon analyse.' },
      { step: 'Rinçage', detail: 'Flush manuel doux 3–5 mL NaCl → vérifier retour courbe de pression' },
      { step: 'Acheminement GDS', detail: 'Analyse dans les 15 minutes (dérivation gazeuse sinon). Glace si délai > 5 min.' },
      { step: 'Traçabilité', detail: 'Heure, paramètres cliniques associés (FiO₂, VNI, VM...)' },
    ],
  },
  complications: {
    label: 'Complications',
    color: RED,
    items2: [
      { type: 'Thrombose artérielle', signe: 'Pâleur / cyanose / froideur main ou pied', action: 'RETRAIT IMMÉDIAT + appel médecin' },
      { type: 'Hémorragie / Déconnexion', signe: 'Saignement soudain abondant', action: 'Compression manuelle + appel urgence' },
      { type: 'Infection locale / sepsis', signe: 'Rougeur site, fièvre', action: 'Hémocultures, retrait si nécessaire' },
      { type: 'Embolie gazeuse', signe: 'Signes neurologiques / ischémie', action: 'Prévention ++ : pas d\'air dans le système' },
      { type: 'Hématome compressif', signe: 'Gonflement douloureux au site', action: 'Compression + évaluation médicale' },
      { type: 'Pseudoanévrysme', signe: 'Masse pulsatile au site', action: 'Écho-doppler + prise en charge chirurgicale' },
    ],
  },
  entretien: {
    label: 'Entretien',
    color: '#a78bfa',
    steps: [
      { step: 'Flush continu', detail: 'NaCl 0,9% ± Héparine 1–2 UI/mL selon protocole — 3 mL/h via pression counter (300 mmHg)' },
      { step: 'Pansement', detail: 'Stérile transparent tous les 7 jours (ou si souillé/décollé) — antisepsie chlorhexidine alcoolique' },
      { step: 'Vérification zéro', detail: 'Remettre à zéro le transducteur à chaque changement de position ou dès doute' },
      { step: 'Changement tubulure', detail: 'Toutes les 72–96h selon protocole institutionnel' },
      { step: 'Traçabilité', detail: 'Date pose, site, calibre, état du site à chaque pansement' },
    ],
  },
};

const TEST_ALLEN = [
  'Comprimer les deux artères (radiale + cubitale) → main blanche',
  'Relâcher l\'artère cubitale uniquement',
  'Test positif = recoloration < 7 secondes (flux cubital suffisant)',
  'Test négatif (> 10 s) = contre-indication relative au KTA radial',
];

export default function KTA() {
  const [open, setOpen] = useState('def');
  const current = CONTENU[open];

  return (
    <div style={{ padding: '14px' }}>
      {/* Header */}
      <div style={{ ...s.card, background: T.surface2, borderLeft: `4px solid ${RED}` }}>
        <div style={{ color: RED, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          🔴 KTA — Cathéter Artériel (PAI)
        </div>
        <div style={{ color: T.muted, fontSize: 12 }}>
          Monitorage invasif de la pression artérielle et prélèvements gazométriques répétés en réanimation / soins intensifs.
        </div>
      </div>

      {/* Test d'Allen */}
      <div style={{ ...s.card, background: T.surface2, borderLeft: `3px solid ${C}`, marginBottom: 12 }}>
        <div style={{ color: C, fontWeight: 700, marginBottom: 8 }}>🖐️ Test d'Allen — Pré-ponction radiale</div>
        {TEST_ALLEN.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '3px 0', color: T.text, fontSize: 12 }}>
            <span style={{ color: C, fontFamily: 'monospace' }}>{i+1}.</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Alerte */}
      <div style={{ background: '#450a0a', border: '1px solid #ef444488', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ color: RED, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>⚠️ SÉCURITÉ CRITIQUE</div>
        <div style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.5 }}>
          Ne <b>JAMAIS</b> injecter de médicament par le KTA. Risque de nécrose et d'ischémie irréversible. 
          Identifier clairement le circuit artériel (étiquette rouge + ligne sans robinet accessible).
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {Object.entries(CONTENU).map(([id, val]) => (
          <button key={id} onClick={() => setOpen(id)}
            style={{ ...s.btn(open === id ? val.color : T.border), padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {open === 'def' && current.body.map((b, i) => (
        <div key={i} style={{ ...s.card, borderLeft: `3px solid ${C}` }}>
          <div style={{ color: C, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{b.titre}</div>
          <div style={{ color: T.text, fontSize: 13, lineHeight: 1.5 }}>{b.texte}</div>
        </div>
      ))}

      {open === 'indic' && (
        <div style={{ ...s.card, borderLeft: '3px solid #22c55e' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 8 }}>✅ Indications</div>
          {current.liste.map((l, i) => (
            <div key={i} style={{ color: T.text, fontSize: 13, padding: '3px 0' }}>• {l}</div>
          ))}
        </div>
      )}

      {open === 'surveillance' && (
        <div style={{ ...s.card, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 10 }}>👁️ Points de surveillance</div>
          {current.items.map((sv, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: i < current.items.length-1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 12 }}>{sv.item}</div>
              <div style={{ color: '#f59e0b', fontSize: 12 }}>→ {sv.alerte}</div>
            </div>
          ))}
        </div>
      )}

      {(open === 'prelevements' || open === 'entretien') && (
        <div style={{ ...s.card, borderLeft: `3px solid ${current.color}` }}>
          <div style={{ color: current.color, fontWeight: 700, marginBottom: 10 }}>{current.label}</div>
          {current.steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: i < current.steps.length-1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: current.color, fontFamily: 'monospace', fontSize: 11, minWidth: 22, fontWeight: 700 }}>{i+1}.</div>
              <div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{st.step}</div>
                <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{st.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open === 'complications' && (
        <div>
          {current.items2.map((c, i) => (
            <div key={i} style={{ ...s.card, borderLeft: '3px solid #ef4444' }}>
              <div style={{ color: RED, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{c.type}</div>
              <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Signes : {c.signe}</div>
              <div style={{ color: '#22c55e', fontSize: 12 }}>→ {c.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
