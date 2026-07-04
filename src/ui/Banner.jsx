/**
 * Banner — bandeau d'alerte/information sémantique.
 * kind : danger | warning | success | info
 */

import { T, tk } from '../theme.js';

const ICONS = { danger: '🔴', warning: '🟠', success: '✅', info: 'ℹ️' };

export default function Banner({ kind = 'info', icon, title, children, onClose, style = {} }) {
  const c   = T[kind] || T.info;
  const dim = T[kind + 'Dim'] || T.infoDim;

  return (
    <div style={{
      background: dim,
      border: `1px solid ${c}44`,
      borderRadius: tk.radius.md,
      padding: '10px 14px',
      marginBottom: tk.space.sm,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      ...style,
    }}>
      <span style={{ fontSize: tk.font.md, flexShrink: 0, lineHeight: 1.4 }}>
        {icon ?? ICONS[kind]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ color: c, fontSize: tk.font.sm, fontWeight: tk.weight.bold, lineHeight: 1.4 }}>
            {title}
          </div>
        )}
        {children && (
          <div style={{ color: title ? T.text : c, fontSize: tk.font.sm, lineHeight: 1.5, marginTop: title ? 2 : 0, fontWeight: title ? tk.weight.reg : tk.weight.semi }}>
            {children}
          </div>
        )}
      </div>
      {onClose && (
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: c, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
          ×
        </button>
      )}
    </div>
  );
}
