import { useState, useEffect, useRef } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, IconBtn, Card, Input } from '../../ui/index.js';
const C = T.soins;

// ── Presets de timers médicaux ───────────────────────────────────────────────
const PRESETS = [
  { id: 'frotte', label: 'Friction SHA', icon: '🤲', duration: 30, color: '#22c55e', tip: 'Couvrir toute la surface des mains' },
  { id: 'betadine', label: 'Bétadine (séchage)', icon: '🟠', duration: 30, color: '#f59e0b', tip: 'Laisser sécher avant geste' },
  { id: 'chlorhex', label: 'Chlorhexidine (séchage)', icon: '🟡', duration: 60, color: '#f59e0b', tip: 'Ne pas rincer, séchage naturel' },
  { id: 'alcool', label: 'Alcool 70° (peau)', icon: '💧', duration: 30, color: '#38bdf8', tip: 'Séchage spontané avant ponction' },
  { id: 'perf60', label: 'Perfusion 60 min', icon: '💊', duration: 3600, color: C, tip: 'Surveiller point de ponction' },
  { id: 'perf30', label: 'Perfusion 30 min', icon: '💉', duration: 1800, color: C, tip: 'Antibiotiques fréquents' },
  { id: 'perf15', label: 'Perfusion 15 min', icon: '⚡', duration: 900, color: '#f97316', tip: 'Perfusion rapide · surveillance accrue' },
  { id: 'compresse', label: 'Compresse humide', icon: '🩹', duration: 600, color: '#a78bfa', tip: '10 min puis réévaluer' },
  { id: 'glace', label: 'Cryothérapie (glace)', icon: '🧊', duration: 900, color: '#38bdf8', tip: 'Max 20 min · protéger la peau' },
  { id: 'perf_custom', label: 'Chrono personnalisé', icon: '⏱', duration: 0, color: '#64748b', tip: 'Entrez une durée manuelle' },
];

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function TimerWidget({ preset, onRemove }) {
  const [remaining, setRemaining] = useState(preset.duration);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [customDur, setCustomDur] = useState('');
  const [label, setLabel] = useState(preset.label);
  const iRef = useRef(null);

  const duration = preset.id === 'perf_custom' ? (parseInt(customDur) * 60 || 0) : preset.duration;

  useEffect(() => {
    if (running && remaining > 0) {
      iRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(iRef.current);
            setRunning(false);
            setDone(true);
            // Vibration si disponible
            try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(iRef.current);
  }, [running]);

  const start = () => {
    if (done) { setDone(false); setRemaining(duration); }
    setRunning(true);
  };
  const pause = () => { setRunning(false); clearInterval(iRef.current); };
  const reset = () => { setRunning(false); setDone(false); clearInterval(iRef.current); setRemaining(duration); };

  const pct = duration > 0 ? Math.round((1 - remaining / duration) * 100) : 0;
  const color = done ? T.success : preset.color;

  return (
    <Card style={{ border: `1px solid ${color}44`, background: done ? T.successDim : T.surface }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{preset.icon}</span>
          <div>
            {preset.id === 'perf_custom'
              ? <Input value={label} onChange={e => setLabel(e.target.value)} size="compact" style={{ fontWeight: 700, width: 150 }} />
              : <div style={{ color: T.text, fontWeight: 700, fontSize: tk.font.base }}>{label}</div>
            }
            <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 2 }}>{preset.tip}</div>
          </div>
        </div>
        <IconBtn label="Retirer ce timer" onClick={onRemove} fontSize={20}>×</IconBtn>
      </div>

      {/* Durée custom */}
      {preset.id === 'perf_custom' && !running && !done && (
        <div style={{ marginBottom: 10 }}>
          <Input type="number" value={customDur} onChange={e => setCustomDur(e.target.value)} placeholder="Durée en minutes"
            style={{ textAlign: 'center', fontSize: tk.font.md }} />
        </div>
      )}

      {/* Affichage temps */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <div style={{ color, fontSize: 40, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2 }}>
          {done ? '✓ TERMINÉ' : fmt(remaining)}
        </div>
        {duration > 0 && !done && (
          <div style={{ background: T.bg, borderRadius: 20, height: 6, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: 20, transition: 'width 1s linear' }} />
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!running ? (
          <Btn color={color} size="lg" disabled={preset.id === 'perf_custom' && !customDur} onClick={start} style={{ flex: 2 }}>
            {done ? '↺ Relancer' : remaining < duration && remaining > 0 ? '▶ Reprendre' : '▶ Démarrer'}
          </Btn>
        ) : (
          <Btn color={T.warning} size="lg" onClick={pause} style={{ flex: 2 }}>⏸ Pause</Btn>
        )}
        <Btn color={T.muted} variant="outline" size="lg" onClick={reset} style={{ flex: 1 }}>↺</Btn>
      </div>
    </Card>
  );
}

export default function Timers() {
  const [active, setActive] = useState([]);

  const add = preset => {
    setActive(p => [...p, { ...preset, key: Date.now() + Math.random() }]);
  };

  return (
    <div style={{ padding: '14px' }}>
      <Card dim={C + '11'} style={{ border: `1px solid ${C}33` }}>
        <div style={{ color: C, fontWeight: 700, fontSize: tk.font.sm }}>⏱ Timers de soins</div>
        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 4 }}>Chronomètres antiseptiques, perfusions, soins · Plusieurs timers simultanés possibles</div>
      </Card>

      {/* Timers actifs */}
      {active.length > 0 && (
        <>
          <div style={{ color: C, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 8 }}>Timers actifs</div>
          {active.map((t, i) => (
            <TimerWidget key={t.key} preset={t} onRemove={() => setActive(p => p.filter((_, j) => j !== i))} />
          ))}
        </>
      )}

      {/* Presets */}
      <div style={{ color: C, fontSize: tk.font.xs, fontWeight: 700, margin: '14px 0 8px' }}>Ajouter un timer</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => add(p)}
            style={{ background: T.surface, border: `1px solid ${p.color}44`, borderRadius: 10, minHeight: 88, padding: '12px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
            <div style={{ color: p.color, fontWeight: 700, fontSize: tk.font.sm, marginBottom: 3 }}>{p.label}</div>
            <div style={{ color: T.muted, fontSize: tk.font.xs }}>
              {p.duration === 0 ? 'Durée libre' : p.duration < 60 ? `${p.duration}s` : p.duration < 3600 ? `${p.duration / 60} min` : `${p.duration / 3600}h`}
            </div>
          </button>
        ))}
      </div>

      <Card dim={T.warningDim} style={{ marginTop: 14, border: `1px solid ${T.warning}33` }}>
        <div style={{ color: T.warning, fontSize: tk.font.xs, fontWeight: 600 }}>
          💡 Vibration activée à la fin du timer si votre appareil le supporte · Ne pas fermer l'application
        </div>
      </Card>
    </div>
  );
}
