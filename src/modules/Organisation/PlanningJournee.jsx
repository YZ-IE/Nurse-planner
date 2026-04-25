import { useState, useEffect } from 'react';
import { T, s } from '../../theme.js';
const C = T.orga;

const STORAGE_KEY = 'planning_journee_v1';
const DATE_KEY = 'planning_date_v1';

const CATEGORIES = [
  { id: 'vital',  label: 'Constantes & Surveillance', color: '#ef4444', icon: '📊' },
  { id: 'med',    label: 'Médicaments & Perfusions',  color: '#f59e0b', icon: '💊' },
  { id: 'soin',   label: 'Soins techniques',           color: '#3b82f6', icon: '🩺' },
  { id: 'nursing',label: 'Nursing & Confort',          color: '#22c55e', icon: '🛁' },
  { id: 'admin',  label: 'Administratif & Liaison',   color: '#a78bfa', icon: '📋' },
  { id: 'autre',  label: 'Autre',                     color: T.muted, icon: '📌' },
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
  };

  const toggle = (id) => {
    const next = taches.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTaches(next); save(next);
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
    <div style={{ padding: '14px' }}>
      {/* En-tête */}
      <div style={{ ...s.card, background: T.orgaDim }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: C, fontWeight: 700, marginBottom: 2 }}>Planning de la journée</div>
            <div style={{ color: T.muted, fontSize: 12 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
              {' · '}Il est {heureActuelle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: C, fontWeight: 700, fontSize: 22 }}>{pct}%</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{nbFait}/{taches.length} fait</div>
          </div>
        </div>
        {taches.length > 0 && (
          <div style={{ marginTop: 10, background: T.bg, borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C, borderRadius: 6, transition: 'width 0.4s' }} />
          </div>
        )}
      </div>

      {/* Bouton ajouter */}
      <button onClick={() => setShowForm(p => !p)}
        style={{ ...s.btn(C), width: '100%', padding: '11px', marginBottom: 12, fontSize: 14 }}>
        {showForm ? '✕ Annuler' : '+ Ajouter une tâche'}
      </button>

      {/* Formulaire */}
      {showForm && (
        <div style={{ ...s.card, borderLeft: `3px solid ${C}` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Heure</label>
              <select value={form.heure} onChange={e => set('heure', e.target.value)}
                style={{ ...s.input, padding: '8px' }}>
                {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={s.label}>Catégorie</label>
              <select value={form.cat} onChange={e => set('cat', e.target.value)}
                style={{ ...s.input, padding: '8px' }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={s.label}>Patient (initiales / chambre — anonymisé)</label>
            <input value={form.patient} onChange={e => set('patient', e.target.value)}
              placeholder="Ex: Ch.12 · M.D." style={s.input} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>Tâche / Soin</label>
            <textarea value={form.action} onChange={e => set('action', e.target.value)}
              placeholder="Ex: Pansement plaie abdominale, refaire perfusion G5%, prélever NFS..."
              style={{ ...s.input, minHeight: 70, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: T.text, fontSize: 13 }}>
              <input type="checkbox" checked={form.priorite} onChange={e => set('priorite', e.target.checked)}
                style={{ accentColor: '#ef4444', width: 16, height: 16 }} />
              <span style={{ color: form.priorite ? '#ef4444' : T.muted }}>🔴 Prioritaire</span>
            </label>
          </div>
          <button onClick={ajouter} style={{ ...s.btn(C), width: '100%', padding: '11px' }}>
            Ajouter au planning
          </button>
        </div>
      )}

      {/* Filtres */}
      {taches.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
          {[{ id:'tous', label:'Toutes' }, { id:'reste', label:'À faire' }, { id:'fait', label:'Faites' },
            ...CATEGORIES.map(c => ({ id: c.id, label: c.icon + ' ' + c.label.split(' ')[0] }))
          ].map(f => (
            <button key={f.id} onClick={() => setFiltre(f.id)}
              style={{ ...s.btn(filtre === f.id ? C : T.border), padding: '5px 10px', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Liste des tâches */}
      {tachesFiltrees.length === 0 && (
        <div style={{ color: T.muted, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
          {taches.length === 0 ? 'Aucune tâche planifiée pour aujourd\'hui' : 'Aucune tâche dans ce filtre'}
        </div>
      )}

      {tachesFiltrees.map(t => {
        const cat = catOf(t.cat);
        const passee = t.heure < heureActuelle && !t.done;
        return (
          <div key={t.id} style={{
            ...s.card,
            borderLeft: `3px solid ${t.done ? T.border : t.priorite ? '#ef4444' : cat.color}`,
            opacity: t.done ? 0.55 : 1,
            transition: 'opacity 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <button onClick={() => toggle(t.id)} style={{
                width: 22, height: 22, borderRadius: 6, border: `2px solid ${t.done ? '#22c55e' : cat.color}`,
                background: t.done ? '#22c55e' : 'transparent', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>
                {t.done && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{
                    color: passee ? '#ef4444' : T.text,
                    fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                  }}>
                    {t.heure}{passee && ' ⚠️'}
                  </span>
                  {t.patient && (
                    <span style={{ color: T.muted, fontSize: 11, background: T.surface, padding: '1px 6px', borderRadius: 4 }}>
                      {t.patient}
                    </span>
                  )}
                  {t.priorite && <span style={{ color: '#ef4444', fontSize: 10 }}>🔴 PRIORITAIRE</span>}
                  <span style={{ color: cat.color, fontSize: 10, fontFamily: 'monospace' }}>{cat.icon}</span>
                </div>
                <div style={{ color: t.done ? T.muted : T.text, fontSize: 13, lineHeight: 1.5, textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.action}
                </div>
                <div style={{ color: T.muted, fontSize: 10, marginTop: 3 }}>{cat.label}</div>
              </div>
              <button onClick={() => suppr(t.id)} style={{
                background: 'none', border: '1px solid #334155', color: T.muted,
                borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', flexShrink: 0,
              }}>✕</button>
            </div>
          </div>
        );
      })}

      <div style={{ color: T.border, fontSize: 10, textAlign: 'center', marginTop: 16 }}>
        Planning réinitialisé automatiquement chaque jour · Stockage local
      </div>
    </div>
  );
}
