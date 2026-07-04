/**
 * Transmissions.jsx — v2
 * Chiffrement AES-256-GCM via clé de session en mémoire (RGPD art. 32 / ANSSI).
 * La clé n'est jamais persistée — données inaccessibles après fermeture = by design.
 */
import { useState, useEffect, useRef } from 'react';
import { T, SOLID, tk } from '../../theme.js';
import { Btn, IconBtn, Card, Field, Input, Textarea, Banner, toast } from '../../ui/index.js';
const C = T.orga;

const STORAGE_KEY = 'transmissions_v2';
const TTL_MS = 24 * 60 * 60 * 1000;

async function genKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function enc(key, entry) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(JSON.stringify(entry)));
  return { iv: btoa(String.fromCharCode(...iv)), ct: btoa(String.fromCharCode(...new Uint8Array(ct))), ts: entry.timestamp };
}
async function dec(key, blob) {
  try {
    const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(blob.ct), c => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  } catch { return null; }
}
function loadBlobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const now = Date.now();
    return JSON.parse(raw).filter(b => now - b.ts < TTL_MS);
  } catch { return []; }
}
function saveBlobs(blobs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blobs)); } catch {}
}
function fmt(h) {
  const lines = [`[${h.heure}] ${h.patient || 'Patient'}`];
  if (h.donnee) lines.push(`DONNÉE : ${h.donnee}`);
  if (h.lien)   lines.push(`LIEN : ${h.lien}`);
  if (h.action) lines.push(`ACTION : ${h.action}`);
  return lines.join('\n');
}

const DLA_COLORS = { donnee: C, lien: SOLID.success, action: '#F59E0B' };

export default function Transmissions() {
  const keyRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [v, setV] = useState({ patient: '', donnee: '', lien: '', action: '' });
  const [hist, setHist] = useState([]);

  useEffect(() => {
    (async () => {
      const key = await genKey(); keyRef.current = key;
      const blobs = loadBlobs();
      const entries = (await Promise.all(blobs.map(b => dec(key, b)))).filter(Boolean);
      setHist(entries); setReady(true);
    })();
  }, []);

  const set = (k, val) => setV(p => ({ ...p, [k]: val }));

  const save = async () => {
    if (!v.donnee.trim() || !keyRef.current) return;
    const now = new Date();
    const heure = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const entry = { ...v, heure, timestamp: Date.now() };
    const next = [entry, ...hist]; setHist(next);
    saveBlobs(await Promise.all(next.map(e => enc(keyRef.current, e))));
    setV(p => ({ ...p, donnee: '', lien: '', action: '' }));
    toast('Transmission enregistrée');
  };

  const del = async (i) => {
    const next = hist.filter((_, idx) => idx !== i); setHist(next);
    saveBlobs(await Promise.all(next.map(e => enc(keyRef.current, e))));
  };

  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast(msg); } catch {}
  };

  if (!ready) return <div style={{ padding: 14, color: T.muted, fontSize: tk.font.base }}>Initialisation…</div>;

  return (
    <div style={{ padding: '14px' }}>
      <Banner kind="success" icon="🔒" title="Chiffré AES-256-GCM — clé de session">
        Données inaccessibles après fermeture · Utiliser initiales ou n° de chambre
      </Banner>

      <Card dim={T.orgaDim} style={{ border: `1px solid ${C}30` }}>
        <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.md, marginBottom: 4 }}>Transmissions ciblées — Modèle DLA</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm }}>Donnée → Lien → Action</div>
        <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 4, opacity: 0.8 }}>📦 24h · 🔒 AES-256-GCM · Local</div>
      </Card>

      <Card>
        <Field label="Patient (initiales / chambre)">
          <Input value={v.patient} onChange={e => set('patient', e.target.value)} placeholder="Ex : Chambre 12 · M.D." />
        </Field>
        <div style={{ color: DLA_COLORS.donnee, fontSize: tk.font.sm, fontWeight: tk.weight.bold, marginBottom: 6 }}>D — Donnée</div>
        <Textarea value={v.donnee} onChange={e => set('donnee', e.target.value)} placeholder="Ex: SpO₂ 88% sous 2L O₂. FR 28/min." style={{ minHeight: 84, marginBottom: 12 }} />
        <div style={{ color: DLA_COLORS.lien, fontSize: tk.font.sm, fontWeight: tk.weight.bold, marginBottom: 6 }}>L — Lien</div>
        <Textarea value={v.lien} onChange={e => set('lien', e.target.value)} placeholder="Ex: Détresse respiratoire aiguë." style={{ minHeight: 64, marginBottom: 12 }} />
        <div style={{ color: DLA_COLORS.action, fontSize: tk.font.sm, fontWeight: tk.weight.bold, marginBottom: 6 }}>A — Action</div>
        <Textarea value={v.action} onChange={e => set('action', e.target.value)} placeholder="Ex: O₂ porté à 6L/min. Médecin prévenu." style={{ minHeight: 64, marginBottom: 14 }} />
        <Btn color={C} size="lg" full disabled={!v.donnee.trim()} onClick={save}>Enregistrer</Btn>
      </Card>

      {hist.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 10px' }}>
            <div style={{ color: T.muted, fontSize: tk.font.sm, fontWeight: tk.weight.bold }}>Transmissions ({hist.length})</div>
            <Btn color={C} variant="soft" size="sm" onClick={() => copy(hist.map(fmt).join('\n\n---\n\n'), 'Toutes les transmissions copiées')}>
              📋 Tout copier
            </Btn>
          </div>
          {hist.map((h, i) => {
            const heuresRest = Math.max(0, Math.ceil((TTL_MS - (Date.now() - h.timestamp)) / 3600000));
            return (
              <Card key={i} accent={C}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.base }}>{h.patient || 'Patient'}</span>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <span style={{ color: T.muted, fontSize: tk.font.sm, marginRight: 4 }}>{h.heure}</span>
                    <IconBtn label="Copier" size={40} fontSize={15} onClick={() => copy(fmt(h), 'Transmission copiée')}>📋</IconBtn>
                    <IconBtn label="Supprimer" size={40} fontSize={15} onClick={() => del(i)}>✕</IconBtn>
                  </div>
                </div>
                {h.donnee && <div style={{ marginBottom: 6 }}><span style={{ color: DLA_COLORS.donnee, fontSize: tk.font.xs, fontWeight: tk.weight.bold }}>DONNÉE</span><div style={{ color: T.text, fontSize: tk.font.base, lineHeight: 1.5 }}>{h.donnee}</div></div>}
                {h.lien   && <div style={{ marginBottom: 6 }}><span style={{ color: DLA_COLORS.lien, fontSize: tk.font.xs, fontWeight: tk.weight.bold }}>LIEN</span><div style={{ color: T.text, fontSize: tk.font.base, lineHeight: 1.5 }}>{h.lien}</div></div>}
                {h.action && <div><span style={{ color: DLA_COLORS.action, fontSize: tk.font.xs, fontWeight: tk.weight.bold }}>ACTION</span><div style={{ color: T.text, fontSize: tk.font.base, lineHeight: 1.5 }}>{h.action}</div></div>}
                <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 8, opacity: 0.7 }}>🕐 ~{heuresRest}h · 🔒 Chiffré</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
