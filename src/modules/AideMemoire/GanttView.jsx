/**
 * GanttView.jsx — Vue Gantt journalière
 * Timeline horizontale des soins planifiés pour tous les patients du service.
 */

import { useMemo } from 'react';
import { T } from '../../theme.js';
import { getCareType } from './careTypes.js';
import { computeSlots } from './ServiceView.jsx';

const H_START   = 6;    // 6h00
const H_END     = 22;   // 22h00
const PX_HR     = 72;   // pixels par heure
const ROW_H     = 56;   // hauteur d'une ligne patient
const LEFT_W    = 76;   // largeur colonne nom
const BLOCK_W   = 34;   // largeur d'un bloc soin
const BLOCK_H   = 28;   // hauteur d'un bloc soin
const TOTAL_W   = (H_END - H_START) * PX_HR;

function timeToX(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const x = (h - H_START + m / 60) * PX_HR;
  return x < 0 || x > TOTAL_W ? null : x;
}

function nowX() {
  const n = new Date();
  return timeToX(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
}

export default function GanttView({ service, patients, dailyData, onClose }) {
  const slots = computeSlots(service);
  const slotLabel = Object.fromEntries(slots.map(s => [s.slotIndex, s.roomLabel]));

  const presentPts = useMemo(() =>
    [...patients.filter(p => p.present)].sort((a, b) => {
      const la = slotLabel[a.bedNumber] ?? String(a.bedNumber);
      const lb = slotLabel[b.bedNumber] ?? String(b.bedNumber);
      return la.localeCompare(lb, 'fr', { numeric: true });
    }),
    [patients] // eslint-disable-line
  );

  const hours = Array.from({ length: H_END - H_START + 1 }, (_, i) => H_START + i);
  const cx = nowX();

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 200, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: T.bg }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>📅 Vue Gantt</div>
          <div style={{ color: T.muted, fontSize: 12 }}>{service.name} · {presentPts.length} patient{presentPts.length > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Corps Gantt — scroll x + y */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: LEFT_W + TOTAL_W + 16 }}>

          {/* ── Axe temps (sticky top) ── */}
          <div style={{
            display: 'flex', position: 'sticky', top: 0, zIndex: 6,
            background: T.surface, borderBottom: `1px solid ${T.border}`,
          }}>
            {/* Coin haut-gauche */}
            <div style={{
              width: LEFT_W, flexShrink: 0,
              position: 'sticky', left: 0, zIndex: 7,
              background: T.surface, borderRight: `1px solid ${T.border}`,
            }} />
            {/* Heures */}
            <div style={{ position: 'relative', width: TOTAL_W, height: 26, flexShrink: 0 }}>
              {hours.map(h => (
                <span key={h} style={{
                  position: 'absolute',
                  left: (h - H_START) * PX_HR,
                  top: 4,
                  color: T.muted, fontSize: 10, fontWeight: 600,
                  transform: 'translateX(-50%)',
                  userSelect: 'none',
                }}>
                  {h}h
                </span>
              ))}
              {/* Ligne heure courante */}
              {cx !== null && (
                <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 2, background: '#f43f5e66' }} />
              )}
            </div>
          </div>

          {/* ── Lignes patients ── */}
          {presentPts.length === 0 && (
            <div style={{ padding: '32px 24px', color: T.muted, fontSize: 13 }}>Aucun patient présent dans ce service.</div>
          )}

          {presentPts.map((pt, rowIdx) => {
            const daily = dailyData[pt.id] || {};
            const care  = (daily.careEntries || []).filter(e => e.plannedTime);
            const bed   = slotLabel[pt.bedNumber] ?? String(pt.bedNumber);

            return (
              <div key={pt.id} style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, height: ROW_H }}>

                {/* Colonne patient (sticky left) */}
                <div style={{
                  width: LEFT_W, flexShrink: 0,
                  position: 'sticky', left: 0, zIndex: 4,
                  background: rowIdx % 2 === 0 ? T.surface : T.bg,
                  borderRight: `1px solid ${T.border}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '0 6px',
                }}>
                  <div style={{ color: T.muted, fontSize: 9, fontWeight: 700, lineHeight: 1.2 }}>🛏 {bed}</div>
                  <div style={{ color: T.text, fontSize: 12, fontWeight: 800, lineHeight: 1.3 }}>{pt.initials}</div>
                  <div style={{ color: T.muted, fontSize: 9, lineHeight: 1.2 }}>{pt.gender} {pt.age}a</div>
                </div>

                {/* Timeline row */}
                <div style={{
                  position: 'relative',
                  width: TOTAL_W, flexShrink: 0,
                  background: rowIdx % 2 === 0 ? T.surface : T.bg,
                }}>
                  {/* Quadrillage vertical */}
                  {hours.map(h => (
                    <div key={h} style={{
                      position: 'absolute', left: (h - H_START) * PX_HR, top: 0, bottom: 0,
                      width: 1, background: T.border, opacity: 0.4,
                    }} />
                  ))}

                  {/* Ligne heure courante */}
                  {cx !== null && (
                    <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 2, background: '#f43f5e', zIndex: 3, opacity: 0.7 }} />
                  )}

                  {/* Blocs soins */}
                  {care.map(e => {
                    const x  = timeToX(e.plannedTime);
                    if (x === null) return null;
                    const ct = getCareType(e.type);
                    return (
                      <div
                        key={e.id}
                        title={`${e.label}  ${e.plannedTime}${e.done ? `  ✓ ${e.doneTime || ''}` : ''}`}
                        style={{
                          position:   'absolute',
                          left:       x - BLOCK_W / 2,
                          top:        (ROW_H - BLOCK_H) / 2,
                          width:      BLOCK_W,
                          height:     BLOCK_H,
                          borderRadius: 6,
                          background: e.done ? ct.color + 'cc' : ct.color + '1a',
                          border:     `1.5px solid ${ct.color}${e.done ? '' : '88'}`,
                          display:    'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize:   15,
                          zIndex:     2,
                          boxSizing:  'border-box',
                        }}
                      >
                        {ct.emoji}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div style={{
        padding: '10px 16px 28px', borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 16, flexShrink: 0, flexWrap: 'wrap',
        background: T.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: '#06b6d4cc', border: '1.5px solid #06b6d4' }} />
          <span style={{ color: T.muted, fontSize: 11 }}>Réalisé</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: '#06b6d41a', border: '1.5px solid #06b6d488' }} />
          <span style={{ color: T.muted, fontSize: 11 }}>En attente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 2, height: 18, background: '#f43f5e' }} />
          <span style={{ color: T.muted, fontSize: 11 }}>Maintenant</span>
        </div>
        <div style={{ color: T.muted, fontSize: 11, fontStyle: 'italic' }}>Appuyez sur un bloc pour le détail</div>
      </div>
    </div>
  );
}
