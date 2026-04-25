/**
 * crypto.js — Aide-Mémoire v3
 * AES-256-GCM · PBKDF2 100 000 iter · SHA-256
 * v3 : getSalt() async — prête pour Android Keystore via SecureStoragePlugin
 *      resetAll() async — purge cohérente
 */

// SecureStorage : installer @aparajita/capacitor-secure-storage pour activer le Keystore.
// En attendant, fallback localStorage sécurisé par allowBackup=false.
const SALT_KEY = 'am_salt';
const CHECK_KEY   = 'am_check';
const LOCKOUT_KEY = 'am_lockout';

export const SEC = {
  MAX_ATTEMPTS:    5,
  LOCKOUT_MS:      15 * 60 * 1000,
  SESSION_TIMEOUT: 5  * 60 * 1000,
  WARN_BEFORE:     60 * 1000,
};

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  return arr;
}
export function bytesToBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
export function base64ToBytes(b64)   { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }

async function getSalt() {
  let h = localStorage.getItem(SALT_KEY);
  if (!h) { const r = crypto.getRandomValues(new Uint8Array(16)); h = bytesToHex(r); localStorage.setItem(SALT_KEY, h); }
  return hexToBytes(h);
}

async function deriveKey(pin, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export async function encrypt(cryptoKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plaintext));
  return bytesToHex(iv) + ':' + bytesToHex(new Uint8Array(ct));
}

export async function decrypt(cryptoKey, stored) {
  const col = stored.indexOf(':');
  const iv  = hexToBytes(stored.slice(0, col));
  const ct  = hexToBytes(stored.slice(col + 1));
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct);
  return new TextDecoder().decode(pt);
}

// ─── Verrouillage ─────────────────────────────────────────────────────────────

function readLockout() { try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}'); } catch { return {}; } }
function writeLockout(d) { localStorage.setItem(LOCKOUT_KEY, JSON.stringify(d)); }

export function isLockedOut()        { const { until } = readLockout(); return !!until && Date.now() < until; }
export function getLockoutRemaining(){ const { until } = readLockout(); if (!until) return 0; return Math.max(0, Math.ceil((until - Date.now()) / 1000)); }
export function clearLockout()       { writeLockout({ failures: 0, until: null }); }
export function getFailures()        { return readLockout().failures || 0; }

export function recordFailure() {
  const lo = readLockout();
  const f  = (lo.failures || 0) + 1;
  if (f >= SEC.MAX_ATTEMPTS) { writeLockout({ failures: f, until: Date.now() + SEC.LOCKOUT_MS }); return { locked: true, failures: f }; }
  writeLockout({ failures: f, until: null });
  return { locked: false, failures: f };
}

// ─── API PIN ──────────────────────────────────────────────────────────────────

export function isPinSet() { return Promise.resolve(!!localStorage.getItem(CHECK_KEY)); }

export async function createPin(pin) {
  const key = await deriveKey(pin, await getSalt());
  localStorage.setItem(CHECK_KEY, await encrypt(key, 'AM_SECRET_OK'));
  clearLockout();
  return key;
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(CHECK_KEY);
  if (!stored) return null;
  try {
    const key   = await deriveKey(pin, await getSalt());
    const plain = await decrypt(key, stored);
    if (plain === 'AM_SECRET_OK') { clearLockout(); return key; }
    return null;
  } catch { return null; }
}

export async function secureGet(key, cryptoKey) {
  const stored = localStorage.getItem('am_' + key);
  if (!stored) return null;
  try { return JSON.parse(await decrypt(cryptoKey, stored)); } catch { return null; }
}

export async function secureSet(key, value, cryptoKey) {
  localStorage.setItem('am_' + key, await encrypt(cryptoKey, JSON.stringify(value)));
}

export function secureRemove(key) { localStorage.removeItem('am_' + key); }

export async function resetAll() {
  Object.keys(localStorage).filter(k => k.startsWith('am_')).forEach(k => localStorage.removeItem(k));
  [SALT_KEY, CHECK_KEY, LOCKOUT_KEY, BIO_PIN_STORE, BIO_KEY_MATERIAL].forEach(k => localStorage.removeItem(k));
}

// ─── Transfert sécurisé local — protocole symétrique v2 ──────────────────────
//
//  Export : code = random 8 chiffres
//           IV   = random 12 octets
//           clé  = PBKDF2(code, IV, 100k)   ← MÊME logique que l'import
//           blob = base64(JSON({v,iv,ct,ts}))
//
//  Import : blob → extraire IV
//           clé  = PBKDF2(code_saisi, IV, 100k)
//           déchiffrer ct avec clé + IV
//
//  Le blob circule librement. Le code est dit verbalement. Zéro réseau.

export function generateTransferCode() {
  const raw = crypto.getRandomValues(new Uint8Array(4));
  const num = (raw[0] * 16777216 + raw[1] * 65536 + raw[2] * 256 + raw[3]) % 100_000_000;
  return num.toString().padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1 $2');
}

async function deriveTransferKey(code, iv) {
  const digits = typeof code === 'string' ? code.replace(/\s/g, '') : String(code);
  const km = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(digits), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: iv, iterations: 100_000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// ─── Biométrie — stockage du PIN chiffré ─────────────────────────────────────
// Le PIN est chiffré avec une clé AES dérivée d'un secret device fixe.
// La biométrie ne stocke AUCUNE donnée biométrique — elle déverrouille
// uniquement l'accès au PIN chiffré qui reste la source de vérité crypto.

const BIO_KEY_MATERIAL = 'am_bio_km';   // clé device (hex)
const BIO_PIN_STORE    = 'am_bio_pin';  // PIN chiffré

async function getBioKey() {
  let km = localStorage.getItem(BIO_KEY_MATERIAL);
  if (!km) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    km = bytesToHex(raw);
    localStorage.setItem(BIO_KEY_MATERIAL, km);
  }
  const raw = hexToBytes(km);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function savePinForBiometric(pin) {
  try {
    const key = await getBioKey();
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(pin))
    );
    localStorage.setItem(BIO_PIN_STORE, JSON.stringify({
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(ct)),
    }));
    return true;
  } catch { return false; }
}

export async function loadPinForBiometric() {
  try {
    const stored = localStorage.getItem(BIO_PIN_STORE);
    if (!stored) return null;
    const { iv, ct } = JSON.parse(stored);
    const key = await getBioKey();
    const pt  = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(iv) }, key, base64ToBytes(ct)
    );
    return new TextDecoder().decode(pt);
  } catch { return null; }
}

export function isBiometricEnabled() {
  return !!localStorage.getItem(BIO_PIN_STORE);
}

export function disableBiometric() {
  localStorage.removeItem(BIO_PIN_STORE);
  // Ne pas supprimer BIO_KEY_MATERIAL pour réactivation future
}

export async function encryptForTransfer(code, payload) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveTransferKey(code, iv);
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))
  );
  return btoa(JSON.stringify({ v: 2, iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)), ts: Date.now() }));
}

export async function decryptFromTransfer(base64Blob, code) {
  const digits = String(code).replace(/\s/g, '');
  if (digits.length !== 8 || !/^\d+$/.test(digits)) throw new Error('Code invalide');
  const blob = JSON.parse(atob(base64Blob));
  if (!blob.iv || !blob.ct) throw new Error('Blob invalide');
  const iv  = base64ToBytes(blob.iv);
  const key = await deriveTransferKey(digits, iv);
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
