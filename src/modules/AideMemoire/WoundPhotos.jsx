/**
 * WoundPhotos.jsx — Galerie photos plaies chiffrées
 * Stockage : @capacitor/filesystem (répertoire privé DATA)
 * Compression : canvas 600px avant chiffrement
 * Chiffrement : AES-GCM avec cryptoKey patient
 * Suppression : à la sortie patient (deleteAllWoundPhotos)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { T, loadDarkPref } from '../../theme.js';
import { timeStr } from './utils.jsx';
import WoundPhotoTransfer from './WoundPhotoTransfer.jsx';

const C = '#f97316';
const WOUND_DIR = 'nplanr_wounds';

// ── Compression canvas ────────────────────────────────────────────────────────
function compressImage(base64, maxPx = 600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

// ── Crypto ────────────────────────────────────────────────────────────────────
async function encryptB64(plainB64, cryptoKey) {
  // Convertir base64 → ArrayBuffer directement (évite les gros Uint8Array intermédiaires)
  const binStr  = atob(plainB64);
  const bytes   = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, bytes);
  // Combiner IV + ciphertext en un seul ArrayBuffer
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), 12);
  // Convertir en base64 par chunks pour éviter les stack overflow
  let b64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < combined.length; i += chunkSize) {
    b64 += String.fromCharCode(...combined.subarray(i, i + chunkSize));
  }
  return btoa(b64);
}

async function decryptB64(encB64, cryptoKey) {
  const binStr = atob(encB64);
  const combined = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) combined[i] = binStr.charCodeAt(i);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct);
  let b64 = '';
  const arr = new Uint8Array(pt);
  const chunkSize = 8192;
  for (let i = 0; i < arr.length; i += chunkSize) {
    b64 += String.fromCharCode(...arr.subarray(i, i + chunkSize));
  }
  return btoa(b64);
}

// ── Index localStorage ────────────────────────────────────────────────────────
function idxKey(sid, pid)      { return `am_wound_idx_${sid}_${pid}`; }
function filename(sid, pid, ts){ return `${WOUND_DIR}/wound_${sid}_${pid}_${ts}.enc`; }

function loadIdx(sid, pid) {
  try { return JSON.parse(localStorage.getItem(idxKey(sid,pid)) || '[]'); } catch { return []; }
}
function saveIdx(sid, pid, idx) {
  try { localStorage.setItem(idxKey(sid,pid), JSON.stringify(idx)); } catch {}
}

// ── Export pour handleDischarge ───────────────────────────────────────────────
export async function deleteAllWoundPhotos(serviceId, patientId) {
  try {
    const idx = loadIdx(serviceId, patientId);
    for (const e of idx) {
      try { await Filesystem.deleteFile({ path: e.path, directory: Directory.Cache }); } catch {}
    }
    localStorage.removeItem(idxKey(serviceId, patientId));
  } catch {}
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function WoundPhotos({ patient, service, cryptoKey, readOnly }) {
  const [photos,       setPhotos]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [label,        setLabel]        = useState('');
  const [showLabel,    setShowLabel]    = useState(false);
  const [pendingB64,   setPendingB64]   = useState(null);
  const pendingRef = React.useRef(null);
  const [error,        setError]        = useState('');

  const dark = loadDarkPref();
  const P = {
    glass: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    bdr:   dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };

  // ── Chargement ───────────────────────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const idx = loadIdx(service.id, patient.id);
      const loaded = [];
      for (const entry of idx) {
        try {
          const file = await Filesystem.readFile({ path: entry.path, directory: Directory.Cache });
          const plain = await decryptB64(file.data, cryptoKey);
          loaded.push({ ...entry, dataUrl: `data:image/jpeg;base64,${plain}` });
        } catch {}
      }
      setPhotos(loaded);
    } finally { setLoading(false); }
  }, [service.id, patient.id, cryptoKey]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // ── Capture ──────────────────────────────────────────────────────────────────
  async function handleCapture(fromGallery = false) {
    setError('');
    try {
      await Camera.requestPermissions({
        permissions: fromGallery ? ['photos'] : ['camera'],
      });
      const photo = await Camera.getPhoto({
        quality: 70,
        width: 1024,
        resultType: CameraResultType.Base64,
        source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
      });
      if (!photo.base64String) { setError('Photo vide.'); return; }
      // Compression via canvas
      const compressed = await compressImage(photo.base64String, 600, 0.7);
      pendingRef.current = compressed;
      setPendingB64('ready'); // juste un signal, pas la vraie data
      setLabel('');
      setShowLabel(true);
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('User cancelled')) return;
      setError('Erreur caméra : ' + msg.slice(0, 80));
    }
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  async function handleSave() {
    setShowLabel(false);
    const photoB64 = pendingRef.current || '';
    pendingRef.current = null;
    setPendingB64(null);
    setError('Étape 1: chiffrement…');
    try {
      const enc = await encryptB64(photoB64, cryptoKey);
      setError('Étape 2: chiffrement OK — écriture…');
      try { await Filesystem.mkdir({ path: WOUND_DIR, directory: Directory.Cache, recursive: true }); } catch {}
      const ts   = Date.now();
      const fpath = filename(service.id, patient.id, ts);
      await Filesystem.writeFile({ path: fpath, data: enc, directory: Directory.Cache });
      setError('Étape 3: writeFile OK — sauvegarde index…');
      const idx = loadIdx(service.id, patient.id);
      idx.push({ ts, path: fpath, label: label.trim() || 'Photo', time: timeStr() });
      saveIdx(service.id, patient.id, idx);
      setError('Étape 4: SUCCÈS');
      await loadPhotos();
      return;
    } catch(e) {
      setError('CRASH chiffrement: ' + String(e).slice(0,100));
    }
    try {
      if (!cryptoKey) { setError('Erreur: clé crypto manquante'); return; }
      setError('Étape 2: chiffrement…');
      const ts  = Date.now();
      const enc = await encryptB64(photoB64, cryptoKey);
      setError('Étape 3: écriture fichier…');
      try { await Filesystem.mkdir({ path: WOUND_DIR, directory: Directory.Cache, recursive: true }); } catch {}
      const path = filename(service.id, patient.id, ts);
      await Filesystem.writeFile({ path, data: enc, directory: Directory.Cache });
      setError('Étape 4: index…');
      const idx = loadIdx(service.id, patient.id);
      idx.push({ ts, path, label: label.trim() || 'Photo sans libellé', time: timeStr() });
      saveIdx(service.id, patient.id, idx);
      setError('');
      setSaving(true);
      await loadPhotos();
      setSaving(false);
    } catch (e) {
      setError('CRASH: ' + (e?.message || String(e)).slice(0, 120));
      setSaving(false);
    }
  }

  // ── Suppression ──────────────────────────────────────────────────────────────
  async function handleDelete(photo) {
    try { await Filesystem.deleteFile({ path: photo.path, directory: Directory.Cache }); } catch {}
    const idx = loadIdx(service.id, patient.id).filter(e => e.ts !== photo.ts);
    saveIdx(service.id, patient.id, idx);
    setSelected(null);
    await loadPhotos();
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <span style={{ color:T.muted, fontSize:13 }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ padding:'0 16px 20px' }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ color:C, fontSize:11, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:700 }}>SUIVI PLAIES</div>
          <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>
            {photos.length} photo{photos.length!==1?'s':''} · Chiffrées · Supprimées à la sortie
          </div>
        </div>
        {photos.length > 0 && !readOnly && (
          <button onClick={() => setShowTransfer(true)}
            style={{ background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:8, color:C, fontSize:12, padding:'6px 10px', cursor:'pointer' }}>
            📤 Partager
          </button>
        )}
      </div>

      {readOnly && (
        <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:10, padding:'8px 12px', marginBottom:12, color:'#f59e0b', fontSize:12 }}>
          👁 Consultation uniquement
        </div>
      )}

      {error && (
        <div style={{ background:'#f43f5e18', border:'1px solid #f43f5e33', borderRadius:10, padding:'8px 12px', marginBottom:12, color:'#f43f5e', fontSize:12 }}>
          {error}
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {photos.map(p => (
            <div key={p.ts} onClick={() => setSelected(p)}
              style={{ cursor:'pointer', borderRadius:12, overflow:'hidden', border:`1px solid ${P.bdr}`, position:'relative' }}>
              <img src={p.dataUrl} alt={p.label}
                style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.55)', padding:'4px 8px' }}>
                <div style={{ color:'#fff', fontSize:10, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.label}</div>
                <div style={{ color:'rgba(255,255,255,0.7)', fontSize:9 }}>{p.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !readOnly && (
        <div style={{ textAlign:'center', padding:'32px 16px', color:T.muted, fontSize:13, lineHeight:1.6 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
          Aucune photo enregistrée<br/>
          <span style={{ fontSize:12 }}>Chiffrées · Supprimées à la sortie</span>
        </div>
      )}

      {!readOnly && (
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => handleCapture(false)} disabled={saving}
            style={{ flex:1, background:C+'22', border:`1px solid ${C}44`, borderRadius:12, color:C, padding:'13px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
            📷 {saving ? 'Enregistrement…' : 'Photo'}
          </button>
          <button onClick={() => handleCapture(true)} disabled={saving}
            style={{ flex:1, background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer' }}>
            🖼 Galerie
          </button>
        </div>
      )}

      {showLabel && (
        <div onTouchMove={e => e.stopPropagation()}
          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', zIndex:200 }}>
          <div style={{ background:T.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 40px', width:'100%', boxSizing:'border-box' }}>
            <div style={{ color:T.text, fontWeight:700, fontSize:16, marginBottom:14 }}>📝 Libellé</div>
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="ex : Plaie tibiale J3" autoFocus
              style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'11px 14px', color:T.text, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:12 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setShowLabel(false); setPendingB64(null); pendingRef.current = null; }}
                style={{ flex:1, background:'none', border:`1px solid ${T.border}`, borderRadius:10, color:T.muted, padding:'12px', fontSize:14, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={handleSave}
                style={{ flex:1, background:C, border:'none', borderRadius:10, color:'#fff', padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div onTouchMove={e => e.stopPropagation()}
          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', display:'flex', flexDirection:'column', zIndex:300 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px' }}>
            <button onClick={() => setSelected(null)}
              style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>←</button>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>{selected.label}</div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>{selected.time}</div>
            </div>
            {!readOnly && (
              <button onClick={() => handleDelete(selected)}
                style={{ background:'#f43f5e22', border:'1px solid #f43f5e44', borderRadius:8, color:'#f43f5e', fontSize:12, padding:'6px 10px', cursor:'pointer' }}>
                🗑
              </button>
            )}
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 8px' }}>
            <img src={selected.dataUrl} alt={selected.label}
              style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', borderRadius:8 }}/>
          </div>
          <div style={{ padding:'12px 16px 32px', textAlign:'center', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
            🔒 AES-256 · Supprimée à la sortie
          </div>
        </div>
      )}

      {showTransfer && (
        <WoundPhotoTransfer
          photos={photos}
          patient={patient}
          service={service}
          cryptoKey={cryptoKey}
          onClose={() => setShowTransfer(false)}
          onImported={loadPhotos}
        />
      )}
    </div>
  );
}
