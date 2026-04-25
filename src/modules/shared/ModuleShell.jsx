/**
 * ModuleShell.jsx — Coque de navigation list→detail avec animations slide
 * Utilisé par : Urgences, Soins, Organisation, Formation, Médicaments
 *
 * Props :
 *   onBack        — retour vers l'accueil (depuis App)
 *   color         — couleur accent du module
 *   dimBg         — () => string : fond header (évalué à chaque rendu)
 *   icon          — emoji module
 *   title         — titre module
 *   subtitle      — sous-titre optionnel (info card)
 *   items         — tableau d'items à afficher dans la liste
 *   renderItem    — (item, openTool) => JSX : rendu d'un item de liste
 *   renderDetail  — (toolId, closeDetail) => JSX : rendu du détail
 *   initialTool   — outil pré-ouvert (depuis favoris)
 *   headerExtra   — JSX optionnel sous les items (info-card, etc.)
 */

import { useState, useRef, useEffect } from 'react';
import { T } from '../../theme.js';

const DUR = 280; // ms — durée slide interne

const SLIDE_CSS = `
  @keyframes ms-slide-in-r {
    from { transform: translateX(100%); opacity: 0.6; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes ms-slide-out-r {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0.6; }
  }
  @keyframes ms-slide-in-l {
    from { transform: translateX(-18px) scale(0.98); opacity: 0; }
    to   { transform: translateX(0)    scale(1);     opacity: 1; }
  }
  @keyframes ms-slide-out-l {
    from { transform: translateX(0)    scale(1);     opacity: 1; }
    to   { transform: translateX(-18px) scale(0.98); opacity: 0; }
  }
  @keyframes ms-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ms-list-exit   { animation: ms-slide-out-l ${DUR}ms cubic-bezier(0.32,0.72,0,1) both; pointer-events:none; }
  .ms-list-enter  { animation: ms-slide-in-l  ${DUR}ms cubic-bezier(0.32,0.72,0,1) both; }
  .ms-det-enter   { animation: ms-slide-in-r  ${DUR}ms cubic-bezier(0.32,0.72,0,1) both; }
  .ms-det-exit    { animation: ms-slide-out-r ${DUR}ms cubic-bezier(0.32,0.72,0,1) both; pointer-events:none; }
  .ms-fade-up     { animation: ms-fade-up 0.35s ease both; }
  .ms-item:active { transform: scale(0.98); }
  .ms-item        { transition: transform 0.12s ease; -webkit-tap-highlight-color: transparent; }
  .ms-back:active { opacity: 0.7; transform: scale(0.94); }
  .ms-back        { transition: all 0.12s ease; -webkit-tap-highlight-color: transparent; }
`;

export default function ModuleShell({
  onBack,
  color,
  dimBg,
  icon,
  title,
  subtitle,
  items = [],
  renderItem,
  renderDetail,
  initialTool = null,
  headerExtra,
  onFavChange,
  onBackOverride,
}) {
  const [tool,  setTool]  = useState(initialTool);
  const [phase, setPhase] = useState('idle');
  const timers = useRef([]);
  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  // Nettoyage de tous les timers au démontage
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Bouton retour Android — lambda inline (pas de stale closure sur phase)
  useEffect(() => {
    if (!onBackOverride) return;
    onBackOverride(tool
      ? () => { setTool(null); setPhase('idle'); }  // ferme le détail directement
      : onBack
    );
  }, [tool]);

  function openTool(id) {
    if (phase !== 'idle') return;
    setPhase('list-exit');
    addTimer(() => {
      setTool(id);
      setPhase('det-enter');
      addTimer(() => setPhase('idle'), DUR);
    }, DUR);
  }

  function closeTool() {
    if (phase !== 'idle') return;
    setPhase('det-exit');
    addTimer(() => {
      setTool(null);
      setPhase('list-enter');
      addTimer(() => setPhase('idle'), DUR);
    }, DUR);
  }

  // Classe CSS selon phase
  const listClass = phase === 'list-exit'  ? 'ms-list-exit'
                  : phase === 'list-enter' ? 'ms-list-enter'
                  : '';
  const detClass  = phase === 'det-enter'  ? 'ms-det-enter'
                  : phase === 'det-exit'   ? 'ms-det-exit'
                  : '';

  const headerBg = dimBg ? dimBg() : T.surface;

  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', background:T.bg, color:T.text, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{SLIDE_CSS}</style>

      {/* ── Vue LISTE ─────────────────────────────────────────────────── */}
      {(!tool || phase === 'list-exit' || phase === 'list-enter') && (
        <div className={listClass} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
          {/* Header */}
          <div style={{
            background: headerBg,
            borderBottom: `1px solid ${color}33`,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            flexShrink: 0,
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          }}>
            <button
              className="ms-back"
              onClick={onBack}
              style={{
                background: 'none', border: `1px solid ${color}44`,
                borderRadius: 100, width: 38, height: 38,
                color, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <div style={{ fontSize: 26 }}>{icon}</div>
            <div>
              <div style={{ color, fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 1 }}>MODULE</div>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{title}</div>
            </div>
          </div>

          {/* Corps liste */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 40px' }}>
            {/* Info card optionnelle */}
            {subtitle && (
              <div style={{
                background: color + '12',
                border: `1px solid ${color}30`,
                borderRadius: 12, padding: '10px 14px', marginBottom: 14,
              }}>
                <div style={{ color, fontWeight: 700, fontSize: 12 }}>{subtitle}</div>
              </div>
            )}
            {headerExtra}

            {/* Items liste */}
            {items.map((item, i) => (
              <div key={item.id} className="ms-item ms-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                {renderItem(item, openTool)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Vue DETAIL ────────────────────────────────────────────────── */}
      {tool && (
        <div className={detClass} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
          {/* Header détail */}
          <div style={{
            background: headerBg,
            borderBottom: `1px solid ${color}33`,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          }}>
            <button
              className="ms-back"
              onClick={closeTool}
              style={{
                background: 'none', border: `1px solid ${color}44`,
                borderRadius: 100, width: 36, height: 36,
                color, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {items.find(it => it.id === tool)?.icon} {items.find(it => it.id === tool)?.label}
              </div>
            </div>
          </div>

          {/* Corps détail */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
            {renderDetail(tool, closeTool, onFavChange)}
          </div>
        </div>
      )}
    </div>
  );
}
