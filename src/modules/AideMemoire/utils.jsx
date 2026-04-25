/**
 * utils.js — Aide-Mémoire
 * Helpers partagés et composant FieldInput
 */

import { T, s } from '../../theme.js';

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
  if (field.type === 'boolean') return value === true;
  if (field.type === 'text')   return String(value).trim().length > 0;
  if (field.type === 'select') return String(value).trim().length > 0;
  return false;
}

// ─── Composant FieldInput ────────────────────────────────────────────────────

/**
 * Rendu adaptatif selon field.type
 * compact=true → version réduite pour QuickEntry
 */
export function FieldInput({ field, value, onChange, accentColor, compact = false }) {
  const C   = accentColor;
  const val = (value !== undefined && value !== null) ? value
    : (field.type === 'boolean' ? false : '');

  // ── Boolean ──────────────────────────────────────────────────────────────
  if (field.type === 'boolean') {
    const active = val === true;
    return (
      <button
        onClick={() => onChange(!active)}
        style={{
          background:  active ? C + '33' : T.surface,
          border:      `1px solid ${active ? C : T.border}`,
          borderRadius: 8,
          color:       active ? C : T.muted,
          fontSize:    compact ? 12 : 14,
          fontWeight:  active ? 700 : 400,
          padding:     compact ? '4px 10px' : '7px 14px',
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
            borderRadius:  7,
            color:         val ? C : T.muted,
            fontSize:      12,
            padding:       '4px 8px',
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
                borderRadius: 8,
                color:       active ? C : T.text,
                fontSize:    13,
                fontWeight:  active ? 700 : 400,
                padding:     '6px 12px',
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
          boxSizing: 'border-box',
          textAlign: 'center',
          fontSize:  compact ? 13 : 15,
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
        boxSizing: 'border-box',
        fontSize:  compact ? 13 : 15,
      }}
    />
  );
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
