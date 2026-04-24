/**
 * index.jsx — Module Aide-Mémoire v6
 * Écrans : consent · pin · services · service · patient · quick · dayoverview · transfer · log
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { T } from '../../theme.js';
import { isPinSet, secureGet, secureSet, SEC } from './crypto.js';
import ConsentScreen, { isConsentGiven } from './ConsentScreen.jsx';
import AccessLog, { appendLog }           from './AccessLog.jsx';

import PinScreen      from './PinScreen.jsx';
import ServicesScreen from './ServicesScreen.jsx';
import ServiceView    from './ServiceView.jsx';
import PatientSheet   from './PatientSheet.jsx';
import QuickEntry     from './QuickEntry.jsx';
import DayOverview    from './DayOverview.jsx';
import SecureTransfer from './SecureTransfer.jsx';

const ACCENT = '#6366f1';
const INITIAL_NAV = { screen: 'consent', service: null, patientId: null, refreshKey: 0 };

// ─── Purge données daily > aujourd'hui ───────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function purgeOldDailyData() {
  try {
    const today  = todayStr();
    const keys   = Object.keys(localStorage).filter(k => k.startsWith('am_daily_'));
    let purged   = 0;
    for (const k of keys) {
      const parts   = k.replace('am_daily_', '').split('_');
      const dateStr = parts[parts.length - 1];
      if (dateStr && dateStr !== today && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        localStorage.removeItem(k);
        purged++;
      }
    }
    if (purged > 0) appendLog('PURGE', `${purged} fichier(s) daily supprimé(s)`);
  } catch {}
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AideMemoire({ onBack, onBackOverride }) {
  const [cryptoKey,  setCryptoKey]  = useState(null);
  const [pinExists,  setPinExists]  = useState(null);
  const [nav,        setNav]        = useState(INITIAL_NAV);
  const [warnExpiry, setWarnExpiry] = useState(false);

  const timerRef     = useRef(null);
  const warnTimerRef = useRef(null);

  useEffect(() => {
    isPinSet().then(setPinExists);
    // Si consentement déjà donné → passer directement au PIN
    if (isConsentGiven()) {
      setNav(prev => ({ ...prev, screen: 'pin' }));
    }
  }, []);

  // ── Timeout session 5 min ────────────────────────────────────────────────
  const resetSessionTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(warnTimerRef.current);
    setWarnExpiry(false);
    if (!cryptoKey) return;
    warnTimerRef.current = setTimeout(() => setWarnExpiry(true), SEC.SESSION_TIMEOUT - SEC.WARN_BEFORE);
    timerRef.current = setTimeout(() => {
      appendLog('SESSION_EXPIRED', 'Inactivité > 5 min');
      setCryptoKey(null);
      setNav(prev => ({ ...prev, screen: 'pin' }));
      setWarnExpiry(false);
    }, SEC.SESSION_TIMEOUT);
  }, [cryptoKey]);

  useEffect(() => {
    if (!cryptoKey) return;
    const events = ['click', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetSessionTimer, { passive: true }));
    const handleViz = () => { if (!document.hidden) resetSessionTimer(); };
    document.addEventListener('visibilitychange', handleViz);
    resetSessionTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetSessionTimer));
      document.removeEventListener('visibilitychange', handleViz);
      clearTimeout(timerRef.current);
      clearTimeout(warnTimerRef.current);
    };
  }, [cryptoKey, resetSessionTimer]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(screen, extras = {}) { setNav(prev => ({ ...prev, screen, ...extras })); }

  function goBack() {
    setNav(prev => {
      switch (prev.screen) {
        case 'patient':
        case 'quick':
        case 'dayoverview':
        case 'transfer':
        case 'log':
          return { ...prev, screen: 'service', refreshKey: prev.refreshKey + 1 };
        case 'service':
          return { ...prev, screen: 'services', service: null };
        case 'services':
          appendLog('LOGOUT', 'Déconnexion manuelle');
          setCryptoKey(null);
          onBack();
          return INITIAL_NAV;
        default:
          setCryptoKey(null);
          onBack();
          return INITIAL_NAV;
      }
    });
  }

  useEffect(() => {
    onBackOverride?.(goBack);
    return () => onBackOverride?.(null);
  }, [nav.screen]); // eslint-disable-line

  async function handleServiceUpdate(updatedService) {
    setNav(prev => ({ ...prev, service: updatedService }));
    try {
      const services = await secureGet('services', cryptoKey) || [];
      await secureSet('services', services.map(sv => sv.id === updatedService.id ? updatedService : sv), cryptoKey);
    } catch (e) { console.error('[AideMemoire] handleServiceUpdate error:', e); }
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  if (pinExists === null) return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
    </div>
  );

  // ── Bandeau timeout ───────────────────────────────────────────────────────
  const TimeoutBanner = warnExpiry ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: '#f97316', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
      ⏱ Session expire dans moins d'1 min — Touchez l'écran pour continuer
    </div>
  ) : null;

  // ── Consentement (premier lancement uniquement) ───────────────────────────
  if (nav.screen === 'consent') {
    return (
      <ConsentScreen onAccepted={() => {
        appendLog('CONSENT', 'Consentement donné');
        goTo('pin');
      }} />
    );
  }

  // ── PIN / Mot de passe ────────────────────────────────────────────────────
  if (!cryptoKey || nav.screen === 'pin') {
    return (
      <PinScreen
        pinExists={pinExists}
        accentColor={ACCENT}
        onUnlocked={async key => {
          appendLog('LOGIN_OK', 'Authentification réussie');
          setCryptoKey(key);
          await purgeOldDailyData();
          goTo('services');
        }}
        onBack={onBack}
      />
    );
  }

  // ── Services ──────────────────────────────────────────────────────────────
  if (nav.screen === 'services') return (
    <>{TimeoutBanner}
      <ServicesScreen cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack}
        onSelectService={service => goTo('service', { service, patientId: null })}
        onImport={() => goTo('transfer', { service: '__import__' })} />
    </>
  );

  // ── Vue service ───────────────────────────────────────────────────────────
  if (nav.screen === 'service' && nav.service) return (
    <>{TimeoutBanner}
      <ServiceView
        service={nav.service} cryptoKey={cryptoKey} accentColor={ACCENT}
        refreshKey={nav.refreshKey} onBack={goBack}
        onSelectPatient={patientId => goTo('patient', { patientId })}
        onQuickEntry={() => goTo('quick')}
        onDayOverview={() => goTo('dayoverview')}
        onServiceUpdate={handleServiceUpdate}
        onTransfer={() => goTo('transfer')}
        onLog={() => goTo('log')}
      />
    </>
  );

  // ── Fiche patient ─────────────────────────────────────────────────────────
  if (nav.screen === 'patient' && nav.service && nav.patientId) return (
    <>{TimeoutBanner}
      <PatientSheet patientId={nav.patientId} service={nav.service}
        cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack} />
    </>
  );

  // ── Saisie rapide ─────────────────────────────────────────────────────────
  if (nav.screen === 'quick' && nav.service) return (
    <>{TimeoutBanner}
      <QuickEntry service={nav.service} cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack} />
    </>
  );

  // ── Vue du jour ───────────────────────────────────────────────────────────
  if (nav.screen === 'dayoverview' && nav.service) return (
    <>{TimeoutBanner}
      <DayOverview service={nav.service} cryptoKey={cryptoKey} onBack={goBack} />
    </>
  );

  // ── Transfert sécurisé ────────────────────────────────────────────────────
  if (nav.screen === 'transfer') return (
    <>{TimeoutBanner}
      <SecureTransfer service={nav.service !== '__import__' ? nav.service : null} cryptoKey={cryptoKey} onBack={goBack} />
    </>
  );

  // ── Journal d'accès ───────────────────────────────────────────────────────
  if (nav.screen === 'log') return (
    <>{TimeoutBanner}
      <AccessLog onBack={goBack} />
    </>
  );

  return null;
}
