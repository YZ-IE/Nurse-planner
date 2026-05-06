/**
 * templates.js — Aide-Mémoire v3
 *
 * Règle de catégorisation :
 *   persistent: true  → état du patient ou date (séjour)
 *   persistent: false → soin ou surveillance (journalier)
 */

export const SPECIALTIES = [
  { id: 'traumato',        label: '🦴 Traumatologie',   color: '#f97316' },
  { id: 'neuro',           label: '🧠 Neurologie',       color: '#a78bfa' },
  { id: 'chirurgie',       label: '🔪 Chirurgie',         color: '#06b6d4' },
  { id: 'medecine',        label: '🫀 Médecine',          color: '#22c55e' },
  { id: 'pediatrie',       label: '👶 Pédiatrie',         color: '#fbbf24' },
  { id: 'tournee_liberal', label: '🚗 Tournée Libérale', color: '#ec4899' },
  { id: 'tournee_had',     label: '🏠 HAD',              color: '#8b5cf6' },
  { id: 'custom',          label: '⚙️ Personnalisé',     color: '#64748b' },
];

/** Retourne true si la spécialité utilise le module Tournée (données propres) */
export function isTournee(specialtyId) {
  return specialtyId === 'tournee_liberal' || specialtyId === 'tournee_had';
}

// Flags communs — tous liés à l'état du patient → persistent: true
// sauf NPO et antalgie qui sont des prescriptions journalières
const COMMON_FLAGS = [
  { id: 'allergie',    label: '⚠️ Allergie',                 type: 'text',     persistent: true,  category: 'flag' },
  { id: 'chute',       label: '🔴 Risque chute',              type: 'boolean',  persistent: true,  category: 'flag' },
  { id: 'isolement',   label: '🟡 Isolement',                 type: 'select',   persistent: true,  category: 'flag',
    options: ['Contact', 'Gouttelettes', 'Air', 'Protecteur'] },
  { id: 'surv_part',   label: '👁 Surveillance particulière', type: 'textarea', persistent: true,  category: 'flag' },
  { id: 'npo',         label: '🚫 À jeun (NPO)',              type: 'boolean',  persistent: false, category: 'flag' },
  { id: 'douleur',     label: '💊 Antalgie',                  type: 'select',   persistent: false, category: 'flag',
    options: ['Palier 1', 'Palier 2', 'Palier 3 LP', 'Palier 3 sb'] },
];

export const TEMPLATES = {

  traumato: { fields: [
    ...COMMON_FLAGS,
    // ── Séjour (état / date) ──
    { id: 'rdv_chir',   label: 'RDV',                type: 'list',    persistent: true,  category: 'info' },
    { id: 'appui',      label: 'Appui autorisé',     type: 'select',  persistent: true,  category: 'info',
      options: ['Total', 'Partiel', 'Non autorisé', 'À préciser'] },
    { id: 'zimmer',     label: 'Équipement',         type: 'list',    persistent: true,  category: 'info' },
    { id: 'hbpm',       label: 'Injectable',         type: 'list',    persistent: true,  category: 'info' },
    { id: 'avq',        label: 'AVQ / Autonomie',    type: 'select',  persistent: true,  category: 'info',
      options: ['Autonome', 'Aide partielle', 'Aide totale'] },
    // ── Journalier (soins / surveillance) ──
    { id: 'j_postop',   label: 'J post-op',          type: 'number',  persistent: false, category: 'observation' },
    { id: 'pst',        label: 'Pansement réalisé',   type: 'boolean', persistent: false, category: 'observation' },
    { id: 'constantes', label: 'Constantes',           type: 'text',    persistent: false, category: 'constante' },
  ]},

  neuro: { fields: [
    ...COMMON_FLAGS,
    // ── Séjour (état du patient) ──
    { id: 'fausses_routes', label: '⚡ Fausses routes',    type: 'boolean', persistent: true,  category: 'flag' },
    { id: 'cognition',      label: 'Troubles cognitifs',   type: 'boolean', persistent: true,  category: 'flag' },
    { id: 'continence',     label: 'Continence',           type: 'select',  persistent: true,  category: 'info',
      options: ['Continent', 'Incontinent', 'Protection', 'Sondage'] },
    { id: 'motricite',      label: 'Mobilité',             type: 'select',  persistent: true,  category: 'info',
      options: ['Autonome', 'Aide humaine', 'Fauteuil', 'Alité'] },
    { id: 'regime',         label: 'Régime alimentaire',   type: 'select',  persistent: true,  category: 'info',
      options: ['Normal', 'Haché fin', 'Mixé', 'Liquide épaissi', 'NE'] },
    { id: 'const_freq',     label: 'Fréquence constantes', type: 'select',  persistent: true,  category: 'info',
      options: ['1×/jour', '3×/jour', 'Toutes les 4h', 'Continue'] },
    // ── Journalier (soins / surveillance) ──
    { id: 'contention',     label: 'Contention active',    type: 'boolean', persistent: false, category: 'observation' },
    { id: 'constantes',     label: 'Constantes',           type: 'text',    persistent: false, category: 'constante' },
  ]},

  chirurgie: { fields: [
    ...COMMON_FLAGS,
    // ── Séjour (état / date) ──
    { id: 'stomie',     label: '🩺 Stomie',             type: 'boolean', persistent: true,  category: 'flag' },
    { id: 'rdv_chir',   label: 'RDV',                    type: 'list',    persistent: true,  category: 'info' },
    { id: 'appui',      label: 'Appui autorisé',         type: 'select',  persistent: true,  category: 'info',
      options: ['Total', 'Partiel', 'Non autorisé'] },
    { id: 'drain',      label: 'Drain en place',         type: 'text',    persistent: true,  category: 'info' },
    { id: 'avq',        label: 'AVQ / Autonomie',        type: 'select',  persistent: true,  category: 'info',
      options: ['Autonome', 'Aide partielle', 'Aide totale'] },
    // ── Journalier (soins / surveillance) ──
    { id: 'j_postop',   label: 'J post-op',              type: 'number',  persistent: false, category: 'observation' },
    { id: 'transit',    label: 'Reprise transit',         type: 'select',  persistent: false, category: 'observation',
      options: ['Non', 'Gaz', 'Selles'] },
    { id: 'pst',        label: 'Pansement réalisé',       type: 'boolean', persistent: false, category: 'observation' },
    { id: 'constantes', label: 'Constantes',              type: 'text',    persistent: false, category: 'constante' },
  ]},

  medecine: { fields: [
    ...COMMON_FLAGS,
    // ── Séjour (état / date) ──
    { id: 'rdv_ext',     label: 'RDV / Examens',          type: 'text',    persistent: true,  category: 'info' },
    // ── Journalier (soins / surveillance) ──
    { id: 'bilan_bio',   label: 'Bilan bio à récupérer',  type: 'text',    persistent: false, category: 'observation' },
    { id: 'oxygenation', label: 'Oxygénothérapie',        type: 'text',    persistent: false, category: 'observation' },
    { id: 'diurese',     label: 'Diurèse surveillée',     type: 'boolean', persistent: false, category: 'observation' },
    { id: 'poids',       label: 'Poids du jour (kg)',     type: 'number',  persistent: false, category: 'constante' },
    { id: 'constantes',  label: 'Constantes',             type: 'text',    persistent: false, category: 'constante' },
  ]},

  pediatrie: { fields: [
    ...COMMON_FLAGS,
    // ── Séjour (état) ──
    { id: 'poids_ref',    label: 'Poids de référence (kg)', type: 'number', persistent: true,  category: 'info' },
    { id: 'alimentation', label: 'Mode alimentaire',         type: 'select', persistent: true,  category: 'info',
      options: ['Sein', 'Biberon', 'Mixte', 'NGT', 'Autonome'] },
    // ── Journalier ──
    { id: 'flacc',        label: 'Score douleur FLACC',     type: 'number', persistent: false, category: 'constante' },
    { id: 'accompagnant', label: 'Accompagnant présent',     type: 'boolean',persistent: false, category: 'observation' },
    { id: 'avq',        label: 'AVQ / Autonomie',     type: 'select',  persistent: true,  category: 'info',
      options: ['Parent', 'Aide IDE', 'Autonome'] },
    { id: 'constantes',   label: 'Constantes',               type: 'text',   persistent: false, category: 'constante' },
  ]},

  custom: { fields: [...COMMON_FLAGS] },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTemplateFields(specialtyId) {
  const tpl = TEMPLATES[specialtyId] || TEMPLATES.custom;
  return tpl.fields.map(f => ({ ...f, options: f.options ? [...f.options] : undefined }));
}

export function getSpecialty(id) {
  return SPECIALTIES.find(s => s.id === id) || SPECIALTIES[SPECIALTIES.length - 1];
}

/**
 * Retourne une liste alphabétique dédupliquée de tous les champs
 * de toutes les spécialités — pour la sélection de centres d'intérêt
 */
export function getAllFieldsAlpha() {
  const seen   = new Set();
  const result = [];
  for (const tpl of Object.values(TEMPLATES)) {
    for (const f of tpl.fields) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        result.push({ ...f, options: f.options ? [...f.options] : undefined });
      }
    }
  }
  // Tri alphabétique en ignorant les emojis
  return result.sort((a, b) => {
    const la = a.label.replace(/[^\w\s]/gu, '').trim();
    const lb = b.label.replace(/[^\w\s]/gu, '').trim();
    return la.localeCompare(lb, 'fr');
  });
}
