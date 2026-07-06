/**
 * MenuButton.jsx — Aide-Mémoire
 * Bouton hamburger partagé, ouvre le NavDrawer depuis l'en-tête de chaque écran.
 */
import { T } from '../../theme.js';

export default function MenuButton({ onClick }) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      title="Menu"
      style={{
        background: 'none', border: 'none', color: T.muted, fontSize: 20,
        cursor: 'pointer', padding: 0, width: 48, height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ☰
    </button>
  );
}
