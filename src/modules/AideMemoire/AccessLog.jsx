/**
 * AccessLog.jsx — Aide-Mémoire
 * Journal d'accès consultable et exportable (DPO)
 * Conformité : traçabilité RGPD/HDS art. L.1111-8
 */

import { useState } from 'react';
import { T } from '../../theme.js';

const ACCENT = '#6366f1';

const LOG_KEY = 'am_accesslog';

function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

export function appendLog(event, detail = '') {
  try {
    const entries = readLog();
    entries.unshift({
      ts:     Date.now(),
      date:   new Date().toLocaleString('fr-FR'),
      event,
      detail,
    });
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, 200)));
  } catch {}
}

export function clearLog() {
  localStorage.removeItem(LOG_KEY);
}

const EVENT_META = {
  LOGIN_OK:        { label: 'Connexion réussie',         color: '#22c55e' },
  LOGIN_FAIL:      { label: 'Échec de connexion',        color: '#f97316' },
  LOGOUT:          { label: 'Déconnexion',               color: '#6366f1' },
  LOCKOUT:         { label: 'Verrouillage',              color: '#ef4444' },
  SESSION_EXPIRED: { label: 'Session expirée',           color: '#f97316' },
  SETUP:           { label: 'Mot de passe créé',         color: '#6366f1' },
  CONSENT:         { label: 'Consentement enregistré',   color: '#22c55e' },
  EXPORT_TEXT:     { label: 'Export texte confirmé',     color: '#f97316' },
  TRANSFER_EXPORT: { label: 'Transfert exporté',         color: '#06b6d4' },
  TRANSFER_IMPORT: { label: 'Transfert importé',         color: '#06b6d4' },
  IMPORT_TRANSMISSION: { label: 'Import photo transmission', color: '#22c55e' },
  ERASE_PATIENT:   { label: 'Effacement patient (art. 17)', color: '#f43f5e' },
  PURGE:           { label: 'Purge données',             color: '#a78bfa' },
};

function meta(event) {
  return EVENT_META[event] || { label: event, color: '#64748b' };
}

export default function AccessLog({ onBack }) {
  const [logs,    setLogs]    = useState(() => readLog());
  const [filter,  setFilter]  = useState('all');
  const [copied,  setCopied]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  const eventTypes = ['all', ...Object.keys(EVENT_META)];

  const filtered = filter === 'all'
    ? logs
    : logs.filter(l => l.event === filter);

  async function handleExport() {
    const lines = [
      'JOURNAL D\'ACCÈS — InfirmierPro',
      `Exporté le : ${new Date().toLocaleString('fr-FR')}`,
      `Nombre d\'entrées : ${logs.length}`,
      '─'.repeat(50),
      '',
      ...logs.map(l => `[${l.date}] ${l.event}${l.detail ? ' — ' + l.detail : ''}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  }

  function handleClear() {
    clearLog();
    setLogs([]);
    setConfirm(false);
  }

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📋 Journal d'accès</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{logs.length} événement(s) · Conformité RGPD/HDS</div>
          </div>
          <button onClick={handleExport}
            style={{ background: copied ? '#22c55e22' : ACCENT + '22', border: `1px solid ${copied ? '#22c55e' : ACCENT}`, borderRadius: 8, color: copied ? '#22c55e' : ACCENT, fontSize: 12, padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}>
            {copied ? '✅ Copié' : '📋 Exporter'}
          </button>
        </div>

        {/* Filtre */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {['all', 'LOGIN_OK', 'LOGIN_FAIL', 'LOCKOUT', 'SESSION_EXPIRED', 'EXPORT_TEXT', 'TRANSFER_EXPORT', 'TRANSFER_IMPORT', 'IMPORT_TRANSMISSION', 'ERASE_PATIENT', 'PURGE'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? ACCENT + '22' : T.surface, border: `1px solid ${filter === f ? ACCENT : T.border}`, borderRadius: 12, color: filter === f ? ACCENT : T.muted, fontSize: 11, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f === 'all' ? 'Tous' : meta(f).label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* Bandeau légal */}
        <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>ℹ️ Traçabilité des accès</div>
          <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5 }}>
            Ces logs sont stockés localement (200 entrées max, 30 jours). Ils permettent d'identifier les accès non autorisés. Communicable au DPO sur demande (RGPD / HDS art. L.1111-8).
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ color: T.muted, textAlign: 'center', padding: '40px 20px', fontSize: 13 }}>
            Aucun événement enregistré
          </div>
        )}

        {filtered.map((log, i) => {
          const m = meta(log.event);
          return (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${m.color}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: log.detail ? 4 : 0 }}>
                <span style={{ color: m.color, fontWeight: 700, fontSize: 12 }}>{m.label}</span>
                <span style={{ color: T.muted, fontFamily: 'monospace', fontSize: 11 }}>{log.date}</span>
              </div>
              {log.detail && <div style={{ color: T.muted, fontSize: 11 }}>{log.detail}</div>}
            </div>
          );
        })}

        {/* Effacement */}
        {logs.length > 0 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            {!confirm ? (
              <button onClick={() => setConfirm(true)}
                style={{ background: 'none', border: '1px solid #f43f5e44', borderRadius: 8, color: '#f43f5e', fontSize: 12, padding: '8px 16px', cursor: 'pointer' }}>
                🗑 Effacer le journal
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setConfirm(false)}
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={handleClear}
                  style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 8, color: '#f43f5e', fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>
                  Confirmer l'effacement
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
