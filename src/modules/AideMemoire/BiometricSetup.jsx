/**
 * BiometricSetup.jsx — Proposition d'activation biométrique
 * Affiché une seule fois après la création du PIN.
 * L'utilisateur peut activer, refuser, ou être informé si indisponible.
 */

import { useState, useEffect } from 'react';
import { T } from '../../theme.js';
import { savePinForBiometric } from './crypto.js';

const ACCENT = '#6366f1';

export default function BiometricSetup({ pin, onDone }) {
  const [status,  setStatus]  = useState('checking'); // checking | available | unavailable | loading | done
  const [error,   setError]   = useState('');

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const info = await BiometricAuth.checkBiometry();
      if (info.isAvailable) {
        setStatus('available');
      } else {
        setStatus('unavailable');
      }
    } catch {
      setStatus('unavailable');
    }
  }

  async function handleEnable() {
    setStatus('loading');
    setError('');
    try {
      // 1. Demander l'authentification biométrique pour confirmer
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: 'Confirmer l\'activation de la biométrie',
        cancelTitle: 'Annuler',
        allowDeviceCredential: false,
      });

      // 2. Stocker le PIN chiffré
      const ok = await savePinForBiometric(pin);
      if (!ok) throw new Error('Stockage échoué');

      setStatus('done');
      setTimeout(() => onDone(), 1200);
    } catch (e) {
      if (e?.code === 'userCancel' || e?.message?.includes('cancel')) {
        setStatus('available');
      } else {
        setError('Activation échouée. Utilisez le PIN.');
        setStatus('available');
      }
    }
  }

  function handleSkip() { onDone(); }

  const C = ACCENT;

  // ── Vérification ─────────────────────────────────────────────────────────────
  if (status === 'checking') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:T.muted, fontSize:14 }}>Vérification…</div>
    </div>
  );

  // ── Succès ───────────────────────────────────────────────────────────────────
  if (status === 'done') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontSize:52 }}>✅</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:18 }}>Biométrie activée</div>
      <div style={{ color:T.muted, fontSize:13 }}>Connexion simplifiée au prochain lancement</div>
    </div>
  );

  // ── Indisponible ─────────────────────────────────────────────────────────────
  if (status === 'unavailable') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, boxSizing:'border-box', gap:16 }}>
      <div style={{ fontSize:48 }}>🔐</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:18, textAlign:'center' }}>
        Biométrie non disponible
      </div>
      <div style={{ color:T.muted, fontSize:13, textAlign:'center', lineHeight:1.6, maxWidth:280 }}>
        Votre appareil ne dispose pas de capteur biométrique configuré. Vous utiliserez votre mot de passe.
      </div>
      <button onClick={handleSkip} style={{ marginTop:8, background:C, border:'none', color:'#fff', borderRadius:12, padding:'13px 32px', fontSize:15, fontWeight:700, cursor:'pointer', width:'100%', maxWidth:280 }}>
        Continuer avec le mot de passe
      </button>
    </div>
  );

  // ── Disponible ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background:T.bg, position:'absolute', inset:0, overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, boxSizing:'border-box', gap:16 }}>
      <div style={{ fontSize:52 }}>👆</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:20, textAlign:'center' }}>
        Activer la biométrie ?
      </div>
      <div style={{ color:T.muted, fontSize:13, textAlign:'center', lineHeight:1.6, maxWidth:300 }}>
        Connectez-vous à l'Aide-Mémoire avec votre empreinte ou votre visage.
        Le mot de passe reste disponible à tout moment.
      </div>

      {/* Bloc sécurité */}
      <div style={{ background:C+'12', border:`1px solid ${C}33`, borderRadius:12, padding:'12px 16px', maxWidth:300, width:'100%' }}>
        <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:6 }}>🔒 Sécurité</div>
        <div style={{ color:T.muted, fontSize:12, lineHeight:1.6 }}>
          Aucune donnée biométrique n'est stockée dans l'application.
          Le chiffrement AES-256 reste inchangé.
        </div>
      </div>

      {error && (
        <div style={{ color:'#ef4444', fontSize:13, textAlign:'center' }}>{error}</div>
      )}

      {/* Boutons */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
        <button
          onClick={handleEnable}
          disabled={status === 'loading'}
          style={{ background:C, border:'none', color:'#fff', borderRadius:12, padding:'14px', fontSize:15, fontWeight:700, cursor:'pointer', opacity:status==='loading'?0.7:1 }}
        >
          {status === 'loading' ? 'Activation…' : '👆 Activer la biométrie'}
        </button>
        <button
          onClick={handleSkip}
          style={{ background:'none', border:`1px solid ${T.border}`, color:T.muted, borderRadius:12, padding:'13px', fontSize:14, cursor:'pointer' }}
        >
          Plus tard — utiliser le mot de passe
        </button>
      </div>
    </div>
  );
}
