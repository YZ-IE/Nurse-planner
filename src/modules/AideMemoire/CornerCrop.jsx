/**
 * CornerCrop.jsx — Aide-Mémoire
 * Pointage des 4 coins de la feuille sur la photo (comme une appli de scan)
 * avant redressement — cf. perspectiveCrop.js. Les coins sont exprimés en
 * fractions (0–1) de l'image affichée, indépendantes de sa résolution
 * réelle, pour que l'appelant puisse les appliquer telle quelle à une
 * copie haute résolution.
 */

import { useRef, useState } from 'react';

const DEFAULT_QUAD = [
  { x: 0.04, y: 0.04 }, { x: 0.96, y: 0.04 }, { x: 0.96, y: 0.96 }, { x: 0.04, y: 0.96 },
];
const LABELS = ['Haut-gauche', 'Haut-droit', 'Bas-droit', 'Bas-gauche'];

export default function CornerCrop({ imageUrl, onConfirm, onCancel }) {
  const [quad, setQuad] = useState(DEFAULT_QUAD);
  const [dragIdx, setDragIdx] = useState(null);
  const imgRef = useRef(null);

  function clampedFraction(clientX, clientY) {
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handlePointerMove(e) {
    if (dragIdx === null) return;
    const pt = clampedFraction(e.clientX, e.clientY);
    setQuad(q => q.map((p, i) => i === dragIdx ? pt : p));
  }

  const points = quad.map(p => `${p.x * 100},${p.y * 100}`).join(' ');

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragIdx(null)}
      onTouchMove={e => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 400, display: 'flex', flexDirection: 'column', touchAction: 'none' }}
    >
      <div style={{ color: '#fff', fontSize: 13, textAlign: 'center', padding: '14px 20px 8px' }}>
        📐 Ajustez les 4 coins de la feuille, puis validez
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 0 }}>
        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
          <img ref={imgRef} src={imageUrl} alt="" draggable={false}
            style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', userSelect: 'none' }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <polygon points={points} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {quad.map((p, i) => (
            <div key={i}
              onPointerDown={e => { e.preventDefault(); setDragIdx(i); }}
              title={LABELS[i]}
              style={{
                position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                width: 30, height: 30, marginLeft: -15, marginTop: -15,
                borderRadius: '50%', background: '#6366f1', border: '3px solid #fff',
                boxShadow: '0 0 8px rgba(0,0,0,0.6)', cursor: 'grab', touchAction: 'none',
              }} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '10px 16px 28px' }}>
        <button onClick={() => setQuad(DEFAULT_QUAD)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: '#fff', padding: '12px', fontSize: 13, cursor: 'pointer' }}>
          ↺ Réinitialiser
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: '#fff', padding: '12px', fontSize: 14, cursor: 'pointer' }}>
          Annuler
        </button>
        <button onClick={() => onConfirm(quad)}
          style={{ flex: 1, background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ✓ Redresser
        </button>
      </div>
    </div>
  );
}
