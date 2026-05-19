/**
 * RelèveView.jsx — Génération de la relève structurée
 * Données couvertes par le secret professionnel — affichage in-app uniquement.
 * Pas de partage externe ; copie presse-papiers sur confirmation explicite.
 */

import { useState, useMemo } from 'react';
import { T } from '../../theme.js';
import { getCareType } from './careTypes.js';
import { computeSlots } from './ServiceView.jsx';
import { parseVitalAlerts } from './utils.jsx';
import { getSpecialty } from './templates.js';

// ─── Génération du texte ──────────────────────────────────────────────────────

function buildRelève(service, patients, dailyData) {
  const slots = computeSlots(service);
  const slotLabel = Object.fromEntries(slots.map(s => [s.slotIndex, s.roomLabel]));
  const sp = getSpecialty(service.specialty);

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const lines = [];
  lines.push(`╔═══ RELÈVE — ${service.name.toUpperCase()} ═══╗`);
  lines.push(`${dateStr}  ${timeStr}`);
  lines.push(`${sp.label} · ${patients.length} patient${patients.length > 1 ? 's' : ''}`);
  lines.push('');

  const sorted = [...patients].sort((a, b) => {
    const la = slotLabel[a.bedNumber] || String(a.bedNumber);
    const lb = slotLabel[b.bedNumber] || String(b.bedNumber);
    return la.localeCompare(lb, 'fr', { numeric: true });
  });

  for (const pt of sorted) {
    const daily = dailyData[pt.id] || {};
    const care = daily.careEntries || [];
    const events = daily.events || [];
    const obs = (daily.observations || '').trim();
    const bed = slotLabel[pt.bedNumber] || `?${pt.bedNumber}`;

    lines.push(`─────────────────────────`);
    lines.push(`🛏 Lit ${bed}  ${pt.initials}  ${pt.gender === 'F' ? '♀' : '♂'} ${pt.age}a`);

    if (pt.admissionReason) lines.push(`   Motif : ${pt.admissionReason}`);
    if (pt.atcd)            lines.push(`   ATCD  : ${pt.atcd}`);

    const alerts = parseVitalAlerts(care);
    for (const a of alerts) {
      lines.push(`   ${a.level === 'critical' ? '🔴' : '🟠'} ${a.msg}`);
    }

    const done = care.filter(e => e.done);
    if (done.length > 0) {
      const doneText = done.map(e => {
        const ct = getCareType(e.type);
        const val = e.doneValue ? ` (${e.doneValue})` : '';
        return `${ct.emoji} ${e.label}${val} ✓ ${e.doneTime || ''}`;
      }).join('  ·  ');
      lines.push(`   Réalisés : ${doneText}`);
    }

    const pending = care.filter(e => !e.done);
    if (pending.length > 0) {
      const pendText = pending.map(e => {
        const ct = getCareType(e.type);
        return `${ct.emoji} ${e.label} ${e.plannedTime}`;
      }).join('  ·  ');
      lines.push(`   En attente : ${pendText}`);
    }

    if (events.length > 0) {
      for (const ev of events) {
        const who = ev.who ? ` — ${ev.who}` : '';
        lines.push(`   📌 ${ev.time || ''} ${ev.text}${who}`);
      }
    }

    if (obs) lines.push(`   💬 ${obs}`);
    lines.push('');
  }

  lines.push(`╚═══════════════════════════╝`);
  return lines.join('\n');
}

// ─── Modal de confirmation avant copie ────────────────────────────────────────

function CopyWarningModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '0 24px' }}>
      <div style={{ background: T.surface, borderRadius: 14, padding: '24px 20px', width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>
          Données couvertes par le secret professionnel
        </div>
        <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
          Le presse-papiers est accessible à d'autres applications installées sur cet appareil.
          Ne copiez cette relève que sur un équipement professionnel sécurisé,
          dans le cadre d'une transmission interne uniquement.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '12px', background: '#f9731622', border: '1px solid #f9731644', borderRadius: 10, color: '#f97316', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Copier quand même
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RelèveView({ service, patients, dailyData, onClose }) {
  const text = useMemo(
    () => buildRelève(service, patients.filter(p => p.present), dailyData),
    [service, patients, dailyData]
  );

  const [copied,      setCopied]      = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch { /* navigateur sans accès clipboard */ }
    setShowWarning(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>📋 Relève structurée</div>
          <div style={{ color: T.muted, fontSize: 12 }}>{service.name} · {patients.filter(p => p.present).length} patients</div>
        </div>
      </div>

      {/* Bandeau confidentialité */}
      <div style={{ background: '#f9731614', borderBottom: '1px solid #f9731633', padding: '8px 16px', display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔒</span>
        <span style={{ color: '#f97316', fontSize: 12, lineHeight: 1.5 }}>
          <strong>Secret professionnel</strong> — Consultation in-app uniquement.
          Ne transmettez pas cette relève par messagerie externe ou SMS.
        </span>
      </div>

      {/* Texte */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <pre style={{
          fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
          color: T.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '14px 14px', margin: 0,
        }}>
          {text}
        </pre>
      </div>

      {/* Action : copie uniquement, avec confirmation */}
      <div style={{ padding: '12px 16px 36px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <button
          onClick={() => copied ? null : setShowWarning(true)}
          style={{
            width: '100%', padding: '13px',
            background: copied ? '#22c55e22' : T.surface,
            border: `1px solid ${copied ? '#22c55e' : T.border}`,
            borderRadius: 12,
            color: copied ? '#22c55e' : T.text,
            fontSize: 14, fontWeight: 700, cursor: copied ? 'default' : 'pointer',
          }}>
          {copied ? '✓ Copié dans le presse-papiers' : '📋 Copier (usage interne uniquement)'}
        </button>
      </div>

      {showWarning && (
        <CopyWarningModal
          onConfirm={doCopy}
          onCancel={() => setShowWarning(false)}
        />
      )}
    </div>
  );
}
