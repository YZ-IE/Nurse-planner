import { useState } from 'react';
import { T, s } from '../../theme.js';
const C = T.soins || '#06b6d4';

const SECTIONS_PAC = [
  {
    id: 'def',
    label: 'Définition',
    content: (
      <div>
        <p style={{ color: T?.text, fontSize: 13, lineHeight: 1.6 }}>
          Chambre implantable sous-cutanée reliée à un cathéter central. Implantée chirurgicalement sous la clavicule ou dans le bras. 
          L'accès se fait par ponction percutanée de la membrane en silicone (septum) à l'aide d'une <b style={{ color: C }}>aiguille de Huber</b> (pointe non tranchante).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {[
            { label: 'Site', val: 'Sous-clavière (95%) ou bras' },
            { label: 'Durée vie', val: 'Années (si bien entretenu)' },
            { label: 'Accès', val: 'Aiguille Huber UNIQUEMENT' },
            { label: 'Rinçage min.', val: '1×/mois si non utilisé' },
          ].map((i, idx) => (
            <div key={idx} style={{ background: T.bg, borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: T?.muted, fontSize: 10, fontFamily: 'monospace' }}>{i.label}</div>
              <div style={{ color: C, fontWeight: 600, fontSize: 12, marginTop: 2 }}>{i.val}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'ponction',
    label: 'Ponction PAC',
    content: null,
    steps: [
      { step: 'Vérification', detail: 'Ordonnance + identité patient + allergie latex/antiseptiques' },
      { step: 'Matériel', detail: 'Aiguille Huber (19 ou 20G selon PAC), prolongateur + robinet, compresses stériles, désinfectant, gants stériles, champ stérile' },
      { step: 'Repérage', detail: 'Palper la chambre → identifier les 3 bords. Centre = septum. Repère visuel si chambre visible.' },
      { step: 'Désinfection', detail: 'Antisepsie large (povidone iodée ou chlorhexidine alcoolique × 3 passages). Temps contact respecté.' },
      { step: 'Ponction', detail: 'Aiguille perpendiculaire au septum — enfoncer jusqu\'au fond de la chambre (résistance métallique). NE PAS piquer en biais.' },
      { step: 'Vérification', detail: 'Aspiration de sang (reflux) → OBLIGATOIRE avant toute injection. Si absent : repositionner ou contacter médecin.' },
      { step: 'Rinçage', detail: 'NaCl 0,9% 10–20 mL en poussée-pause (turbulence = dépôts évités). Clamp ouvert.' },
      { step: 'Fixation', detail: 'Fixation aiguille + pansement transparent stérile. Traçabilité : date pose, taille aiguille, opérateur.' },
    ],
    color: C,
  },
  {
    id: 'deponction',
    label: 'Déponction',
    content: null,
    steps: [
      { step: 'Rinçage final', detail: '20 mL NaCl 0,9% poussée-pause' },
      { step: 'Verrou hépariné', detail: '5 mL Héparine (100–300 UI/mL selon protocole) — volume = volume de la chambre + prolongateur' },
      { step: 'Clampag + retrait', detail: 'Maintenir pression sur piston pendant le retrait de l\'aiguille (évite le reflux)' },
      { step: 'Compression', detail: 'Comprimer 30–60 secondes le site de ponction' },
      { step: 'Pansement sec', detail: 'Petite compresse stérile + sparadrap 24h' },
      { step: 'Traçabilité', detail: 'Date déponction, état du site, noter dans dossier' },
    ],
    color: '#22c55e',
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    content: null,
    items: [
      { item: 'Site de ponction', alerte: 'Rougeur, œdème, douleur, écoulement, fistule cutanée' },
      { item: 'Reflux sanguin', alerte: 'Absent = ne pas utiliser → prévenir médecin' },
      { item: 'Résistance injection', alerte: 'Si résistance augmentée → obstruction, torsion, position bras' },
      { item: 'Signes de fuite', alerte: 'Douleur lors de l\'injection, gonflement → extravasation' },
      { item: 'Fièvre / frissons', alerte: 'Infection sur cathéter → hémocultures PAC + périphérique' },
      { item: 'Thrombose', alerte: 'Œdème cervico-facial, circulation collatérale → doppler VCS' },
      { item: 'Durée aiguille en place', alerte: 'Max 7 jours (selon protocole) — changer aiguille Huber' },
    ],
  },
  {
    id: 'complications',
    label: 'Complications',
    content: null,
    items2: [
      { type: 'Obstruction', cause: 'Dépôts fibrine, lipides, précipités médicamenteux', action: 'Urokinase selon protocole (médecin)' },
      { type: 'Extravasation', cause: 'Aiguille mal positionnée, perforation septum', action: 'STOP perfusion immédiat — appel médecin' },
      { type: 'Infection', cause: 'Défaut d\'asepsie, portage cutané', action: 'Hémocultures PAC + VVP · Antibiothérapie · Ablation si nécessaire' },
      { type: 'Thrombose', cause: 'Débit lent, hypercoagulabilité', action: 'Anticoagulation — décision médicale' },
      { type: 'Déplacement', cause: 'Migration cathéter', action: 'Radio thorax — ne pas utiliser' },
      { type: 'Pinch-off', cause: 'Compression cathéter entre clavicule et 1ère côte', action: 'Radio spécifique — risque rupture' },
    ],
  },
];

export default function PAC() {
  const [open, setOpen] = useState('def');

  const tabs = SECTIONS_PAC.map(s => ({ id: s.id, label: s.label }));

  const current = SECTIONS_PAC.find(s => s.id === open);

  return (
    <div style={{ padding: '14px' }}>
      {/* Header */}
      <div style={{ ...s.card, background: T.surface2, borderLeft: `4px solid ${C}` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          🔵 Port-à-Cathéter (PAC) — Chambre implantable
        </div>
        <div style={{ color: T.muted, fontSize: 12 }}>
          Dispositif veineux central implantable. Accès exclusif par <b style={{ color: C }}>aiguille de Huber</b>.
          Permet chimiothérapies, NPT, traitements prolongés sans contrainte quotidienne.
        </div>
      </div>

      {/* Alerte clé */}
      <div style={{ background: '#451a03', border: '1px solid #f59e0b88', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
          ⚠️ RÈGLE ABSOLUE
        </div>
        <div style={{ color: '#fbbf24', fontSize: 12, lineHeight: 1.5 }}>
          Toujours vérifier le <b>reflux sanguin</b> avant toute injection.
          Ne jamais utiliser une aiguille standard (risque de carottage du septum).
          <b> Aiguille de Huber obligatoire.</b>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setOpen(t.id)}
            style={{ ...s.btn(open === t.id ? C : T.border), padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {open === 'def' && current.content}

      {(open === 'ponction' || open === 'deponction') && (
        <div style={{ ...s.card, borderLeft: `3px solid ${current.color}` }}>
          <div style={{ color: current.color, fontWeight: 700, marginBottom: 10 }}>
            {open === 'ponction' ? '📍 Protocole de ponction' : '🔄 Protocole de déponction'}
          </div>
          {current.steps.map((st, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: i < current.steps.length-1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: current.color, fontFamily: 'monospace', fontSize: 11, minWidth: 24, fontWeight: 700 }}>
                {i+1}.
              </div>
              <div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{st.step}</div>
                <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{st.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open === 'surveillance' && (
        <div style={{ ...s.card, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 10 }}>👁️ Points de surveillance</div>
          {current.items.map((sv, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: i < current.items.length-1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 12 }}>{sv.item}</div>
              <div style={{ color: '#f59e0b', fontSize: 12 }}>⚠️ {sv.alerte}</div>
            </div>
          ))}
        </div>
      )}

      {open === 'complications' && (
        <div>
          {current.items2.map((c, i) => (
            <div key={i} style={{ ...s.card, borderLeft: '3px solid #ef4444' }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{c.type}</div>
              <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Cause : {c.cause}</div>
              <div style={{ color: '#22c55e', fontSize: 12 }}>→ {c.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
