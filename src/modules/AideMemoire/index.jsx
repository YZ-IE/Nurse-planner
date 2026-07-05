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
import GanttView      from './GanttView.jsx';
import OcrScanner     from './OcrScanner.jsx';
import SecureTransfer from './SecureTransfer.jsx';
import ModuleSettings from './ModuleSettings.jsx';
import NavDrawer      from './NavDrawer.jsx';
import { dateStrOffset } from './utils.jsx';

const ACCENT = '#6366f1';
const INITIAL_NAV = { screen: 'consent', service: null, patientId: null, refreshKey: 0, selectedDate: null };

// ─── Purge données daily > aujourd'hui ───────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function purgeOldDailyData() {
  try {
    const keep = new Set([dateStrOffset(0), dateStrOffset(-1), dateStrOffset(-2)]);
    const keys = Object.keys(localStorage).filter(k => k.startsWith('am_daily_'));
    let purged = 0;
    for (const k of keys) {
      const parts   = k.replace('am_daily_', '').split('_');
      const dateStr = parts[parts.length - 1];
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !keep.has(dateStr)) {
        localStorage.removeItem(k);
        purged++;
      }
    }
    if (purged > 0) appendLog('PURGE', `${purged} fichier(s) > 72h supprimé(s)`);
  } catch {}
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AideMemoire({ onBack, onBackOverride }) {
  const [cryptoKey,  setCryptoKey]  = useState(null);
  const [pinExists,  setPinExists]  = useState(null);
  const [nav,        setNav]        = useState(INITIAL_NAV);
  const [warnExpiry, setWarnExpiry] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const hasService = () => nav.service && typeof nav.service === 'object';

  function goBack() {
    const screen = nav.screen;
    const serviceScoped = ['patient', 'quick', 'dayoverview', 'gantt', 'ocr', 'transfer', 'log', 'moduleSettings'];
    if (serviceScoped.includes(screen)) {
      if (hasService()) goTo('service', { refreshKey: nav.refreshKey + 1 }, 'back');
      else goTo('services', { service: null }, 'back');
    } else if (screen === 'service') {
      goTo('services', { service: null }, 'back');
    } else {
      appendLog('LOGOUT', 'Déconnexion manuelle');
      setCryptoKey(null);
      onBack();
      setNav(INITIAL_NAV);
    }
  }

  function handleDrawerSelect(key) {
    setDrawerOpen(false);
    switch (key) {
      case 'dashboard':
        goTo('services', { service: null });
        break;
      case 'patient':
        if (hasService() && nav.patientId) goTo('patient', { patientTab: null });
        else if (hasService()) goTo('service', { refreshKey: nav.refreshKey + 1 });
        else goTo('services', { service: null });
        break;
      case 'clinical':
        if (hasService() && nav.patientId) goTo('patient', { patientTab: 2 });
        else if (hasService()) goTo('service', { refreshKey: nav.refreshKey + 1 });
        else goTo('services', { service: null });
        break;
      case 'dayoverview':
        if (hasService()) goTo('dayoverview', {});
        else goTo('services', { service: null });
        break;
      case 'gantt':
        if (hasService()) goTo('gantt', {});
        else goTo('services', { service: null });
        break;
      case 'log':
        goTo('log', {});
        break;
      case 'transfer':
        goTo('transfer', {});
        break;
      case 'settings':
        goTo('moduleSettings', {});
        break;
      default:
        break;
    }
  }

  function handleLock() {
    setDrawerOpen(false);
    appendLog('LOGOUT', 'Verrouillage manuel depuis le menu');
    setCryptoKey(null);
    setNav(prev => ({ ...prev, screen: 'pin' }));
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
  const screenWrap = (content, { menu = true } = {}) => (
    <div
      key={nav.screen}
      className={slideDir === 'forward' ? 'am-forward' : 'am-back'}
      style={{ position:'fixed', inset:0, overflow:'hidden', background:th.bg }}
    >
      <style>{SLIDE_CSS}</style>
      {content}
      {menu && (
        <NavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentScreen={nav.screen}
          onSelect={handleDrawerSelect}
          onLock={handleLock}
          serviceName={hasService() ? nav.service.name : null}
        />
      )}
    </div>
  );

  if (pinExists === null) return screenWrap(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <span style={{ color:th.muted, fontSize:14 }}>Chargement…</span>
    </div>,
    { menu: false }
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
      }} />,
      { menu: false }
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
      />,
      { menu: false }
    );
  }

  // ── Services ──────────────────────────────────────────────────────────────
  if (nav.screen === 'services') return screenWrap(
    <>{TimeoutBanner}
      <ServicesScreen cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack} onMenu={() => setDrawerOpen(true)}
        onSelectService={service => goTo('service', { service, patientId: null })}
        onImport={() => goTo('transfer', { service: '__import__' })} />
    </>
  );

  // ── Vue service ───────────────────────────────────────────────────────────
  if (nav.screen === 'service' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <ServiceView
        service={nav.service} cryptoKey={cryptoKey} accentColor={ACCENT}
        refreshKey={nav.refreshKey} onBack={goBack} onMenu={() => setDrawerOpen(true)}
        onSelectPatient={patientId => goTo('patient', { patientId, patientTab: null })}
        selectedDate={nav.selectedDate || dateStrOffset(0)}
        onDateChange={date => setNav(prev => ({ ...prev, selectedDate: date, refreshKey: prev.refreshKey + 1 }))}
        onQuickEntry={() => goTo('quick')}
        onDayOverview={() => goTo('dayoverview')}
        onServiceUpdate={handleServiceUpdate}
        onTransfer={() => goTo('transfer')}
        onLog={() => goTo('log')}
        onOcr={() => goTo('ocr')}
      />
    </>
  );

  // ── Fiche patient ─────────────────────────────────────────────────────────
  if (nav.screen === 'patient' && nav.service && nav.patientId) return screenWrap(
    <>{TimeoutBanner}
      <PatientSheet patientId={nav.patientId} service={nav.service}
        selectedDate={nav.selectedDate || dateStrOffset(0)}
        cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack} onMenu={() => setDrawerOpen(true)}
        initialTab={nav.patientTab}
        onNavigate={(pid) => goTo('patient', { patientId: pid })} />
    </>
  );

  // ── Saisie rapide ─────────────────────────────────────────────────────────
  if (nav.screen === 'quick' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <QuickEntry service={nav.service} cryptoKey={cryptoKey} accentColor={ACCENT} onBack={goBack} onMenu={() => setDrawerOpen(true)}
        selectedDate={nav.selectedDate || dateStrOffset(0)}
        onNavigate={(pid) => goTo('patient', { patientId: pid, patientTab: null })} />
    </>
  );

  // ── Vue du jour ───────────────────────────────────────────────────────────
  if (nav.screen === 'dayoverview' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <DayOverview service={nav.service} cryptoKey={cryptoKey} onBack={goBack} onMenu={() => setDrawerOpen(true)} selectedDate={nav.selectedDate || dateStrOffset(0)} />
    </>
  );

  // ── Vue Gantt ─────────────────────────────────────────────────────────────
  if (nav.screen === 'gantt' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <GanttView service={nav.service} cryptoKey={cryptoKey} onBack={goBack} onMenu={() => setDrawerOpen(true)} selectedDate={nav.selectedDate || dateStrOffset(0)} />
    </>
  );

  // ── Scanner OCR ───────────────────────────────────────────────────────────
  if (nav.screen === 'ocr' && nav.service) return screenWrap(
    <>{TimeoutBanner}
      <OcrScanner service={nav.service} cryptoKey={cryptoKey} onBack={goBack} onMenu={() => setDrawerOpen(true)} />
    </>
  );

  // ── Transfert sécurisé ────────────────────────────────────────────────────
  if (nav.screen === 'transfer') return screenWrap(
    <>{TimeoutBanner}
      <SecureTransfer service={nav.service !== '__import__' ? nav.service : null} cryptoKey={cryptoKey} onBack={goBack} onMenu={() => setDrawerOpen(true)} />
    </>
  );

  // ── Journal d'accès ───────────────────────────────────────────────────────
  if (nav.screen === 'log') return screenWrap(
    <>{TimeoutBanner}
      <AccessLog onBack={goBack} onMenu={() => setDrawerOpen(true)} />
    </>
  );

  // ── Paramètres du module ─────────────────────────────────────────────────
  if (nav.screen === 'moduleSettings') return screenWrap(
    <>{TimeoutBanner}
      <ModuleSettings onBack={goBack} onMenu={() => setDrawerOpen(true)} onLock={handleLock} />
    </>
  );

  return null;
}
