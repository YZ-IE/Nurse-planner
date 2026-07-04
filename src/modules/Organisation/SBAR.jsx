import { useState } from 'react';
import { T, SOLID, tk } from '../../theme.js';
import { Btn, Card, Field, Textarea, toast } from '../../ui/index.js';
const C = T.orga;

const STORAGE_KEY = 'sbar_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - saved.timestamp > TTL_MS) return null;
    return saved.v;
  } catch { return null; }
}

function save(v) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v, timestamp: Date.now() })); } catch {}
}

const FIELDS = [
  { key:'S', label:'S — Situation', color: C, placeholder:'Qui êtes-vous ? Quel patient ? Quel problème ?\nEx: "IDE Dupont, cardiologie. M. Martin, 72 ans ch.12, douleur thoracique intense à 8/10 depuis 20 min."' },
  { key:'B', label:'B — Background (Contexte)', color: SOLID.success, placeholder:'Antécédents, motif hospitalisation, traitements\nEx: "Hospitalisé J3 pour FA. Sous anticoagulants. Coronaropathie connue."' },
  { key:'A', label:'A — Assessment (Évaluation)', color:'#F59E0B', placeholder:'Vos observations cliniques actuelles\nEx: "PA 90/60, FC 110 irrégulière, SpO₂ 94%, pâle, sudoreux. ECG : sus-décalage ST V2-V4."' },
  { key:'R', label:'R — Recommendation', color: SOLID.warning, placeholder:'Ce dont vous avez besoin\nEx: "Venez l\'examiner en urgence. Dois-je préparer un accès veineux ?"' },
];

export default function SBAR() {
  const [v, setV] = useState(() => load() || { S:'', B:'', A:'', R:'' });
  const [shown, setShown] = useState(false);

  const set = (k, val) => { const nv = { ...v, [k]: val }; setV(nv); save(nv); };

  const fullText = FIELDS.map(f => `${f.label.toUpperCase()}\n${v[f.key] || '(Non renseigné)'}`).join('\n\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast('Transmission copiée');
    } catch {}
  };

  const reset = () => {
    const empty = { S:'', B:'', A:'', R:'' };
    setV(empty); save(empty); setShown(false);
  };

  return (
    <div style={{ padding: '14px' }}>
      <Card dim={T.orgaDim} style={{ border: `1px solid ${C}30` }}>
        <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.md, marginBottom: 4 }}>Outil SBAR — Transmission structurée</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm }}>Pour toute communication urgente avec le médecin, relèves ou transferts.</div>
        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 4, opacity: 0.8 }}>📦 Sauvegardé automatiquement 24h</div>
      </Card>

      {FIELDS.map(f => (
        <Card key={f.key} accent={f.color}>
          <div style={{ color: f.color, fontSize: tk.font.sm, fontWeight: tk.weight.bold, marginBottom: 8 }}>{f.label}</div>
          <Textarea value={v[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
            style={{ minHeight: 96 }} />
        </Card>
      ))}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Btn color={C} size="lg" onClick={() => setShown(true)} style={{ flex: 2 }}>Générer</Btn>
        <Btn color={T.muted} variant="outline" size="lg" onClick={copy} style={{ flex: 1 }}>📋</Btn>
        <Btn color={T.muted} variant="outline" size="lg" onClick={reset} style={{ flex: 1 }}>Effacer</Btn>
      </div>

      {shown && (
        <Card dim={T.orgaDim} style={{ border: `1px solid ${C}44` }}>
          <div style={{ color: C, fontSize: tk.font.sm, fontWeight: tk.weight.bold, marginBottom: 12 }}>📢 Transmission SBAR</div>
          {FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div style={{ color: f.color, fontWeight: tk.weight.bold, fontSize: tk.font.sm, marginBottom: 4 }}>{f.label}</div>
              <div style={{ color: T.text, fontSize: tk.font.base, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{v[f.key] || <em style={{ color: T.muted }}>Non renseigné</em>}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
