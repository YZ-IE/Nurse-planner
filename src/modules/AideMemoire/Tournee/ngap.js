/**
 * ngap.js — Nomenclature NGAP infirmiers libéraux (données statiques)
 * Valeurs lettre-clé indicatives — vérifier les avenants CPAM en vigueur.
 * Source : NGAP titre XVI (actes infirmiers).
 */

// Valeur d'une unité de chaque lettre-clé (€)
export const LETTER_VALUES = {
  AMI: 3.86,  // Acte Médico-Infirmier
  AIS: 2.65,  // Acte Infirmier de Soins (nursing)
};

export const ACTES = [
  // ── Soins courants ──────────────────────────────────────────────────────────
  { id: 'const',   cat: 'Soins',      label: 'Constantes / Surveillance',          code: 'AMI', coeff: 1   },
  { id: 'glyc',    cat: 'Soins',      label: 'Glycémie capillaire',                code: 'AMI', coeff: 1   },
  { id: 'meds',    cat: 'Soins',      label: 'Administration médicaments + surv.', code: 'AMI', coeff: 1   },
  { id: 'prelev',  cat: 'Soins',      label: 'Prélèvement sanguin veineux',        code: 'AMI', coeff: 1.5 },
  { id: 'sonde',   cat: 'Soins',      label: 'Soins sonde urinaire',               code: 'AMI', coeff: 1   },
  { id: 'stomie',  cat: 'Soins',      label: 'Soins de stomie',                    code: 'AMI', coeff: 2   },
  // ── Injections ──────────────────────────────────────────────────────────────
  { id: 'inj_sc',  cat: 'Injections', label: 'Injection sous-cutanée',            code: 'AMI', coeff: 1   },
  { id: 'inj_im',  cat: 'Injections', label: 'Injection intramusculaire',          code: 'AMI', coeff: 1   },
  { id: 'inj_iv',  cat: 'Injections', label: 'Injection IV directe',              code: 'AMI', coeff: 2   },
  { id: 'perf',    cat: 'Injections', label: 'Perfusion IV (séance)',              code: 'AMI', coeff: 4   },
  // ── Pansements ──────────────────────────────────────────────────────────────
  { id: 'pst_s',   cat: 'Pansements', label: 'Pansement simple',                  code: 'AMI', coeff: 1   },
  { id: 'pst_c',   cat: 'Pansements', label: 'Pansement complexe / plaie chron.', code: 'AMI', coeff: 2   },
  { id: 'pst_e',   cat: 'Pansements', label: 'Pansement escarre / ulcère',        code: 'AMI', coeff: 3   },
  // ── Nursing AIS ─────────────────────────────────────────────────────────────
  { id: 'ais1',    cat: 'Nursing',    label: 'AIS 1 — Nursing léger (GIR 5-6)',   code: 'AIS', coeff: 1.5 },
  { id: 'ais2',    cat: 'Nursing',    label: 'AIS 2 — Nursing moyen (GIR 3-4)',   code: 'AIS', coeff: 2   },
  { id: 'ais3',    cat: 'Nursing',    label: 'AIS 3 — Nursing lourd (GIR 2)',     code: 'AIS', coeff: 3   },
  { id: 'ais4',    cat: 'Nursing',    label: 'AIS 4 — Nursing très lourd (GIR 1)',code: 'AIS', coeff: 3.5 },
];

export const MAJORATIONS = [
  { id: 'mci',  label: 'MCI — Coordination IDE',        flat: 3.65  },
  { id: 'dim',  label: 'Dimanche / Jour férié',          flat: 15.75 },
  { id: 'mau',  label: 'MAU — Urgence nuit (20h-6h)',   factor: 1.5 },
  { id: 'mie',  label: 'MIE — Enfant < 7 ans',          flat: 3.65  },
];

/** Calcule le total d'une visite en € */
export function calcVisitTotal(actesFaits = [], majorations = [], lv = LETTER_VALUES) {
  const base = actesFaits.reduce((s, a) => s + (lv[a.code] ?? 0) * a.coeff * (a.qty ?? 1), 0);
  let total = base;
  for (const m of majorations) {
    if (m.factor) total += base * (m.factor - 1);
    if (m.flat)   total += m.flat;
  }
  return Math.round(total * 100) / 100;
}

export const CATS = [...new Set(ACTES.map(a => a.cat))];
