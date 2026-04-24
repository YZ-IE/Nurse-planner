/**
 * index.jsx — Module Aide-Mémoire v6
 * Écrans : consent · pin · services · service · patient · quick · dayoverview · transfer · log
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadDarkPref, getTheme } from '../../theme.js';
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
  // ── Navigation avec slide animation (key-based = fiable, bonne direction) ──
  const [slideDir, setSlideDir] = useState('forward');

  const SLIDE_CSS = `
    @keyframes am-from-right { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes am-from-left  { from{transform:translateX(-60px);opacity:0} to{transform:translateX(0);opacity:1} }
    .am-forward { animation: am-from-right 280ms cubic-bezier(0.32,.72,0,1) both; }
    .am-back    { animation: am-from-left  280ms cubic-bezier(0.32,.72,0,1) both; }
  `;

  function goTo(screen, extras = {}, direction = 'forward') {
    setSlideDir(direction);
    setNav(prev => ({ ...prev, screen, ...extras }));
  }

  function goBack() {
    const screen = nav.screen;
    if (screen === 'patient' || screen === 'quick' || screen === 'dayoverview' || screen === 'transfer' || screen === 'log') {
      goTo('service', { refreshKey: nav.refreshKey + 1 }, 'back');
    } else if (screen === 'service') {
      goTo('services', { service: null }, 'back');
    } else {
      appendLog('LOGOUT', 'Déconnexion manuelle');
      setCryptoKey(null);
      onBack();
      setNav(INITIAL_NAV);
    }
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
  const th = getTheme(loadDarkPref());
  const screenWrap = (content) => (
    <div
      key={nav.screen}
      className={slideDir === 'forward' ? 'am-forward' : 'am-back'}
      style={{ position:'fixed', inset:0, overflowY:'auto', background:th.bg }}
    >
      <style>{SLIDE_CSS}</style>
      {content}
    </div>
  );

  if (pinExists === null) return screenWrap(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <span style={{ color:th.muted, fontSize:14 }}>Chargement…</span>
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
    return screenWrap(
      <ConsentScreen onAccepted={() => {
        appendLog('CONSENT', 'Consentement donné');
        goTo('pin');
      }} />
    );
  }

  // ── PIN / Mot de passe ────────────────────────────────────────────────────
  if (!cryptoKey || nav.screen === 'pin') {
    return screenWrap(
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
  if (nav.screen === 'services') return screenWrap(
    <>{TimeoutBanner}
      <ServicesScreen cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack}
        onSelectService={service => goTo('service', { service, patientId: null })}
        onImport={() => goTo('transfer', { service: '__import__' })} />
    </>
  );

  // ── Vue service ───────────────────────────────────────────────────────────
  if (nav.screen === 'service' && nav.service) return screenWrap(
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
  if (nav.screen === 'patient' && nav.service && nav.patientId) return screenWrap(
    <>{TimeoutBanner}
      <PatientSheet patientId={nav.patientId} service={nav.service}
        cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack}
        onNavigate={(pid) => goTo('patient', { patientId: pid })} />
    </>
  );

  // ── Saisie rapide ─────────────────────────────────────────────────────────
  if (nav.screen === 'quick' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <QuickEntry service={nav.service} cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack}
        onNavigate={(pid) => goTo('patient', { patientId: pid })} />
    </>
  );

  // ── Vue du jour ───────────────────────────────────────────────────────────
  if (nav.screen === 'dayoverview' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <DayOverview service={nav.service} cryptoKey={cryptoKey} onBack={goBack} />
    </>
  );

  // ── Transfert sécurisé ────────────────────────────────────────────────────
  if (nav.screen === 'transfer') return screenWrap(
    <>{TimeoutBanner}
      <SecureTransfer service={nav.service !== '__import__' ? nav.service : null} cryptoKey={cryptoKey} onBack={goBack} />
    </>
  );

  // ── Journal d'accès ───────────────────────────────────────────────────────
  if (nav.screen === 'log') return screenWrap(
    <>{TimeoutBanner}
      <AccessLog onBack={goBack} />
    </>
  );

  return null;
}
