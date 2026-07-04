/**
 * ToastHost — affiche la file de toasts au-dessus de la zone pouce.
 * Monté une fois par branche de rendu racine (App.jsx).
 */

import { useState, useEffect } from 'react';
import { T, tk } from '../theme.js';
import { subscribeToast } from './toast.js';

const ICONS = { success: '✓', danger: '✕', warning: '!', info: 'ℹ' };

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToast(item => {
    setToasts(prev => [...prev, item]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== item.id));
    }, item.duration);
  }), []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 96,
      left: 0, right: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes np-toast-in {
          from { transform: translateY(12px) scale(0.9); opacity: 0; }
          to   { transform: translateY(0)    scale(1);   opacity: 1; }
        }
        @keyframes np-toast-check {
          from { transform: scale(0); }
          60%  { transform: scale(1.25); }
          to   { transform: scale(1); }
        }
      `}</style>
      {toasts.map(t => {
        const c = T[t.kind] || T.success;
        return (
          <div key={t.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: T.surface,
            border: `1.5px solid ${c}55`,
            borderRadius: tk.radius.pill,
            padding: '10px 18px 10px 12px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            animation: 'np-toast-in 0.22s cubic-bezier(0.34,1.4,0.64,1) both',
            maxWidth: '86vw',
          }}>
            <span style={{
              width: 26, height: 26,
              borderRadius: 13,
              background: c,
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'np-toast-check 0.35s cubic-bezier(0.34,1.6,0.64,1) 0.1s both',
            }}>
              {t.icon ?? ICONS[t.kind] ?? '✓'}
            </span>
            <span style={{
              color: T.text,
              fontSize: tk.font.sm,
              fontWeight: tk.weight.semi,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {t.msg}
            </span>
          </div>
        );
      })}
    </div>
  );
}
