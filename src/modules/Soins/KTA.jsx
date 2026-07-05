import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, Chip, Banner } from '../../ui/index.js';
const C = T.soins || '#06b6d4';
const RED = T.danger;

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
    color: T.success,
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
    color: T.warning,
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
      <Card accent={RED}>
        <div style={{ color: RED, fontWeight: 700, fontSize: tk.font.base, marginBottom: 4 }}>
          🔴 KTA — Cathéter Artériel (PAI)
        </div>
        <div style={{ color: T.muted, fontSize: tk.font.sm }}>
          Monitorage invasif de la pression artérielle et prélèvements gazométriques répétés en réanimation / soins intensifs.
        </div>
      </Card>

      {/* Test d'Allen */}
      <Card accent={C}>
        <div style={{ color: C, fontWeight: 700, fontSize: tk.font.base, marginBottom: 8 }}>🖐️ Test d'Allen — Pré-ponction radiale</div>
        {TEST_ALLEN.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', color: T.text, fontSize: tk.font.sm }}>
            <span style={{ color: C, fontWeight: 700 }}>{i+1}.</span>
            <span>{t}</span>
          </div>
        ))}
      </Card>

      {/* Alerte */}
      <Banner kind="danger" title="SÉCURITÉ CRITIQUE">
        Ne <b>JAMAIS</b> injecter de médicament par le KTA. Risque de nécrose et d'ischémie irréversible.
        Identifier clairement le circuit artériel (étiquette rouge + ligne sans robinet accessible).
      </Banner>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {Object.entries(CONTENU).map(([id, val]) => (
          <Chip key={id} color={val.color} active={open === id} onClick={() => setOpen(id)} style={{ flexShrink: 0 }}>
            {val.label}
          </Chip>
        ))}
      </div>

      {/* Contenu */}
      {open === 'def' && current.body.map((b, i) => (
        <Card key={i} accent={C}>
          <div style={{ color: C, fontWeight: 700, fontSize: tk.font.sm, marginBottom: 5 }}>{b.titre}</div>
          <div style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.5 }}>{b.texte}</div>
        </Card>
      ))}

      {open === 'indic' && (
        <Card accent={T.success}>
          <div style={{ color: T.success, fontWeight: 700, fontSize: tk.font.base, marginBottom: 8 }}>✅ Indications</div>
          {current.liste.map((l, i) => (
            <div key={i} style={{ color: T.text, fontSize: tk.font.sm, padding: '4px 0', lineHeight: 1.5 }}>• {l}</div>
          ))}
        </Card>
      )}

      {open === 'surveillance' && (
        <Card accent={T.warning}>
          <div style={{ color: T.warning, fontWeight: 700, fontSize: tk.font.base, marginBottom: 10 }}>👁️ Points de surveillance</div>
          {current.items.map((sv, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: i < current.items.length-1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: tk.font.sm }}>{sv.item}</div>
              <div style={{ color: T.warning, fontSize: tk.font.sm }}>→ {sv.alerte}</div>
            </div>
          ))}
        </Card>
      )}

      {(open === 'prelevements' || open === 'entretien') && (
        <Card accent={current.color}>
          <div style={{ color: current.color, fontWeight: 700, fontSize: tk.font.base, marginBottom: 10 }}>{current.label}</div>
          {current.steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: i < current.steps.length-1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ color: current.color, fontSize: tk.font.sm, minWidth: 22, fontWeight: 700 }}>{i+1}.</div>
              <div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: tk.font.sm, marginBottom: 3 }}>{st.step}</div>
                <div style={{ color: T.muted, fontSize: tk.font.sm, lineHeight: 1.4 }}>{st.detail}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {open === 'complications' && (
        <div>
          {current.items2.map((c, i) => (
            <Card key={i} accent={T.danger}>
              <div style={{ color: T.danger, fontWeight: 700, fontSize: tk.font.base, marginBottom: 4 }}>{c.type}</div>
              <div style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 5 }}>Signes : {c.signe}</div>
              <div style={{ color: T.success, fontSize: tk.font.sm }}>→ {c.action}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
