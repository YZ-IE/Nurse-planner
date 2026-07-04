/**
 * Sheet — bottom sheet unifié.
 * Remplace les modals position:fixed/alignItems:flex-end écrits à la main.
 * onTouchMove stopPropagation obligatoire (anti scroll-through Android).
 */

import { T, tk } from '../theme.js';
import IconBtn from './IconBtn.jsx';

export default function Sheet({
  open = true, onClose, title, subtitle, icon,
  children, footer, height = 'auto', zIndex = 300,
}) {
  if (!open) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
        zIndex,
      }}
    >
      <div
        onTouchMove={e => e.stopPropagation()}
        style={{
          background: T.surface,
          borderRadius: '20px 20px 0 0',
          width: '100%',
          boxSizing: 'border-box',
          maxHeight: height === 'full' ? '94vh' : '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Poignée */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border2 }} />
        </div>

        {/* En-tête */}
        {(title || onClose) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 10px 20px', flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: tk.weight.bold, lineHeight: 1.3 }}>
                  {icon && <span style={{ marginRight: 8 }}>{icon}</span>}{title}
                </div>
              )}
              {subtitle && (
                <div style={{ color: T.muted, fontSize: tk.font.sm, marginTop: 2 }}>{subtitle}</div>
              )}
            </div>
            {onClose && <IconBtn label="Fermer" onClick={onClose} fontSize={26}>×</IconBtn>}
          </div>
        )}

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 16px' }}>
          {children}
        </div>

        {/* Pied fixe (action principale en zone pouce) */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))', flexShrink: 0 }} />}
      </div>
    </div>
  );
}
