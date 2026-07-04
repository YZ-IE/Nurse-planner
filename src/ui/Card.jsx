/**
 * Card — carte standard du kit UI.
 * accent : couleur de bordure gauche 3px (identité/statut)
 * dim    : fond teinté (utiliser T.xxxDim)
 * onClick → pressable (scale au tap)
 */

import { T, tk } from '../theme.js';

const PADS = { sm: 10, md: 16, lg: 20 };

export default function Card({ children, accent, dim, pad = 'md', onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: dim || T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        borderRadius: tk.radius.lg,
        padding: PADS[pad] ?? PADS.md,
        marginBottom: tk.space.sm + 2,
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'transform 0.1s' : undefined,
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      onTouchStart={onClick ? e => { e.currentTarget.style.transform = 'scale(0.98)'; } : undefined}
      onTouchEnd={onClick ? e => { e.currentTarget.style.transform = 'scale(1)'; } : undefined}
    >
      {children}
    </div>
  );
}
