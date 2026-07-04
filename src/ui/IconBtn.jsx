/**
 * IconBtn — bouton icône avec zone tactile ≥48px garantie.
 * variant : ghost | soft | outline
 */

import { T, tk } from '../theme.js';

export default function IconBtn({
  children, label, color, variant = 'ghost', size = tk.touch.min,
  fontSize = 20, disabled = false, onClick, style = {},
}) {
  const c = color || T.muted;

  const base = {
    ghost:   { background: 'none',   border: 'none' },
    soft:    { background: c + '1A', border: `1px solid ${c}33` },
    outline: { background: T.surface, border: `1px solid ${T.border}` },
  }[variant] || {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      style={{
        ...base,
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: tk.radius.md,
        color: c,
        fontSize,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
