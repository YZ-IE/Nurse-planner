import { useState } from 'react';
import { T, SOLID, tk } from '../../theme.js';
import { Btn, IconBtn, Card, Chip, Field, Input, Textarea, Sheet, toast } from '../../ui/index.js';
const C = T.orga;

const STORAGE_KEY = 'planning_journee_v1';
const DATE_KEY = 'planning_date_v1';

const CATEGORIES = [
  { id: 'vital',  label: 'Constantes & Surveillance', color: SOLID.danger,  icon: '📊' },
  { id: 'med',    label: 'Médicaments & Perfusions',  color: '#F59E0B',     icon: '💊' },
  { id: 'soin',   label: 'Soins techniques',           color: '#3B82F6',     icon: '🩺' },
  { id: 'nursing',label: 'Nursing & Confort',          color: SOLID.success, icon: '🛁' },
  { id: 'admin',  label: 'Administratif & Liaison',   color: '#A78BFA',     icon: '📋' },
  { id: 'autre',  label: 'Autre',                     color: '#8D97A8',     icon: '📌' },
];

const HEURES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function load() {
  try {
    const savedDate = localStorage.getItem(DATE_KEY);
    const today = todayStr();
    if (savedDate !== today) {
      localStorage.setItem(DATE_KEY, today);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(DATE_KEY, todayStr());
  } catch {}
}

let nextId = Date.now();

export default function PlanningJournee() {
  const [taches, setTaches] = useState(() => load());
  const [form, setForm] = useState({ heure: '08:00', patient: '', action: '', cat: 'soin', priorite: false });
  const [filtre, setFiltre] = useState('tous');
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const heureActuelle = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const ajouter = () => {
    if (!form.action.trim()) return;
    const t = { ...form, id: nextId++, done: false, createdAt: Date.now() };
    const next = [...taches, t].sort((a,b) => a.heure.localeCompare(b.heure));
    setTaches(next); save(next);
    setForm(p => ({ ...p, patient: '', action: '', priorite: false }));
    setShowForm(false);
    toast('Tâche ajoutée au planning');
  };

  const toggle = (id) => {
    const t = taches.find(x => x.id === id);
    const next = taches.map(x => x.id === id ? { ...x, done: !x.done } : x);
    setTaches(next); save(next);
    if (t && !t.done) toast('Tâche validée');
  };

  const suppr = (id) => {
    const next = taches.filter(t => t.id !== id);
    setTaches(next); save(next);
  };

  const tachesFiltrees = filtre === 'tous' ? taches
    : filtre === 'fait' ? taches.filter(t => t.done)
    : filtre === 'reste' ? taches.filter(t => !t.done)
    : taches.filter(t => t.cat === filtre);

  const nbFait = taches.filter(t => t.done).length;
  const pct = taches.length ? Math.round(nbFait / taches.length * 100) : 0;

  const catOf = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

  return (
    <div style={{ padding: '14px 14px 110px' }}>
      {/* En-tête progression */}
      <Card dim={T.orgaDim} style={{ border: `1px solid ${C}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.md, marginBottom: 2 }}>Planning de la journée</div>
            <div style={{ color: T.muted, fontSize: tk.font.sm }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
              {' · '}Il est {heureActuelle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: 24 }}>{pct}%</div>
            <div style={{ color: T.muted, fontSize: tk.font.xs }}>{nbFait}/{taches.length} fait</div>
          </div>
        </div>
        {taches.length > 0 && (
          <div style={{ marginTop: 12, background: T.bg, borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C, borderRadius: 6, transition: 'width 0.4s' }} />
          </div>
        )}
      </Card>

      {/* Filtres */}
      {taches.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
          {[{ id:'tous', label:'Toutes' }, { id:'reste', label:'À faire' }, { id:'fait', label:'Faites' },
            ...CATEGORIES.map(c => ({ id: c.id, label: c.icon + ' ' + c.label.split(' ')[0], color: c.color }))
          ].map(f => (
            <Chip key={f.id} color={f.color || C} active={filtre === f.id} onClick={() => setFiltre(f.id)}
              style={{ flexShrink: 0 }}>
              {f.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Liste des tâches */}
      {tachesFiltrees.length === 0 && (
        <div style={{ color: T.muted, textAlign: 'center', padding: '40px 0', fontSize: tk.font.base }}>
          {taches.length === 0 ? 'Aucune tâche planifiée pour aujourd\'hui' : 'Aucune tâche dans ce filtre'}
        </div>
      )}

      {tachesFiltrees.map(t => {
        const cat = catOf(t.cat);
        const passee = t.heure < heureActuelle && !t.done;
        return (
          <Card key={t.id}
            accent={t.done ? T.border : t.priorite ? T.danger : cat.color}
            style={{ opacity: t.done ? 0.55 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Case à cocher — zone tap 48px, visuel 28px */}
              <button onClick={() => toggle(t.id)}
                aria-label={t.done ? 'Marquer à faire' : 'Marquer fait'}
                style={{
                  width: 48, height: 48, margin: '-10px 0 -10px -10px',
                  background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: `2px solid ${t.done ? T.success : cat.color}`,
                  background: t.done ? T.success : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}>
                  {t.done && <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>✓</span>}
                </span>
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ color: passee ? T.danger : T.text, fontWeight: tk.weight.bold, fontSize: tk.font.base }}>
                    {t.heure}{passee && ' ⚠️'}
                  </span>
                  {t.patient && (
                    <span style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: tk.weight.semi, background: T.bg, padding: '2px 8px', borderRadius: 6 }}>
                      {t.patient}
                    </span>
                  )}
                  {t.priorite && <span style={{ color: T.danger, fontSize: tk.font.xs, fontWeight: tk.weight.bold }}>🔴 Prioritaire</span>}
                </div>
                <div style={{ color: t.done ? T.muted : T.text, fontSize: tk.font.base, lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.action}
                </div>
                <div style={{ color: cat.color, fontSize: tk.font.xs, marginTop: 4, fontWeight: tk.weight.semi }}>{cat.icon} {cat.label}</div>
              </div>

              <IconBtn label="Supprimer" onClick={() => suppr(t.id)} fontSize={16} style={{ margin: '-10px -10px 0 0' }}>✕</IconBtn>
            </div>
          </Card>
        );
      })}

      <div style={{ color: T.muted, fontSize: tk.font.xs, textAlign: 'center', marginTop: 16, opacity: 0.7 }}>
        Planning réinitialisé automatiquement chaque jour · Stockage local
      </div>

      {/* Action principale — ancrée en zone pouce */}
      <div style={{ position: 'fixed', left: 14, right: 14, bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: 50 }}>
        <Btn color={C} size="lg" full icon="+" onClick={() => setShowForm(true)}
          style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}>
          Ajouter une tâche
        </Btn>
      </div>

      {/* Formulaire — bottom sheet */}
      {showForm && (
        <Sheet
          title="Nouvelle tâche"
          icon="📋"
          onClose={() => setShowForm(false)}
          footer={
            <Btn color={C} size="lg" full disabled={!form.action.trim()} onClick={ajouter}>
              Ajouter au planning
            </Btn>
          }
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Heure" style={{ flex: 1 }}>
              <select value={form.heure} onChange={e => set('heure', e.target.value)}
                style={{ width: '100%', height: tk.touch.input, background: T.bg, border: `1px solid ${T.border}`, borderRadius: tk.radius.md, padding: '0 12px', color: T.text, fontSize: tk.font.base, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Catégorie" style={{ flex: 2 }}>
              <select value={form.cat} onChange={e => set('cat', e.target.value)}
                style={{ width: '100%', height: tk.touch.input, background: T.bg, border: `1px solid ${T.border}`, borderRadius: tk.radius.md, padding: '0 12px', color: T.text, fontSize: tk.font.base, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Patient (initiales / chambre — anonymisé)">
            <Input value={form.patient} onChange={e => set('patient', e.target.value)} placeholder="Ex : Ch.12 · M.D." />
          </Field>
          <Field label="Tâche / Soin">
            <Textarea value={form.action} onChange={e => set('action', e.target.value)}
              placeholder="Ex : Pansement plaie abdominale, refaire perfusion G5%, prélever NFS…" />
          </Field>
          {/* Toggle priorité — zone tap pleine largeur */}
          <button onClick={() => set('priorite', !form.priorite)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              minHeight: tk.touch.min, padding: '0 14px',
              background: form.priorite ? T.dangerDim : T.bg,
              border: `1.5px solid ${form.priorite ? T.danger : T.border}`,
              borderRadius: tk.radius.md, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontSize: 16 }}>🔴</span>
            <span style={{ color: form.priorite ? T.danger : T.muted, fontSize: tk.font.base, fontWeight: form.priorite ? tk.weight.bold : tk.weight.reg }}>
              Prioritaire
            </span>
            {form.priorite && <span style={{ marginLeft: 'auto', color: T.danger, fontWeight: 800 }}>✓</span>}
          </button>
        </Sheet>
      )}
    </div>
  );
}
