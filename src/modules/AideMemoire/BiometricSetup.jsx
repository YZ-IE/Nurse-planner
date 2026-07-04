/**
 * BiometricSetup.jsx — Activation biométrique
 * Deux modes :
 *   - afterCreate : appelé juste après la création du PIN (pin fourni)
 *   - standalone  : appelé depuis l'écran de déverrouillage (demande le PIN)
 */
import { useState, useEffect } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, Banner, Field } from '../../ui/index.js';
import { savePinForBiometric, verifyPin } from './crypto.js';

const ACCENT = '#6366f1';

export default function BiometricSetup({ pin: pinProp, onDone }) {
  const standalone = !pinProp; // pas de PIN fourni = mode standalone

  const [status,   setStatus]   = useState('checking');
  const [pin,      setPin]      = useState(pinProp || '');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');

  const C = ACCENT;

  useEffect(() => { checkBiometric(); }, []);

  async function checkBiometric() {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const info = await BiometricAuth.checkBiometry();
      setStatus(info.isAvailable ? 'available' : 'unavailable');
    } catch { setStatus('unavailable'); }
  }

  async function handleEnable() {
    setError('');
    // En mode standalone, vérifier le PIN d'abord
    if (standalone) {
      if (pin.length < 12) { setError('Saisissez votre mot de passe pour confirmer.'); return; }
      const key = await verifyPin(pin);
      if (!key) { setError('Mot de passe incorrect.'); setPin(''); return; }
    }

    setStatus('loading');
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: "Confirmer l'activation de la biométrie",
        cancelTitle: 'Annuler',
        allowDeviceCredential: false,
      });
      const pinToStore = standalone ? pin : pinProp;
      const ok = await savePinForBiometric(pinToStore);
      if (!ok) throw new Error();
      setStatus('done');
      setTimeout(() => onDone(), 1200);
    } catch (e) {
      if (e?.code === 'userCancel' || e?.message?.includes('cancel')) {
        setStatus('available');
      } else {
        setError('Activation échouée.');
        setStatus('available');
      }
    }
  }

  if (status === 'checking') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:T.muted }}>Vérification…</span>
    </div>
  );

  if (status === 'done') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:28 }}>
      <div style={{ fontSize:52 }}>✅</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:18 }}>Biométrie activée !</div>
      <div style={{ color:T.muted, fontSize:13, textAlign:'center' }}>Connexion simplifiée au prochain lancement</div>
    </div>
  );

  if (status === 'unavailable') return (
    <div style={{ background:T.bg, position:'absolute', inset:0, overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, gap:16 }}>
      <div style={{ fontSize:48 }}>🔐</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:18, textAlign:'center' }}>Biométrie non disponible</div>
      <div style={{ color:T.muted, fontSize:13, textAlign:'center', lineHeight:1.6, maxWidth:280 }}>
        Votre appareil ne dispose pas de capteur biométrique configuré.
      </div>
      <Btn color={C} size="lg" full onClick={onDone} style={{ maxWidth: 280 }}>
        Continuer
      </Btn>
    </div>
  );

  return (
    <div style={{ background:T.bg, position:'absolute', inset:0, overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28, gap:16, boxSizing:'border-box' }}>
      <button onClick={onDone} style={{ position:'absolute', top:14, left:8, background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', width:48, height:48, display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>←</button>

      <div style={{ fontSize:52 }}>👆</div>
      <div style={{ color:T.text, fontWeight:700, fontSize:20, textAlign:'center' }}>Activer la biométrie</div>
      <div style={{ color:T.muted, fontSize:13, textAlign:'center', lineHeight:1.6, maxWidth:300 }}>
        Connectez-vous avec votre empreinte ou visage. Le mot de passe reste disponible en fallback.
      </div>

      <div style={{ background:C+'12', border:`1px solid ${C}33`, borderRadius:12, padding:'12px 16px', maxWidth:300, width:'100%' }}>
        <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:4 }}>🔒 Sécurité</div>
        <div style={{ color:T.muted, fontSize:12, lineHeight:1.6 }}>
          Aucune donnée biométrique stockée dans l'app. Chiffrement AES-256 inchangé.
        </div>
      </div>

      {standalone && (
        <div style={{ width:'100%', maxWidth:300 }}>
          <Field label="Confirmer votre mot de passe">
            <div style={{ position:'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Votre mot de passe"
                style={{ ...s.input, paddingRight:52, height:tk.touch.input, fontSize:tk.font.base }}
              />
              <button onClick={() => setShowPwd(v=>!v)} aria-label="Afficher le mot de passe" style={{ position:'absolute', right:0, top:0, bottom:0, width:48, background:'none', border:'none', cursor:'pointer', fontSize:16, color:T.muted, WebkitTapHighlightColor:'transparent' }}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </Field>
        </div>
      )}

      {error && <Banner kind="danger" icon="⚠️" style={{ maxWidth: 300, width: '100%' }}>{error}</Banner>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
        <Btn color={C} size="lg" full disabled={status==='loading'} onClick={handleEnable}>
          {status === 'loading' ? 'Activation…' : '👆 Activer'}
        </Btn>
        <Btn color={T.muted} variant="outline" full onClick={onDone}>
          Plus tard
        </Btn>
      </div>
    </div>
  );
}
