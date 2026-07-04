/**
 * Btn — bouton standard du kit UI.
 * variant : solid | soft | outline | ghost
 * size    : lg (52px, action principale) | md (48px) | sm (40px)
 */

import { T, tk } from '../theme.js';

const HEIGHTS = { lg: tk.touch.primary, md: tk.touch.min, sm: tk.touch.compact };
const FONTS   = { lg: tk.font.md, md: tk.font.base, sm: tk.font.sm };

export default function Btn({
  children, color, variant = 'solid', size = 'md',
  full = false, icon = null, disabled = false, onClick, style = {},
}) {
  const c = color || T.info;
  const h = HEIGHTS[size] || HEIGHTS.md;

  const base = {
    solid:   { background: c,        border: 'none',                color: '#FFFFFF' },
    soft:    { background: c + '1A', border: `1px solid ${c}33`,    color: c },
    outline: { background: 'none',   border: `1.5px solid ${c}`,    color: c },
    ghost:   { background: 'none',   border: 'none',                color: c },
  }[variant] || {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...base,
        height: h,
        minHeight: h,
        width: full ? '100%' : undefined,
        padding: '0 18px',
        borderRadius: tk.radius.md,
        fontSize: FONTS[size] || tk.font.base,
        fontWeight: tk.weight.bold,
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'transform 0.1s, opacity 0.15s',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: FONTS[size] + 2 }}>{icon}</span>}
      {children}
    </button>
  );
}
