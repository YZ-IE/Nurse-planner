/**
 * SpringCheck.jsx — Aide-Mémoire
 * Feedback visuel de validation (coche verte, animation spring ~300ms).
 * Purement décoratif — ne bloque jamais l'interaction (pointerEvents: none).
 */

const CSS = `
  @keyframes am-spring-pop {
    0%   { transform: scale(0);    opacity: 0; }
    55%  { transform: scale(1.18); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes am-spring-fade {
    0%   { opacity: 1; }
    75%  { opacity: 1; }
    100% { opacity: 0; }
  }
`;

export default function SpringCheck({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, display: 'flex',
      alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      animation: 'am-spring-fade 650ms ease both',
    }}>
      <style>{CSS}</style>
      <div style={{
        width: 88, height: 88, borderRadius: '50%', background: '#22c55e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 42, color: '#fff', boxShadow: '0 8px 30px rgba(34,197,94,0.45)',
        animation: 'am-spring-pop 320ms cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        ✓
      </div>
    </div>
  );
}
