// ─── Thème global N-Planr — Dual Mode (Light + Dark) ─────────────────────────
// ⚠️ Toutes les clés héritées sont conservées (surface2, border2, *Dim, s.result, s.tag)
//    car elles sont utilisées par les modules non encore migrés.
//
// Usage :
//   import { getTheme, s } from './theme.js';
//   const T = getTheme(isDark);          // ← dans les composants
//
// Pour compatibilité héritage (modules non migrés) :
//   import { T } from './theme.js';      // ← export statique = mode dark par défaut
//
// La préférence est stockée dans localStorage sous la clé 'nplanr_dark'.

// ─── Palettes ─────────────────────────────────────────────────────────────────

const LIGHT = {
  bg:       '#F0F3F8',
  surface:  '#FFFFFF',
  surface2: '#F8FAFD',
  border:   '#E4E9F2',
  border2:  '#C8D3E5',
  text:     '#0D1117',
  muted:    '#8D97A8',

  iatr:     '#F43F5E',
  urg:      '#FF5A35',
  score:    '#7C6FF7',
  soins:    '#0099E6',
  orga:     '#1DB96A',
  form:     '#F59E0B',
  ia:       '#38BDF8',

  iatrDim:  '#FFF1F4',
  urgDim:   '#FFF2EE',
  scoreDim: '#F3F2FF',
  soinsDim: '#EAF6FF',
  orgaDim:  '#EDFAF4',
  formDim:  '#FFFBEA',
  iaDim:    '#EAF7FF',
};

const DARK = {
  bg:       '#0D1117',
  surface:  '#161C26',
  surface2: '#1C2333',
  border:   '#232D3F',
  border2:  '#2E3D55',
  text:     '#F0F4FA',
  muted:    '#5A6880',

  iatr:     '#F43F5E',
  urg:      '#FF6B47',
  score:    '#8B7FF8',
  soins:    '#38B6FF',
  orga:     '#2DD47A',
  form:     '#FBBF24',
  ia:       '#38BDF8',

  iatrDim:  '#1F0A10',
  urgDim:   '#1F0E08',
  scoreDim: '#12102A',
  soinsDim: '#08182A',
  orgaDim:  '#071A10',
  formDim:  '#1C1404',
  iaDim:    '#081824',
};

// ─── Getter dynamique ──────────────────────────────────────────────────────────
export function getTheme(dark) {
  return dark ? DARK : LIGHT;
}

// ─── Export statique héritage (modules non migrés) ────────────────────────────
// Renvoie le dark par défaut pour ne pas casser les anciens modules.
export const T = DARK;

// ─── Helper persistance préférence ────────────────────────────────────────────
export function loadDarkPref() {
  try { return localStorage.getItem('nplanr_dark') === 'true'; } catch { return false; }
}
export function saveDarkPref(val) {
  try { localStorage.setItem('nplanr_dark', val ? 'true' : 'false'); } catch {}
}

// ─── Styles communs (dynamiques) ──────────────────────────────────────────────
export function makeStyles(dark) {
  const TH = getTheme(dark);
  return {
    card: {
      background: TH.surface,
      border: `1px solid ${TH.border}`,
      borderRadius: 16,
      padding: '14px',
      marginBottom: 10,
      boxShadow: dark ? 'none' : '0 2px 14px rgba(0,0,0,0.05)',
    },
    label: {
      display: 'block',
      color: TH.muted,
      fontSize: 11,
      fontFamily: 'monospace',
      letterSpacing: 1.2,
      marginBottom: 5,
      textTransform: 'uppercase',
    },
    input: {
      width: '100%',
      background: TH.bg,
      border: `1px solid ${TH.border}`,
      borderRadius: 12,
      padding: '9px 12px',
      color: TH.text,
      fontSize: 13,
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
    result: (color) => ({
      background: color + '18',
      border: `1px solid ${color}35`,
      borderRadius: 12,
      padding: '12px 16px',
      marginTop: 12,
    }),
    tag: (color) => ({
      background: color + '20',
      border: `1px solid ${color}35`,
      color,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontFamily: 'monospace',
    }),
    btn: (color) => ({
      background: color,
      border: 'none',
      color: '#FFFFFF',
      borderRadius: 10,
      padding: '8px 14px',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s',
    }),
  };
}

// ─── Export s statique héritage ───────────────────────────────────────────────
export const s = makeStyles(true);
