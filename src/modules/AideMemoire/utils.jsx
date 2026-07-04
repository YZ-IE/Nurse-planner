/**
 * utils.js — Aide-Mémoire
 * Helpers partagés et composant FieldInput
 */

import { useState } from 'react';
import { T, s, tk } from '../../theme.js';

// ─── Date / heure ────────────────────────────────────────────────────────────

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function timeStr() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateFR(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── ID unique ───────────────────────────────────────────────────────────────

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Flags ───────────────────────────────────────────────────────────────────

/** Retourne true si un champ de type 'flag' a une valeur active */
export function isFlagActive(field, value) {
  if (value === undefined || value === null || value === '') return false;
  if (field.type === 'boolean')  return value === true;
  if (field.type === 'text')     return String(value).trim().length > 0;
  if (field.type === 'textarea') return String(value).trim().length > 0;
  if (field.type === 'select')   return String(value).trim().length > 0;
  if (field.type === 'list')     return Array.isArray(value) && value.length > 0;
  return false;
}

// ─── ListFieldInput ──────────────────────────────────────────────────────────

function ListFieldInput({ value, onChange, accentColor }) {
  const [draft, setDraft] = useState('');
  const C     = accentColor;
  const items = Array.isArray(value) ? value : (value ? [String(value)] : []);

  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, t]);
    setDraft('');
  }
  function remove(i) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ flex: 1, color: T.text, fontSize: tk.font.sm, background: T.bg, borderRadius: 8, padding: '9px 12px', border: `1px solid ${T.border}` }}>
            {item}
          </span>
          <button onClick={() => remove(i)} aria-label="Retirer"
            style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
            ×
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ajouter…"
          style={{ ...s.input, flex: 1, boxSizing: 'border-box', fontSize: tk.font.sm, height: tk.touch.min }}
        />
        <button onClick={add} disabled={!draft.trim()}
          style={{ background: C + '33', border: `1px solid ${C}44`, borderRadius: tk.radius.md, color: C, fontSize: 22, width: tk.touch.min, height: tk.touch.min, flexShrink: 0, cursor: 'pointer', opacity: draft.trim() ? 1 : 0.4, WebkitTapHighlightColor: 'transparent' }}>
          +
        </button>
      </div>
    </div>
  );
}

// ─── Composant FieldInput ────────────────────────────────────────────────────

/**
 * Rendu adaptatif selon field.type
 * compact=true → version réduite pour QuickEntry
 */
export function FieldInput({ field, value, onChange, accentColor, compact = false }) {
  const C   = accentColor;
  const val = (value !== undefined && value !== null) ? value
    : (field.type === 'boolean' ? false : field.type === 'list' ? [] : '');

  // ── Boolean ──────────────────────────────────────────────────────────────
  if (field.type === 'boolean') {
    const active = val === true;
    return (
      <button
        onClick={() => onChange(!active)}
        style={{
          background:  active ? C + '33' : T.surface,
          border:      `1px solid ${active ? C : T.border}`,
          borderRadius: tk.radius.sm,
          color:       active ? C : T.muted,
          fontSize:    compact ? tk.font.sm : tk.font.base,
          fontWeight:  active ? 700 : 400,
          height:      compact ? tk.touch.compact : tk.touch.min,
          padding:     compact ? '0 12px' : '0 16px',
          cursor:      'pointer',
          transition:  'all 0.15s',
          WebkitTapHighlightColor: 'transparent',
          whiteSpace:  'nowrap',
        }}
      >
        {active ? '✓ Oui' : 'Non'}
      </button>
    );
  }

  // ── Select ───────────────────────────────────────────────────────────────
  if (field.type === 'select') {
    const opts = field.options || [];

    if (compact) {
      // Mode compact : cycle sur tap
      const idx  = opts.indexOf(val);
      const next = () => onChange(idx === -1 ? opts[0] : opts[(idx + 1) % opts.length]);
      return (
        <button
          onClick={next}
          style={{
            background:    val ? C + '22' : T.surface,
            border:        `1px solid ${val ? C : T.border}`,
            borderRadius:  tk.radius.sm,
            color:         val ? C : T.muted,
            fontSize:      tk.font.sm,
            height:        tk.touch.compact,
            padding:       '0 10px',
            cursor:        'pointer',
            maxWidth:      140,
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {val || '—'}
        </button>
      );
    }

    // Mode complet : boutons par option
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opts.map(opt => {
          const active = val === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(active ? '' : opt)}
              style={{
                background:  active ? C + '33' : T.surface,
                border:      `1px solid ${active ? C : T.border}`,
                borderRadius: tk.radius.sm,
                color:       active ? C : T.text,
                fontSize:    tk.font.base,
                fontWeight:  active ? 700 : 400,
                minHeight:   tk.touch.min,
                padding:     '0 16px',
                cursor:      'pointer',
                transition:  'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  if (field.type === 'list') {
    return <ListFieldInput value={val} onChange={onChange} accentColor={C} />;
  }

  // ── Textarea ─────────────────────────────────────────────────────────────
  if (field.type === 'textarea') {
    return (
      <textarea
        value={val}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        rows={3}
        style={{ ...s.input, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: compact ? tk.font.sm : tk.font.base, minHeight: 80, lineHeight: 1.5 }}
      />
    );
  }

  // ── Number ───────────────────────────────────────────────────────────────
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={val}
        onChange={e => onChange(e.target.value)}
        inputMode="numeric"
        style={{
          ...s.input,
          width:     compact ? 70 : 110,
          height:    compact ? tk.touch.compact : tk.touch.input,
          boxSizing: 'border-box',
          textAlign: 'center',
          fontSize:  compact ? tk.font.sm : tk.font.base,
        }}
      />
    );
  }

  // ── Text (défaut) ─────────────────────────────────────────────────────────
  return (
    <input
      type="text"
      value={val}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      style={{
        ...s.input,
        width:     compact ? 140 : '100%',
        height:    compact ? tk.touch.compact : tk.touch.input,
        boxSizing: 'border-box',
        fontSize:  compact ? tk.font.sm : tk.font.base,
      }}
    />
  );
}

// ─── Alertes constantes vitales ──────────────────────────────────────────────

const VITAL_THRESHOLDS = {
  ta: {
    label: 'TA',
    parse: v => {
      const m = String(v).match(/(\d+)\s*\/\s*(\d+)/);
      return m ? { sys: Number(m[1]), dia: Number(m[2]) } : null;
    },
    check: ({ sys, dia }) => {
      if (sys >= 180 || dia >= 110) return { level: 'critical', msg: `TA ${sys}/${dia} — HTA sévère` };
      if (sys >= 160 || dia >= 100) return { level: 'warning',  msg: `TA ${sys}/${dia} — HTA grade 2` };
      if (sys < 90  || dia < 60)   return { level: 'critical', msg: `TA ${sys}/${dia} — Hypotension` };
      return null;
    },
  },
  spo2: {
    label: 'SpO2',
    parse: v => { const n = parseFloat(v); return isNaN(n) ? null : n; },
    check: n => {
      if (n < 92) return { level: 'critical', msg: `SpO2 ${n}% — Désaturation sévère` };
      if (n < 95) return { level: 'warning',  msg: `SpO2 ${n}% — Désaturation` };
      return null;
    },
  },
  temp: {
    label: 'T°',
    parse: v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; },
    check: n => {
      if (n >= 39.5) return { level: 'critical', msg: `T° ${n}°C — Hyperthermie` };
      if (n >= 38.0) return { level: 'warning',  msg: `T° ${n}°C — Fièvre` };
      if (n < 36.0)  return { level: 'warning',  msg: `T° ${n}°C — Hypothermie` };
      return null;
    },
  },
  fc: {
    label: 'FC',
    parse: v => { const n = parseInt(v); return isNaN(n) ? null : n; },
    check: n => {
      if (n > 130 || n < 40) return { level: 'critical', msg: `FC ${n} bpm — Trouble du rythme` };
      if (n > 100 || n < 50) return { level: 'warning',  msg: `FC ${n} bpm — Tachycardie/bradycardie` };
      return null;
    },
  },
};

const HGT_THRESHOLD = {
  parse: v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; },
  check: n => {
    if (n > 3.0 || n < 0.5) return { level: 'critical', msg: `HGT ${n} g/L — Urgence glycémique` };
    if (n > 2.0 || n < 0.7) return { level: 'warning',  msg: `HGT ${n} g/L — Glycémie anormale` };
    return null;
  },
};

/**
 * Analyse les soins réalisés et retourne les alertes vitales actives.
 * @param {Array} careEntries - tableau de soins du jour
 * @returns {Array} alertes [{level:'critical'|'warning', msg:string}]
 */
export function parseVitalAlerts(careEntries) {
  if (!Array.isArray(careEntries)) return [];
  const alerts = [];

  for (const entry of careEntries) {
    if (!entry.done || !entry.doneValue) continue;

    if (entry.type === 'constantes_vitales') {
      // Format: "TA: 185/100 | SpO2: 98 | T°: 37.2 | FC: 72"
      const parts = entry.doneValue.split('|').map(s => s.trim());
      for (const part of parts) {
        for (const [key, thr] of Object.entries(VITAL_THRESHOLDS)) {
          const labelRE = new RegExp(`^${thr.label}[^:]*:\\s*(.+)$`, 'i');
          const m = part.match(labelRE);
          if (!m) continue;
          const parsed = thr.parse(m[1]);
          if (parsed === null) continue;
          const alert = thr.check(parsed);
          if (alert) alerts.push(alert);
        }
      }
    }

    if (entry.type === 'hgt') {
      const parsed = HGT_THRESHOLD.parse(entry.doneValue);
      if (parsed !== null) {
        const alert = HGT_THRESHOLD.check(parsed);
        if (alert) alerts.push(alert);
      }
    }
  }

  // Dédupliquer par message, prioriser critical
  const seen = new Map();
  for (const a of alerts) {
    if (!seen.has(a.msg) || a.level === 'critical') seen.set(a.msg, a);
  }
  return [...seen.values()].sort((a, b) => (a.level === 'critical' ? -1 : 1));
}

// ─── Constante visuelle d'un patient ─────────────────────────────────────────

/** Résume les flags actifs d'un patient sous forme d'emoji (max 4) */
export function activeFlagsEmoji(fields, persistentValues, dailyValues) {
  const flagFields = fields.filter(f => f.category === 'flag');
  return flagFields
    .filter(f => {
      const v = f.persistent
        ? persistentValues?.[f.id]
        : dailyValues?.[f.id];
      return isFlagActive(f, v);
    })
    .slice(0, 4)
    .map(f => f.label.split(' ')[0]); // emoji only
}

// ─── Helpers 72h ─────────────────────────────────────────────────────────────
export function dateStrOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function isReadOnly(dateStr) {
  // J et J-1 : modifiables. J-2 : lecture seule.
  return dateStr === dateStrOffset(-2);
}
export function formatDateLabel(dateStr) {
  const today = dateStrOffset(0);
  const yest  = dateStrOffset(-1);
  const d2    = dateStrOffset(-2);
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === yest)  return 'Hier';
  if (dateStr === d2)    return 'Avant-hier';
  return dateStr;
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', text, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 16px', color: T.muted }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: tk.font.base, fontWeight: 600, color: T.muted }}>{text}</div>
      {sub && <div style={{ fontSize: tk.font.sm, marginTop: 4, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}
