/**
 * PinScreen.jsx — Aide-Mémoire v6
 * Remplacement du PIN 4 chiffres par mot de passe robuste (≥12 car.) — ANSSI données sensibles
 * Conformité ANSSI/CNIL : complexité, verrouillage, indicateur de force
 */

import { useState, useEffect, useRef } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, Banner } from '../../ui/index.js';
import {
  createPin, verifyPin,
  isLockedOut, getLockoutRemaining,
  recordFailure, clearLockout, getFailures,
  loadPinForBiometric, isBiometricEnabled,
} from './crypto.js';
import BiometricSetup from './BiometricSetup.jsx';

const ACCENT = '#6366f1';

// ─── Évaluation force du mot de passe ────────────────────────────────────────

function assessPassword(pwd) {
  const checks = [
    { ok: pwd.length >= 12,           label: '≥ 12 caractères' },
    { ok: /[A-Z]/.test(pwd),          label: 'Majuscule'       },
    { ok: /[a-z]/.test(pwd),          label: 'Minuscule'       },
    { ok: /\d/.test(pwd),             label: 'Chiffre'         },
    { ok: /[^A-Za-z0-9]/.test(pwd),   label: 'Caractère spécial' },
  ];
  const score  = checks.filter(c => c.ok).length;
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort', 'Excellent'];
  const colors = [T.danger, T.danger, T.warning, T.warning, T.success, T.success];
  return {
    checks, score,
    label: labels[score],
    color: colors[score],
    ok:    score >= 3 && pwd.length >= 12,
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PinScreen({ pinExists, accentColor, onUnlocked, onBack }) {
  const C = accentColor || ACCENT;

  const [step,      setStep]      = useState(pinExists ? 'verify' : 'create');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [firstPassword, setFirstPassword] = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [locked,    setLocked]    = useState(() => isLockedOut());
  const [countdown, setCountdown] = useState(() => getLockoutRemaining());
  const [failures,  setFailures]  = useState(() => getFailures());
  const [pendingKey,   setPendingKey]   = useState(null);
  const [bioBusy,      setBioBusy]      = useState(false);
  const [showBioSetup, setShowBioSetup] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [step]);

  // Tentative biométrique automatique au montage si activée
  useEffect(() => {
    if (pinExists && isBiometricEnabled()) tryBiometric();
  }, []);

  async function tryBiometric() {
    if (bioBusy) return;
    setBioBusy(true);
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable) { setBioBusy(false); return; }
      await BiometricAuth.authenticate({
        reason: "Accéder à l'Aide-Mémoire",
        cancelTitle: 'Utiliser le mot de passe',
        allowDeviceCredential: false,
      });
      const pin = await loadPinForBiometric();
      if (!pin) { setBioBusy(false); setError('Biométrie indisponible, utilisez le mot de passe.'); return; }
      const key = await verifyPin(pin);
      if (key) { onUnlocked(key); }
      else { setBioBusy(false); setError('Erreur biométrie, utilisez le mot de passe.'); }
    } catch { setBioBusy(false); }
  }

  // Compte à rebours verrouillage
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => {
      const rem = getLockoutRemaining();
      setCountdown(rem);
      if (rem <= 0) { clearLockout(); setLocked(false); setError(''); setFailures(0); }
    }, 1000);
    return () => clearInterval(id);
  }, [locked]);

  const strength = assessPassword(password);

  async function handleSubmit() {
    if (loading || locked) return;
    setLoading(true); setError('');
    try {
      if (step === 'create') {
        if (!strength.ok) { setError('Mot de passe trop faible.'); return; }
        setFirstPassword(password);  // sauvegarder avant de vider
        setStep('confirm');
        setPassword('');
      } else if (step === 'confirm') {
        if (password !== firstPassword) { setError('Les mots de passe ne correspondent pas.'); setPassword(''); setConfirm(''); setFirstPassword(''); setStep('create'); return; }
        const key = await createPin(firstPassword);
        setPendingKey(key);
        setStep('biometric-setup');
      } else {
        // verify
        const key = await verifyPin(password);
        if (key) {
          onUnlocked(key);
        } else {
          const { locked: nowLocked, failures: f } = recordFailure();
          setFailures(f);
          if (nowLocked) { setLocked(true); setCountdown(getLockoutRemaining()); }
          else { const r = 5 - f; setError(`Mot de passe incorrect — ${r} tentative${r > 1 ? 's' : ''} restante${r > 1 ? 's' : ''}`); }
          setPassword('');
        }
      }
    } catch (e) { setError('Erreur inattendue'); setPassword(''); console.error(e); }
    finally { setLoading(false); }
  }

  // ── Setup biométrie — activation depuis écran verify ─────────────────────────
  if (showBioSetup) {
    return (
      <BiometricSetup
        pin={password}
        onDone={() => { setShowBioSetup(false); setPassword(''); }}
      />
    );
  }

  // ── Setup biométrie après création PIN ───────────────────────────────────────
  if (step === 'biometric-setup' && pendingKey) {
    return (
      <BiometricSetup
        pin={firstPassword}
        onDone={() => onUnlocked(pendingKey)}
      />
    );
  }

  // ── Verrouillé ──────────────────────────────────────────────────────────────
  if (locked) {
    const min = Math.floor(countdown / 60);
    const sec = String(countdown % 60).padStart(2, '0');
    return (
      <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 8, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>←</button>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <div style={{ color: T.danger, fontSize: tk.font.lg, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Application verrouillée</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 24, textAlign: 'center' }}>{failures} tentatives incorrectes</div>
        <div style={{ background: T.dangerDim, border: `1px solid ${T.danger}44`, borderRadius: 12, padding: '18px 32px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 6 }}>Déverrouillage dans</div>
          <div style={{ color: T.danger, fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{min}:{sec}</div>
        </div>
        <div style={{ color: T.muted, fontSize: tk.font.xs, textAlign: 'center', background: T.surface, borderRadius: 8, padding: '10px 16px', maxWidth: 280 }}>
          ⚠️ Événement enregistré dans le journal d'accès.
        </div>
      </div>
    );
  }

  // ── Création ──────────────────────────────────────────────────────────────────
  if (step === 'create') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 8, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>←</button>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <div style={{ color: T.text, fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Créer votre mot de passe</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 28, textAlign: 'center' }}>Protège vos données patients · Minimum 12 caractères (ANSSI)</div>

      <div style={{ width: '100%', maxWidth: 340 }}>
        {/* Champ */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            ref={inputRef}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Votre mot de passe"
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 52, fontSize: 15, height: tk.touch.input }}
          />
          <button onClick={() => setShowPwd(v => !v)} aria-label="Afficher le mot de passe"
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18, WebkitTapHighlightColor: 'transparent' }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>

        {/* Indicateur de force */}
        {password.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.score ? strength.color : T.border, transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ color: strength.color, fontSize: tk.font.sm, fontWeight: 600, marginBottom: 8 }}>{strength.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {strength.checks.map(c => (
                <span key={c.label} style={{ color: c.ok ? T.success : T.muted, fontSize: tk.font.xs, background: c.ok ? T.successDim : T.surface, borderRadius: 6, padding: '3px 9px' }}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && <Banner kind="danger" icon="⚠️">{error}</Banner>}

        <Btn color={C} size="lg" full disabled={loading || !strength.ok} onClick={handleSubmit}>
          {loading ? 'Chiffrement…' : 'Continuer →'}
        </Btn>
      </div>

      <div style={{ color: T.muted, fontSize: 11, marginTop: 32, textAlign: 'center', lineHeight: 1.6 }}>
        🔒 AES-256 · PBKDF2 100k · Stockage local uniquement
      </div>
    </div>
  );

  // ── Confirmation ──────────────────────────────────────────────────────────────
  if (step === 'confirm') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <button onClick={() => { setStep('create'); setPassword(''); setConfirm(''); setFirstPassword(''); setError(''); }}
        style={{ position: 'absolute', top: 14, left: 8, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>←</button>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <div style={{ color: T.text, fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Confirmer le mot de passe</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: 28, textAlign: 'center' }}>Saisissez à nouveau votre mot de passe</div>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            ref={inputRef}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Répétez le mot de passe"
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 52, fontSize: 15, height: tk.touch.input, borderColor: password && password !== firstPassword ? T.danger : undefined }}
          />
          <button onClick={() => setShowPwd(v => !v)} aria-label="Afficher le mot de passe"
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18, WebkitTapHighlightColor: 'transparent' }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>
        {password && password !== firstPassword && (
          <div style={{ color: T.danger, fontSize: tk.font.sm, marginBottom: 12 }}>Les mots de passe ne correspondent pas</div>
        )}
        {error && <Banner kind="danger" icon="⚠️">{error}</Banner>}
        <Btn color={C} size="lg" full disabled={loading || !password || password !== firstPassword} onClick={handleSubmit}>
          {loading ? 'Création…' : 'Créer le mot de passe'}
        </Btn>
      </div>
    </div>
  );

  // ── Vérification ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: 14, left: 8, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>←</button>

      {bioBusy && (
        <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10 }}>
          <div style={{ fontSize: 52 }}>👆</div>
          <div style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>Authentification biométrique…</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Utilisez votre empreinte ou visage</div>
          <button onClick={() => setBioBusy(false)}
            style={{ marginTop: 8, background: 'none', border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, fontSize: 13, cursor: 'pointer', padding: '10px 20px' }}>
            Ignorer — utiliser le mot de passe
          </button>
        </div>
      )}

      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <div style={{ color: T.text, fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Déverrouiller</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: failures > 0 ? 12 : 28, textAlign: 'center' }}>Saisir votre mot de passe</div>

      {failures > 0 && (
        <div style={{ background: T.warningDim, border: `1px solid ${T.warning}44`, borderRadius: 8, padding: '8px 16px', marginBottom: 18, fontSize: tk.font.sm, color: T.warning, textAlign: 'center', maxWidth: 320, fontWeight: 600 }}>
          ⚠️ {failures} tentative{failures > 1 ? 's' : ''} incorrecte{failures > 1 ? 's' : ''} — verrouillage après {5 - failures} de plus
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            ref={inputRef}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Votre mot de passe"
            autoFocus
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 52, fontSize: 15, height: tk.touch.input }}
          />
          <button onClick={() => setShowPwd(v => !v)} aria-label="Afficher le mot de passe"
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18, WebkitTapHighlightColor: 'transparent' }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>

        {error && <Banner kind="danger" icon="⚠️">{error}</Banner>}

        <Btn color={C} size="lg" full disabled={loading || !password} onClick={handleSubmit}>
          {loading ? 'Vérification…' : 'Déverrouiller'}
        </Btn>

        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 20, textAlign: 'center' }}>
          Mot de passe oublié ? Désinstallez et réinstallez l'application.
        </div>

        {!isBiometricEnabled() && (
          <Btn color={C} variant="outline" full icon="👆" onClick={() => setShowBioSetup(true)} style={{ marginTop: 12 }}>
            Activer la biométrie
          </Btn>
        )}

        {isBiometricEnabled() && (
          <Btn color={C} variant="outline" full icon="👆" disabled={bioBusy} onClick={tryBiometric} style={{ marginTop: 12 }}>
            {bioBusy ? 'Vérification…' : 'Utiliser la biométrie'}
          </Btn>
        )}
      </div>

      <div style={{ color: T.muted, fontSize: 11, marginTop: 32, textAlign: 'center' }}>
        🔒 Données chiffrées · Secret professionnel
      </div>
    </div>
  );
}
