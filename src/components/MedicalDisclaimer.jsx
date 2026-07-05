/**
 * MedicalDisclaimer.jsx
 * Conformité MDR Intended Purpose / Déontologie infirmière / CSP R.4311
 * level="calcul"   → danger, modules dose/opioïdes/pédiatrie
 * level="standard" → warning, scores et protocoles
 */
import { Banner } from '../ui/index.js';

export function MedicalDisclaimer({ level = 'standard' }) {
  if (level === 'calcul') return (
    <Banner kind="danger" icon="🚨">
      Outil de vérification — Tout résultat doit être confronté à la prescription médicale avant administration. En cas de doute, consulter le médecin ou le pharmacien.
    </Banner>
  );
  return (
    <Banner kind="warning" icon="⚠️">
      Outil d'aide à l'exercice professionnel — Ne se substitue pas au jugement clinique ni à la prescription médicale. Toujours vérifier avec les protocoles de l'établissement.
    </Banner>
  );
}
