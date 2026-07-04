/**
 * Chip — pilule de filtre/sélection, hauteur 40px (tk.touch.compact).
 */

import { T, tk } from '../theme.js';

export default function Chip({ children, color, active = false, onClick, style = {} }) {
  const c = color || T.info;
  return (
    <button
      onClick={onClick}
      style={{
        height: tk.touch.compact,
        padding: '0 14px',
        background: active ? c + '1F' : 'none',
        border: `1.5px solid ${active ? c : T.border}`,
        borderRadius: tk.radius.pill,
        color: active ? c : T.muted,
        fontSize: tk.font.sm,
        fontWeight: active ? tk.weight.bold : tk.weight.semi,
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
