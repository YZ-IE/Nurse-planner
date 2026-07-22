/**
 * ConsentScreen.jsx — Aide-Mémoire
 * Affiché UNE SEULE FOIS au premier lancement.
 * Obligations légales couvertes :
 *   · Notice d'information RGPD art. 13 (identité RT, finalité, base légale,
 *     catégories de données, durée de conservation, droits des personnes)
 *   · Consentement explicite du soignant utilisateur (art. 6.1.a RGPD)
 *   · Rappel secret professionnel (art. R.4311-5 CSP)
 */

import { useState } from 'react';
import { T, s } from '../../theme.js';

export const CONSENT_KEY = 'am_consent_v3';

export function isConsentGiven() {
  try { return !!localStorage.getItem('am_consent_v3'); } catch { return false; }
}

function saveConsent() {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({
    date:    new Date().toISOString(),
    version: 3,
  }));
}

const ACCENT = '#6366f1';

// ─── Sections de la notice ────────────────────────────────────────────────────

const SECTIONS = [
  {
    icon: '🏥',
    title: 'Responsable du traitement',
    content: "Vous, en tant que professionnel de santé utilisant InfirmierPro sur votre appareil personnel. L'application ne communique avec aucun serveur — vous êtes le seul responsable des données saisies.",
  },
  {
    icon: '🎯',
    title: 'Finalité du traitement',
    content: "Aide à la prise en charge clinique au quotidien : organisation des soins, suivi des patients, transmissions structurées. Aucune finalité commerciale, statistique ou de recherche.",
  },
  {
    icon: '⚖️',
    title: 'Base légale (RGPD art. 9.2.h)',
    content: "Traitement nécessaire aux fins de soins de santé par un professionnel de santé soumis au secret professionnel (Code de la santé publique art. R.4311-5).",
  },
  {
    icon: '📋',
    title: 'Catégories de données traitées',
    content: "Données de santé pseudonymisées : initiales, âge, sexe, motif d'hospitalisation, antécédents, constantes vitales, soins planifiés. Aucun nom, numéro de sécurité sociale ou identifiant national n'est enregistré — y compris lors de l'import par photo (voir ci-dessous).",
  },
  {
    icon: '📷',
    title: 'Import de feuille de transmission par photo',
    content: "Vous pouvez photographier une feuille de transmission papier (ou choisir une photo depuis votre galerie) pour pré-remplir chambre/âge/motif. La reconnaissance de texte s'exécute entièrement sur votre appareil (aucun serveur, aucun cloud) : une photo prise depuis l'app est supprimée immédiatement après l'extraction du texte ; une photo choisie dans votre galerie n'est ni copiée ni modifiée, seulement lue. Dans tous les cas, l'image elle-même n'est jamais enregistrée par l'app. Le nom complet éventuellement lu par la reconnaissance de texte n'est jamais stocké : seules des initiales, que vous validez, sont conservées. Aucune donnée n'est écrite avant votre validation explicite ligne par ligne, et les patients déjà suivis absents de la photo ne sont jamais supprimés automatiquement.",
  },
  {
    icon: '🗓️',
    title: 'Durée de conservation',
    content: "Données journalières : conservées 24h (effacées au reset quotidien). Données patient : jusqu'à la sortie du patient. Depuis la fiche d'un patient, le bouton « Supprimer définitivement ses données » efface immédiatement et irréversiblement sa fiche, son historique journalier et ses photos de plaies (droit à l'effacement, art. 17) — distinct de la simple sortie, qui conserve l'historique.",
  },
  {
    icon: '🔒',
    title: 'Sécurité',
    content: "Chiffrement AES-256-GCM des données patients. Accès protégé par PIN avec verrouillage après 5 tentatives, et par déverrouillage biométrique si activé. Timeout automatique après 5 min d'inactivité — pensez à activer le verrouillage automatique de votre appareil en complément. Aucune donnée (y compris les photos importées) n'est transmise sur le réseau.",
  },
  {
    icon: '👤',
    title: 'Droits des personnes concernées',
    content: "Les patients ont le droit d'accéder à leurs données (art. 15), de les rectifier (art. 16), d'en demander l'effacement (art. 17) et d'en obtenir la portabilité (art. 20). Ces droits s'exercent auprès de vous directement, en tant que responsable du traitement.",
  },
  {
    icon: '📣',
    title: 'Réclamation CNIL (art. 13.2.d)',
    content: "Si vous estimez que le traitement de données ne respecte pas la réglementation, vous pouvez déposer une réclamation auprès de la CNIL : www.cnil.fr — 3 Place de Fontenoy, 75007 Paris.",
  },
  {
    icon: '📧',
    title: 'Contact éditeur',
    content: "Pour exercer vos droits : [EMAIL_EDITEUR_A_COMPLETER]. En cas de violation de données, notification CNIL dans les 72h (art. 33 RGPD).",
  },
  {
    icon: '🔐',
    title: 'Secret professionnel',
    content: "Les données saisies sont couvertes par le secret professionnel. Leur partage est soumis aux règles déontologiques et ne peut se faire que via des canaux sécurisés et avec des professionnels habilités.",
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ConsentScreen({ onAccepted }) {
  const [expanded,  setExpanded]  = useState(null);
  const [checked1,  setChecked1]  = useState(false); // lu et compris
  const [checked2,  setChecked2]  = useState(false); // secret professionnel
  const [checked3,  setChecked3]  = useState(false); // responsabilité données

  const canProceed = checked1 && checked2 && checked3;

  function handleAccept() {
    if (!canProceed) return;
    saveConsent();
    onAccepted();
  }

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: T.surface2, padding: '20px 16px 16px', borderBottom: '1px solid #1e3a5f' }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>📋</div>
        <div style={{ color: T.text, fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
          Informations légales
        </div>
        <div style={{ color: T.muted, fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
          À lire avant d'utiliser InfirmierPro · RGPD art. 13
        </div>
      </div>

      <div style={{ padding: '16px 16px 120px' }}>

        {/* Bandeau intro */}
        <div style={{ background: T.border, border: '1px solid #2563eb44', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Notice d'information — Traitement de données de santé
          </div>
          <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
            InfirmierPro traite des données de santé à caractère personnel. Conformément au RGPD (art. 13), vous devez être informé des conditions de ce traitement avant toute utilisation.
          </div>
        </div>

        {/* Sections accordéon */}
        {SECTIONS.map((sec, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${expanded === i ? ACCENT + '66' : T.border}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{sec.icon}</span>
              <span style={{ color: T.text, fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'left' }}>{sec.title}</span>
              <span style={{ color: T.muted, fontSize: 16, flexShrink: 0 }}>{expanded === i ? '▲' : '▼'}</span>
            </button>
            {expanded === i && (
              <div style={{ padding: '0 14px 14px 42px', color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
                {sec.content}
              </div>
            )}
          </div>
        ))}

        {/* Références légales */}
        <div style={{ background: T.bg, border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 6 }}>RÉFÉRENCES LÉGALES</div>
          {[
            'RGPD (UE) 2016/679 — art. 6, 9, 13, 15-17, 20, 25, 32, 33-34, 77',
            'Loi Informatique et Libertés n°78-17',
            'CSP art. R.4311-5 — Rôle propre infirmier',
            'CSP art. L.1111-8 — Hébergement données de santé',
            'Recommandation CNIL applications mobiles — 8 avril 2025',
            'PGSSI-S — Politique Générale de Sécurité des SI de Santé',
          ].map((ref, i) => (
            <div key={i} style={{ color: '#475569', fontSize: 11, marginBottom: 3 }}>· {ref}</div>
          ))}
        </div>

        {/* Cases à cocher consentement */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
          <div style={{ color: T.text, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            Attestations requises
          </div>

          {[
            {
              key: 'c1', checked: checked1, set: setChecked1,
              text: "J'ai lu et compris les informations ci-dessus relatives au traitement de données de santé par InfirmierPro.",
            },
            {
              key: 'c2', checked: checked2, set: setChecked2,
              text: "Je m'engage à respecter le secret professionnel dans l'utilisation de cette application et à n'y saisir que des données pseudonymisées.",
            },
            {
              key: 'c3', checked: checked3, set: setChecked3,
              text: "Je reconnais être responsable des données saisies sur mon appareil et m'engage à les supprimer à l'issue de la prise en charge de chaque patient.",
            },
          ].map(({ key, checked, set, text }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, cursor: 'pointer' }}>
              <div
                onClick={() => set(v => !v)}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: checked ? ACCENT : 'transparent',
                  border: `2px solid ${checked ? ACCENT : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {checked && <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ color: T.muted, fontSize: 13, lineHeight: 1.5 }}>{text}</span>
            </label>
          ))}
        </div>

        {/* Bouton */}
        <button
          onClick={handleAccept}
          disabled={!canProceed}
          style={{
            ...s.btn(canProceed ? ACCENT : T.border),
            width: '100%', padding: '14px',
            fontSize: 15, fontWeight: 700,
            opacity: canProceed ? 1 : 0.45,
            transition: 'all 0.2s',
          }}
        >
          {canProceed ? '✅ Accepter et continuer' : 'Cochez les 3 cases pour continuer'}
        </button>

        <div style={{ color: T.border, fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Ce consentement est enregistré localement sur votre appareil.{'\n'}
          Version 3 · {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
