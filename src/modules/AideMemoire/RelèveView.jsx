/**
 * RelèveView.jsx — Génération de la relève structurée
 * Affichage in-app uniquement — aucun export (secret professionnel).
 */

import { useMemo } from 'react';
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

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RelèveView({ service, patients, dailyData, onClose }) {
  const text = useMemo(
    () => buildRelève(service, patients.filter(p => p.present), dailyData),
    [service, patients, dailyData]
  );

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

      {/* Texte */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 32px' }}>
        <pre style={{
          fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
          color: T.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '14px 14px', margin: 0,
        }}>
          {text}
        </pre>
      </div>
    </div>
  );
}
