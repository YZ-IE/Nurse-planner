/**
 * NavDrawer.jsx — Aide-Mémoire
 * Menu plein écran (drawer) ouvert depuis le bouton hamburger de chaque écran.
 * Navigation directe entre les vues du module sans repasser par le back-stack.
 */
import { T } from '../../theme.js';

const DRAWER_ITEMS = [
  { key: 'dashboard',   icon: '🏠', label: 'Tableau de bord' },
  { key: 'patient',     icon: '🗂️', label: 'Dossier Patient' },
  { key: 'dayoverview', icon: '📆', label: 'Suivi Quotidien' },
  { key: 'clinical',    icon: '🩺', label: 'Profil Clinique' },
  { key: 'gantt',       icon: '📊', label: 'Vue Gantt' },
  { key: 'handover',    icon: '📝', label: 'Relève' },
  { key: 'log',         icon: '🗒️', label: "Journal d'accès" },
  { key: 'transfer',    icon: '🔄', label: 'Transfert sécurisé' },
  { key: 'settings',    icon: '⚙️', label: 'Paramètres' },
];

const DUR = 280;

export default function NavDrawer({ open, onClose, currentScreen, onSelect, onLock, serviceName }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${DUR}ms cubic-bezier(0.32,.72,0,1)`,
        }}
      />
      <div
        role="dialog"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, width: 'min(84vw, 340px)', zIndex: 401,
          background: T.surface, boxShadow: '4px 0 30px rgba(0,0,0,0.25)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform ${DUR}ms cubic-bezier(0.32,.72,0,1)`,
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        }}
      >
        <div style={{ padding: '22px 20px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: T.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Aide-Mémoire
            </div>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {serviceName || 'Menu'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 20, background: 'none',
              border: `1px solid ${T.border}`, color: T.muted, fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {DRAWER_ITEMS.map(item => {
            const active = currentScreen === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                  minHeight: 48, padding: '12px 20px', background: active ? '#6366f114' : 'none',
                  border: 'none', borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
                  color: active ? '#6366f1' : T.text,
                  fontSize: 15, fontWeight: active ? 700 : 500, textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
          <button
            onClick={onLock}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', minHeight: 48, background: '#f43f5e14', border: '1px solid #f43f5e33',
              borderRadius: 12, color: '#f43f5e', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
            }}
          >
            🔒 Verrouiller la session
          </button>
        </div>
      </div>
    </>
  );
}
