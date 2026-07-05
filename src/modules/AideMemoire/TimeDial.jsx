/**
 * TimeDial.jsx — Aide-Mémoire
 * Sélecteur de temps circulaire autour du bouton de validation :
 * -30min / -15min / Maintenant en un geste, sans clavier.
 */
import { T } from '../../theme.js';

function applyOffset(time, deltaMinutes) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  d.setMinutes(d.getMinutes() + deltaMinutes);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Satellite({ label, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', minWidth: 48, minHeight: 48, borderRadius: 24,
        background: T.surface, border: `1px solid ${T.border}`, color: T.text,
        fontSize: 12, fontWeight: 700, padding: '0 12px', cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)', WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export default function TimeDial({ time, onChange, onValidate, color, validateLabel = 'Valider' }) {
  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '8px auto 4px' }}>
      <Satellite label="−30 min" onClick={() => onChange(applyOffset(time, -30))}
        style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} />
      <Satellite label="−15 min" onClick={() => onChange(applyOffset(time, -15))}
        style={{ top: '38%', right: 0, transform: 'translateY(-50%)' }} />
      <Satellite label="Maintenant" onClick={() => onChange(nowStr())}
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />

      <button
        onClick={onValidate}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 104, height: 104, borderRadius: '50%', background: color, border: 'none',
          color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          boxShadow: `0 6px 20px ${color}55`, WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 800 }}>{time}</span>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{validateLabel}</span>
      </button>
    </div>
  );
}
