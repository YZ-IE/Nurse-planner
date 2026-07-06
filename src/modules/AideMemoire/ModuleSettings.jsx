/**
 * ModuleSettings.jsx — Aide-Mémoire
 * Paramètres du module : biométrie, verrouillage, rappel sécurité.
 */
import { useState } from 'react';
import { T, s } from '../../theme.js';
import MenuButton from './MenuButton.jsx';
import BiometricSetup from './BiometricSetup.jsx';

export default function ModuleSettings({ onBack, onMenu, onLock }) {
  const [showBiometric, setShowBiometric] = useState(false);

  if (showBiometric) return <BiometricSetup onDone={() => setShowBiometric(false)} />;

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuButton onClick={onMenu} />
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>⚙️ Paramètres</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>
        <div style={{ ...s.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>👆 Biométrie</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>Déverrouillage par empreinte / visage</div>
            </div>
            <button onClick={() => setShowBiometric(true)} style={{ ...s.btn('#6366f1'), padding: '9px 16px', fontSize: 13 }}>
              Configurer
            </button>
          </div>
        </div>

        <div style={{ ...s.card }}>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>⏱ Session</div>
          <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
            Verrouillage automatique après 5 min d'inactivité. Les données sont chiffrées AES et stockées uniquement sur cet appareil.
          </div>
        </div>

        <button onClick={onLock} style={{ width: '100%', background: '#f43f5e14', border: '1px solid #f43f5e33', borderRadius: 12, color: '#f43f5e', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          🔒 Verrouiller maintenant
        </button>
      </div>
    </div>
  );
}
