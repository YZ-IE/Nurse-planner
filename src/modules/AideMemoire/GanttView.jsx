/**
 * GanttView.jsx — Vue Gantt journalière v2
 * - Timeline 00:00-23:59
 * - Couloirs (lanes) pour éviter la superposition
 * - Validation / suppression / saisie de valeur au tap
 * - Zoom pinch + boutons ±
 * - Responsive paysage
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, IconBtn, Field, Sheet, toast } from '../../ui/index.js';
import { getCareType } from './careTypes.js';
import { computeSlots } from './ServiceView.jsx';
import { secureSet } from './crypto.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

const BASE_PX_HR = 56;   // px/heure à zoom 1×
const LEFT_W     = 72;   // largeur colonne patient
const BLOCK_W    = 30;   // largeur d'un bloc soin (alimente assignLanes — ne pas élargir)
const BASE_BH    = 30;   // hauteur bloc (portrait)
const HIT_W      = 44;   // zone de tap invisible autour d'un bloc
const ROW_PAD    = 8;    // marge haut/bas dans la ligne

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToX(timeStr, pxPerHr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return (h + m / 60) * pxPerHr;
}

function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function currentTimeStr() {
  const n = new Date();
  return n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Répartit les blocs en couloirs pour éviter la superposition
function assignLanes(careItems, pxPerHr) {
  const sorted = [...careItems]
    .filter(e => e.plannedTime)
    .sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));

  // lanes[i] = x du dernier bloc placé dans ce couloir
  const laneEnds = [];
  const result = [];

  for (const item of sorted) {
    const x = timeToX(item.plannedTime, pxPerHr);
    if (x === null) continue;

    let placed = false;
    for (let li = 0; li < laneEnds.length; li++) {
      if (x - laneEnds[li] >= BLOCK_W + 3) {
        laneEnds[li] = x;
        result.push({ item, lane: li });
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(x);
      result.push({ item, lane: laneEnds.length - 1 });
    }
  }

  return { assignments: result, laneCount: Math.max(1, laneEnds.length) };
}

// ─── Modal action soin ────────────────────────────────────────────────────────

function CareActionModal({ patient, care, bedLabel, onValidate, onDelete, onClose }) {
  const ct = getCareType(care.type);

  const [subFields, setSubFields] = useState(() => {
    if (ct.id !== 'constantes_vitales') return null;
    const parsed = {};
    if (care.doneValue) {
      care.doneValue.split('|').forEach(part => {
        (ct.subFields || []).forEach(sf => {
          const key = sf.label.split(' ')[0].replace('°','°');
          const m = part.trim().match(new RegExp(`^${key}[^:]*:\\s*(.+)$`, 'i'));
          if (m) parsed[sf.key] = m[1].trim();
        });
      });
    }
    return Object.fromEntries((ct.subFields || []).map(sf => [sf.key, parsed[sf.key] || '']));
  });

  const [simpleValue, setSimpleValue] = useState(care.doneValue || '');

  function buildConstantesValue() {
    return (ct.subFields || [])
      .filter(sf => (subFields[sf.key] || '').trim())
      .map(sf => `${sf.label.split(' ')[0]}: ${subFields[sf.key].trim()}`)
      .join(' | ');
  }

  function handleValidate() {
    let val = null;
    if (ct.id === 'constantes_vitales') val = buildConstantesValue() || null;
    else if (ct.valueLabel && simpleValue.trim()) val = simpleValue.trim();
    onValidate(val, false);
  }

  return (
    <Sheet
      title={`${ct.emoji} ${care.label}`}
      subtitle={`${patient.initials} · 🛏 ${bedLabel} · ⏰ ${care.plannedTime}`}
      onClose={onClose}
      zIndex={300}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          {!care.done ? (
            <>
              <Btn color={T.success} variant="soft" size="lg" icon="✓" onClick={handleValidate} style={{ flex: 2 }}>
                Valider
              </Btn>
              <Btn color={T.danger} variant="soft" size="lg" onClick={onDelete} style={{ flex: 1 }}>
                🗑
              </Btn>
            </>
          ) : (
            <>
              <Btn color={T.muted} variant="outline" size="lg" onClick={() => onValidate(null, true)} style={{ flex: 1 }}>
                ↩ Annuler validation
              </Btn>
              <Btn color={T.danger} variant="soft" size="lg" onClick={onDelete}>
                🗑
              </Btn>
            </>
          )}
        </div>
      }
    >
      {/* Soin déjà réalisé */}
      {care.done && (
        <div style={{ background: T.successDim, border: `1px solid ${T.success}33`, borderRadius: tk.radius.sm, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ color: T.success, fontSize: tk.font.base, fontWeight: 700 }}>✓ Réalisé à {care.doneTime || '—'}</div>
          {care.doneValue && <div style={{ color: T.text, fontSize: tk.font.sm, marginTop: 4, lineHeight: 1.5 }}>{care.doneValue}</div>}
        </div>
      )}

      {/* Constantes vitales : sous-champs */}
      {!care.done && ct.id === 'constantes_vitales' && subFields && (
        <div style={{ marginBottom: 4 }}>
          {(ct.subFields || []).map(sf => (
            <Field key={sf.key} label={sf.label}>
              <input
                value={subFields[sf.key]}
                onChange={e => setSubFields(p => ({ ...p, [sf.key]: e.target.value }))}
                placeholder={sf.placeholder}
                style={{ ...s.input, width: '100%', boxSizing: 'border-box', fontSize: tk.font.base, height: tk.touch.input }}
              />
            </Field>
          ))}
        </div>
      )}

      {/* Soin avec valeur simple */}
      {!care.done && ct.valueLabel && ct.id !== 'constantes_vitales' && (
        <Field label={ct.valueLabel}>
          <input
            value={simpleValue}
            onChange={e => setSimpleValue(e.target.value)}
            placeholder={ct.valuePlaceholder || ''}
            style={{ ...s.input, width: '100%', boxSizing: 'border-box', fontSize: tk.font.base, height: tk.touch.input }}
          />
        </Field>
      )}
    </Sheet>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GanttView({ service, patients, dailyData: initDaily, onClose, cryptoKey, selectedDate, onDailyDataChange }) {

  const [dailyData,    setDailyData]    = useState(initDaily);
  const [zoom,         setZoom]         = useState(1);
  const [selectedCare, setSelectedCare] = useState(null);
  const [isLandscape,  setIsLandscape]  = useState(() => window.innerWidth > window.innerHeight);

  const zoomRef    = useRef(zoom);
  const pinchRef   = useRef({ dist: null, startZoom: 1 });
  const scrollRef  = useRef(null);

  // Sync zoom ref
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pinch-to-zoom (passive:false requis pour preventDefault)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (e.touches.length !== 2) return;
      pinchRef.current.dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current.startZoom = zoomRef.current;
      e.preventDefault();
    }

    function onTouchMove(e) {
      if (e.touches.length !== 2 || !pinchRef.current.dist) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const next = Math.max(0.3, Math.min(4, pinchRef.current.startZoom * (dist / pinchRef.current.dist)));
      zoomRef.current = next;
      setZoom(next);
      e.preventDefault();
    }

    function onTouchEnd() { pinchRef.current.dist = null; }

    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, []); // handlers lisent zoomRef, pas zoom

  // ── Computed ─────────────────────────────────────────────────────────────

  const pxPerHr  = BASE_PX_HR * zoom;
  const TOTAL_W  = 24 * pxPerHr;
  const blockH   = isLandscape ? 22 : BASE_BH;
  const laneH    = blockH + 6;
  const rowPad   = isLandscape ? 5 : ROW_PAD;
  function rowHeight(n) { return rowPad * 2 + Math.max(1, n) * laneH; }

  const slots    = computeSlots(service);
  const slotLbl  = Object.fromEntries(slots.map(s => [s.slotIndex, s.roomLabel]));

  const presentPts = useMemo(() =>
    [...patients.filter(p => p.present)].sort((a, b) => {
      const la = slotLbl[a.bedNumber] ?? String(a.bedNumber);
      const lb = slotLbl[b.bedNumber] ?? String(b.bedNumber);
      return la.localeCompare(lb, 'fr', { numeric: true });
    }),
    [patients] // eslint-disable-line
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // N'affiche qu'une heure sur N selon le zoom pour éviter les labels trop serrés
  function showHourLabel(h) {
    if (zoom >= 1)    return true;
    if (zoom >= 0.6)  return h % 2 === 0;
    if (zoom >= 0.35) return h % 4 === 0;
    return h % 6 === 0;
  }

  const cx = timeToX(nowHHMM(), pxPerHr);

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  async function persistDailyData(next) {
    setDailyData(next);
    onDailyDataChange?.(next);
    if (cryptoKey && selectedDate) {
      await secureSet(`daily_${service.id}_${selectedDate}`, next, cryptoKey);
    }
  }

  async function handleValidate(patient, careId, doneValue, undo) {
    const entry = dailyData[patient.id] || { fieldValues: {}, events: [], careEntries: [] };
    const updatedCare = (entry.careEntries || []).map(e =>
      e.id !== careId ? e
      : undo
        ? { ...e, done: false, doneTime: null, doneValue: null }
        : { ...e, done: true, doneTime: currentTimeStr(), doneValue }
    );
    await persistDailyData({ ...dailyData, [patient.id]: { ...entry, careEntries: updatedCare } });
    setSelectedCare(null);
    if (!undo) toast('Soin validé');
  }

  async function handleDelete(patient, careId) {
    const entry = dailyData[patient.id] || { fieldValues: {}, events: [], careEntries: [] };
    const updatedCare = (entry.careEntries || []).filter(e => e.id !== careId);
    await persistDailyData({ ...dailyData, [patient.id]: { ...entry, careEntries: updatedCare } });
    setSelectedCare(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const headerH = isLandscape ? 42 : 56;

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ height: headerH, padding: '0 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: T.bg }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: isLandscape ? 13 : 15 }}>📅 Vue Gantt — {service.name}</div>
          {!isLandscape && <div style={{ color: T.muted, fontSize: 11 }}>{presentPts.length} patients · Pinch ou ± pour zoomer</div>}
        </div>

        {/* Zoom buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <IconBtn label="Dézoomer" variant="outline" size={44} fontSize={20}
            onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.25).toFixed(2))))}>−</IconBtn>
          <span style={{ color: T.muted, fontSize: tk.font.xs, minWidth: 38, textAlign: 'center', flexShrink: 0 }}>{Math.round(zoom * 100)}%</span>
          <IconBtn label="Zoomer" variant="outline" size={44} fontSize={20}
            onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.25).toFixed(2))))}>+</IconBtn>
        </div>
      </div>

      {/* ── Corps Gantt (scroll x+y, pinch-to-zoom) ── */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: LEFT_W + TOTAL_W }}>

          {/* Axe temps (sticky top) */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 6, background: T.surface, borderBottom: `1px solid ${T.border}` }}>
            {/* Coin gauche */}
            <div style={{ width: LEFT_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 7, background: T.surface, borderRight: `1px solid ${T.border}` }} />
            {/* Labels heures */}
            <div style={{ position: 'relative', width: TOTAL_W, height: isLandscape ? 20 : 24, flexShrink: 0 }}>
              {hours.map(h => showHourLabel(h) && (
                <span key={h} style={{ position: 'absolute', left: h * pxPerHr, top: isLandscape ? 2 : 4, color: T.muted, fontSize: 9, fontWeight: 600, transform: 'translateX(-50%)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  {String(h).padStart(2, '0')}h
                </span>
              ))}
              {/* Heure courante */}
              {cx !== null && <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 2, background: T.danger + '55' }} />}
            </div>
          </div>

          {/* Patients */}
          {presentPts.length === 0 && (
            <div style={{ padding: '32px 24px', color: T.muted, fontSize: 13 }}>Aucun patient présent dans ce service.</div>
          )}

          {presentPts.map((pt, rowIdx) => {
            const daily  = dailyData[pt.id] || {};
            const care   = (daily.careEntries || []).filter(e => e.plannedTime);
            const bed    = slotLbl[pt.bedNumber] ?? String(pt.bedNumber);
            const { assignments, laneCount } = assignLanes(care, pxPerHr);
            const rh     = rowHeight(laneCount);
            const rowBg  = rowIdx % 2 === 0 ? T.surface : T.bg;

            return (
              <div key={pt.id} style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, height: rh }}>

                {/* Colonne patient (sticky left) */}
                <div style={{
                  width: LEFT_W, flexShrink: 0,
                  position: 'sticky', left: 0, zIndex: 4,
                  background: rowBg, borderRight: `1px solid ${T.border}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 6px',
                }}>
                  <div style={{ color: T.muted, fontSize: 9, fontWeight: 700 }}>🛏 {bed}</div>
                  <div style={{ color: T.text, fontSize: isLandscape ? 11 : 12, fontWeight: 800, lineHeight: 1.3 }}>{pt.initials}</div>
                  {!isLandscape && <div style={{ color: T.muted, fontSize: 9 }}>{pt.gender} {pt.age}a</div>}
                </div>

                {/* Timeline row */}
                <div style={{ position: 'relative', width: TOTAL_W, flexShrink: 0, background: rowBg }}>

                  {/* Quadrillage heures */}
                  {hours.map(h => (
                    <div key={h} style={{ position: 'absolute', left: h * pxPerHr, top: 0, bottom: 0, width: 1, background: T.border, opacity: 0.35 }} />
                  ))}

                  {/* Demi-heures (zoom ≥ 1) */}
                  {zoom >= 0.9 && hours.map(h => (
                    <div key={`hh${h}`} style={{ position: 'absolute', left: (h + 0.5) * pxPerHr, top: '25%', bottom: '25%', width: 1, background: T.border, opacity: 0.15 }} />
                  ))}

                  {/* Heure courante */}
                  {cx !== null && (
                    <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 2, background: T.danger, zIndex: 3, opacity: 0.6 }} />
                  )}

                  {/* Blocs soins, répartis en couloirs — zone de tap 44px, visuel inchangé */}
                  {assignments.map(({ item: e, lane }) => {
                    const x  = timeToX(e.plannedTime, pxPerHr);
                    if (x === null) return null;
                    const ct   = getCareType(e.type);
                    const y    = rowPad + lane * laneH;
                    const hitH = Math.max(HIT_W, blockH);
                    return (
                      <div
                        key={e.id}
                        onClick={() => setSelectedCare({ patient: pt, care: e, bedLabel: bed })}
                        title={`${e.label} ${e.plannedTime}${e.done ? ` ✓ ${e.doneTime || ''}` : ''}`}
                        style={{
                          position:   'absolute',
                          left:       x - HIT_W / 2,
                          top:        y - (hitH - blockH) / 2,
                          width:      HIT_W,
                          height:     hitH,
                          display:    'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex:     2, cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div style={{
                          width:      BLOCK_W,
                          height:     blockH,
                          borderRadius: 6,
                          background: e.done ? ct.color + 'cc' : ct.color + '22',
                          border:     `1.5px solid ${ct.color}${e.done ? '' : '99'}`,
                          display:    'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize:   isLandscape ? 12 : 14,
                          boxSizing:  'border-box',
                        }}>
                          {ct.emoji}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Légende ── */}
      <div style={{ padding: `${isLandscape ? 6 : 10}px 14px ${isLandscape ? 6 : 24}px`, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 12, flexShrink: 0, background: T.bg, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 15, height: 15, borderRadius: 3, background: '#06b6d4cc', border: '1.5px solid #06b6d4' }} />
          <span style={{ color: T.muted, fontSize: 10 }}>Réalisé</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 15, height: 15, borderRadius: 3, background: '#06b6d422', border: '1.5px solid #06b6d499' }} />
          <span style={{ color: T.muted, fontSize: 10 }}>En attente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 2, height: 15, background: T.danger, opacity: 0.7 }} />
          <span style={{ color: T.muted, fontSize: 10 }}>Maintenant</span>
        </div>
        <span style={{ color: T.muted, fontSize: 10, fontStyle: 'italic' }}>Tap sur un bloc → valider / supprimer</span>
      </div>

      {/* ── Modal action soin ── */}
      {selectedCare && (
        <CareActionModal
          patient={selectedCare.patient}
          care={selectedCare.care}
          bedLabel={selectedCare.bedLabel}
          onValidate={(val, undo) => handleValidate(selectedCare.patient, selectedCare.care.id, val, undo)}
          onDelete={() => handleDelete(selectedCare.patient, selectedCare.care.id)}
          onClose={() => setSelectedCare(null)}
        />
      )}
    </div>
  );
}
