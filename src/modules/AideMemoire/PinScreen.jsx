/**
 * PinScreen.jsx — Aide-Mémoire v6
 * Remplacement du PIN 4 chiffres par mot de passe robuste (≥12 car.) — ANSSI données sensibles
 * Conformité ANSSI/CNIL : complexité, verrouillage, indicateur de force
 */

import { useState, useEffect, useRef } from 'react';
import { T, s } from '../../theme.js';
import {
  createPin, verifyPin,
  isLockedOut, getLockoutRemaining,
  recordFailure, clearLockout, getFailures,
} from './crypto.js';

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
  const colors = ['#ef4444', '#ef4444', '#f97316', '#f97316', '#22c55e', '#22c55e'];
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

  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [step]);

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
        onUnlocked(key);
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

  // ── Verrouillé ──────────────────────────────────────────────────────────────
  if (locked) {
    const min = Math.floor(countdown / 60);
    const sec = String(countdown % 60).padStart(2, '0');
    return (
      <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: 20, left: 16, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <div style={{ color: '#f43f5e', fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Application verrouillée</div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>{failures} tentatives incorrectes</div>
        <div style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 12, padding: '18px 32px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>Déverrouillage dans</div>
          <div style={{ color: '#f43f5e', fontSize: 36, fontWeight: 700, fontFamily: 'monospace' }}>{min}:{sec}</div>
        </div>
        <div style={{ color: T.muted, fontSize: 11, textAlign: 'center', background: T.surface, borderRadius: 8, padding: '10px 16px', maxWidth: 280 }}>
          ⚠️ Événement enregistré dans le journal d'accès.
        </div>
      </div>
    );
  }

  // ── Création ──────────────────────────────────────────────────────────────────
  if (step === 'create') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: 20, left: 16, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer' }}>←</button>
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
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 44, fontSize: 15 }}
          />
          <button onClick={() => setShowPwd(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}>
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
            <div style={{ color: strength.color, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{strength.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {strength.checks.map(c => (
                <span key={c.label} style={{ color: c.ok ? '#22c55e' : T.muted, fontSize: 11, background: c.ok ? '#22c55e11' : T.surface, borderRadius: 6, padding: '2px 8px' }}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ color: '#f43f5e', fontSize: 13, marginBottom: 14, background: '#f43f5e22', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !strength.ok}
          style={{ ...s.btn(C), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: (strength.ok && !loading) ? 1 : 0.4 }}>
          {loading ? 'Chiffrement…' : 'Continuer →'}
        </button>
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
        style={{ position: 'absolute', top: 20, left: 16, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer' }}>←</button>
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
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 44, fontSize: 15, borderColor: password && password !== firstPassword ? '#f43f5e' : undefined }}
          />
          <button onClick={() => setShowPwd(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>
        {password && password !== firstPassword && (
          <div style={{ color: '#f43f5e', fontSize: 12, marginBottom: 12 }}>Les mots de passe ne correspondent pas</div>
        )}
        {error && <div style={{ color: '#f43f5e', fontSize: 13, marginBottom: 14, background: '#f43f5e22', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading || !password || password !== firstPassword}
          style={{ ...s.btn(C), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: (password && password === firstPassword && !loading) ? 1 : 0.4 }}>
          {loading ? 'Création…' : 'Créer le mot de passe'}
        </button>
      </div>
    </div>
  );

  // ── Vérification ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ position: 'absolute', top: 20, left: 16, background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer' }}>←</button>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <div style={{ color: T.text, fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Déverrouiller</div>
      <div style={{ color: T.muted, fontSize: 13, marginBottom: failures > 0 ? 12 : 28, textAlign: 'center' }}>Saisir votre mot de passe</div>

      {failures > 0 && (
        <div style={{ background: '#f9731622', border: '1px solid #f9731644', borderRadius: 8, padding: '7px 16px', marginBottom: 18, fontSize: 12, color: '#f97316', textAlign: 'center', maxWidth: 320 }}>
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
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingRight: 44, fontSize: 15 }}
          />
          <button onClick={() => setShowPwd(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>

        {error && <div style={{ color: '#f43f5e', fontSize: 13, marginBottom: 14, background: '#f43f5e22', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !password}
          style={{ ...s.btn(C), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: (password && !loading) ? 1 : 0.4 }}>
          {loading ? 'Vérification…' : 'Déverrouiller'}
        </button>

        <div style={{ color: T.muted, fontSize: 11, marginTop: 20, textAlign: 'center' }}>
          Mot de passe oublié ? Désinstallez et réinstallez l'application.
        </div>
      </div>

      <div style={{ color: T.muted, fontSize: 11, marginTop: 32, textAlign: 'center' }}>
        🔒 Données chiffrées · Secret professionnel
      </div>
    </div>
  );
}
