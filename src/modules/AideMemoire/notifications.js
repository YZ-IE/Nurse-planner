/**
 * notifications.js — Aide-Mémoire
 * Wrapper Capacitor LocalNotifications pour les rappels de soins.
 * No-op sur web ; uniquement actif sur native Android/iOS.
 */

import { Capacitor } from '@capacitor/core';

let plugin = null;
let permGranted = null;

async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!plugin) {
    const mod = await import('@capacitor/local-notifications');
    plugin = mod.LocalNotifications;
  }
  return plugin;
}

export async function ensureNotifPermission() {
  const p = await getPlugin();
  if (!p) return false;
  if (permGranted !== null) return permGranted;
  try {
    const check = await p.checkPermissions();
    if (check.display === 'granted') { permGranted = true; return true; }
    const req = await p.requestPermissions();
    permGranted = req.display === 'granted';
    return permGranted;
  } catch { return false; }
}

// Stable numeric ID from a string care ID (hash)
function stableId(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/**
 * Planifie une notification de rappel avant un soin.
 * @param {object} opts
 * @param {string} opts.careId
 * @param {string} opts.label
 * @param {string} opts.emoji
 * @param {string} opts.patientInitials
 * @param {string} opts.bedLabel
 * @param {string} opts.plannedTime   "HH:MM"
 * @param {number} [opts.minutesBefore=15]
 */
export async function scheduleCareNotif({ careId, label, emoji, patientInitials, bedLabel, plannedTime, minutesBefore = 15 }) {
  const p = await getPlugin();
  if (!p) return;
  const ok = await ensureNotifPermission();
  if (!ok) return;

  try {
    const [h, m] = plannedTime.split(':').map(Number);
    const fireAt = new Date();
    fireAt.setHours(h, m, 0, 0);
    fireAt.setMinutes(fireAt.getMinutes() - minutesBefore);
    if (fireAt <= new Date()) return; // heure déjà passée

    await p.schedule({
      notifications: [{
        id:        stableId(careId),
        title:     `${emoji} Rappel soin — ${minutesBefore} min`,
        body:      `${label} · ${patientInitials} lit ${bedLabel}`,
        schedule:  { at: fireAt, allowWhileIdle: true },
        channelId: 'nplanr_care',
        smallIcon: 'ic_launcher_foreground',
        iconColor: '#6366f1',
        extra:     { careId },
      }],
    });
  } catch (e) {
    console.warn('[Notif] schedule error:', e);
  }
}

export async function cancelCareNotif(careId) {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.cancel({ notifications: [{ id: stableId(careId) }] });
  } catch {}
}

/** Crée le canal Android si nécessaire (à appeler une fois au démarrage). */
export async function createNotifChannel() {
  const p = await getPlugin();
  if (!p) return;
  try {
    await p.createChannel({
      id:          'nplanr_care',
      name:        'Rappels soins',
      description: 'Notifications de rappel avant les soins planifiés',
      importance:  4, // HIGH
      visibility:  1,
      vibration:   true,
    });
  } catch {}
}
