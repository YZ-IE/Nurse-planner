/**
 * GanttView.jsx — Aide-Mémoire
 * Frise horizontale des soins programmés, un patient par ligne, zoomable
 * au pincement tactile (pinch-to-zoom). Tap sur un bloc = validation immédiate.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { T } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { todayStr, timeStr, isReadOnly, formatDateLabel } from './utils.jsx';
import MenuButton from './MenuButton.jsx';
import SpringCheck from './SpringCheck.jsx';

// Couleurs et emojis des soins (dupliqués ici, cf. DayOverview.jsx, pour éviter la dépendance circulaire)
const CARE_META = {
  constantes_vitales: { emoji: '📊', color: '#06b6d4' },
  antalgie:           { emoji: '💊', color: '#f43f5e' },
  bilan:              { emoji: '🧪', color: '#a78bfa' },
  diurese:            { emoji: '💧', color: '#06b6d4' },
  ecg:                { emoji: '📈', color: '#a78bfa' },
  hgt:                { emoji: '🩸', color: '#f97316' },
  injection:          { emoji: '💉', color: '#a78bfa' },
  pansement:          { emoji: '🩹', color: '#06b6d4' },
  perfusion:          { emoji: '🫙', color: '#22c55e' },
  poids:              { emoji: '⚖️', color: '#22c55e' },
  autre:              { emoji: '📋', color: '#64748b' },
};
function careMeta(type) { return CARE_META[type] || CARE_META.autre; }

const HOUR_START    = 6;   // fenêtre 06h→22h — activité hospitalière type
const HOUR_END      = 22;
const MIN_HOUR_W    = 28;
const MAX_HOUR_W    = 160;
const DEFAULT_HOUR_W = 56;
const LABEL_COL_W   = 96;

function timeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function touchDist(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function GanttView({ service, cryptoKey, onBack, onMenu, selectedDate: selDate }) {
  const today        = todayStr();
  const selectedDate = selDate || today;
  const readOnly     = isReadOnly(selectedDate);

  const [patients,     setPatients]     = useState([]);
  const [dailyData,    setDailyData]    = useState({});
  const [loading,       setLoading]     = useState(true);
  const [hourWidth,     setHourWidth]   = useState(DEFAULT_HOUR_W);
  const [justValidated, setJustValidated] = useState(false);
  const pinchRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey),
      ]);
      const present = (pts || []).filter(p => p.present).sort((a, b) => a.bedNumber - b.bedNumber);
      setPatients(present);
      setDailyData(daily || {});
    } finally { setLoading(false); }
  }, [service.id, cryptoKey, selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveDailyData(next) {
    setDailyData(next);
    if (readOnly) return;
    await secureSet(`daily_${service.id}_${selectedDate}`, next, cryptoKey);
  }

  async function handleToggle(patientId, careId) {
    if (readOnly) return;
    const entry = dailyData[patientId] || {};
    let becameDone = false;
    const next = {
      ...entry,
      careEntries: (entry.careEntries || []).map(e => {
        if (e.id !== careId) return e;
        if (e.done) return { ...e, done: false, doneTime: null, doneValue: null };
        becameDone = true;
        return { ...e, done: true, doneTime: timeStr() };
      }),
    };
    await saveDailyData({ ...dailyData, [patientId]: next });
    if (becameDone) {
      setJustValidated(true);
      setTimeout(() => setJustValidated(false), 650);
    }
  }

  // ── Pinch-to-zoom ────────────────────────────────────────────────────────
  function handleTouchStart(e) {
    if (e.touches.length === 2) pinchRef.current = { dist: touchDist(e.touches), startWidth: hourWidth };
  }
  function handleTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const scale = touchDist(e.touches) / pinchRef.current.dist;
      const next  = Math.round(Math.min(MAX_HOUR_W, Math.max(MIN_HOUR_W, pinchRef.current.startWidth * scale)));
      setHourWidth(next);
    }
  }
  function handleTouchEnd(e) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  if (loading) return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
    </div>
  );

  const totalHours = HOUR_END - HOUR_START;
  const trackWidth = totalHours * hourWidth;

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuButton onClick={onMenu} />
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📊 Vue Gantt{readOnly ? ' 👁' : ''}</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{service.name} · {formatDateLabel(selectedDate)} · pincez pour zoomer</div>
          </div>
        </div>
      </div>

      {/* Frise scrollable — pincement tactile géré ici */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ display: 'inline-block', minWidth: '100%' }}>

          {/* Règle des heures */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 5, background: T.bg, borderBottom: `1px solid ${T.border}`, marginLeft: LABEL_COL_W }}>
            {Array.from({ length: totalHours }, (_, i) => HOUR_START + i).map(h => (
              <div key={h} style={{ width: hourWidth, flexShrink: 0, textAlign: 'center', color: T.muted, fontSize: 11, fontWeight: 600, padding: '6px 0' }}>
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>

          {patients.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 13 }}>Aucun patient présent dans ce service</div>
          )}

          {patients.map(p => {
            const daily   = dailyData[p.id] || {};
            const entries = daily.careEntries || [];
            return (
              <div key={p.id} style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, minHeight: 52 }}>
                <div style={{
                  width: LABEL_COL_W, flexShrink: 0, position: 'sticky', left: 0, background: T.bg, zIndex: 4,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px',
                  borderRight: `1px solid ${T.border}`,
                }}>
                  <div style={{ color: T.text, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.initials}</div>
                  <div style={{ color: T.muted, fontSize: 10 }}>🛏 {p.bedNumber}</div>
                </div>
                <div style={{ position: 'relative', width: trackWidth, flexShrink: 0 }}>
                  {entries.map(entry => {
                    const mins = timeToMinutes(entry.plannedTime) - HOUR_START * 60;
                    if (mins < 0 || mins > totalHours * 60) return null;
                    const left = (mins / 60) * hourWidth;
                    const meta = careMeta(entry.type);
                    const col  = entry.done ? '#22c55e' : meta.color;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => handleToggle(p.id, entry.id)}
                        disabled={readOnly}
                        title={entry.label}
                        style={{
                          position: 'absolute', left, top: '50%', transform: 'translate(0,-50%)',
                          minWidth: 44, minHeight: 32, borderRadius: 8, background: col + '22',
                          border: `1px solid ${col}`, color: col, fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', cursor: readOnly ? 'default' : 'pointer',
                          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                          WebkitTapHighlightColor: 'transparent',
                        }}>
                        <span>{meta.emoji}</span>
                        <span>{entry.plannedTime}</span>
                        {entry.done && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SpringCheck show={justValidated} />
    </div>
  );
}
