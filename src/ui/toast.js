/**
 * toast.js — bus d'événements module-level pour les confirmations.
 * Pas de provider React : appelable depuis n'importe quel code.
 *
 *   import { toast } from '../../ui/toast.js';
 *   toast('Soin validé');
 *   toast('Suppression impossible', { kind: 'danger', icon: '⚠️' });
 */

const listeners = new Set();
let seq = 0;

export function toast(msg, { kind = 'success', icon, duration = 1800 } = {}) {
  const item = { id: ++seq, msg, kind, icon, duration };
  listeners.forEach(fn => fn(item));
}

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
