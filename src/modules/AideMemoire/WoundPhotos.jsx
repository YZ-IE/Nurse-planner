/**
 * WoundPhotos.jsx — Galerie photos plaies chiffrées
 * 
 * Stockage : @capacitor/filesystem → répertoire privé DATA de l'app
 * Chiffrement : AES-GCM avec la clé cryptoKey du patient (même que les données)
 * Suppression : automatique à la sortie du patient (handleDischarge)
 * Transfert : via WoundPhotoTransfer.jsx (Intent Android SEND)
 * 
 * Format fichier : am_wound_{serviceId}_{patientId}_{timestamp}.enc
 * Index : am_wound_index_{serviceId}_{patientId} (dans secureGet/secureSet)
 */

import { useState, useEffect, useCallback } from 'react';
import { T, loadDarkPref } from '../../theme.js';
import { timeStr } from './utils.jsx';
import WoundPhotoTransfer from './WoundPhotoTransfer.jsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

const C = '#f97316'; // orange — couleur soins de plaies

// ── Helpers Filesystem + Crypto ───────────────────────────────────────────────

// Filesystem et Camera importés statiquement en haut du fichier

async function encryptBytes(plainBytes, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plainBytes);
  // Format : 12 bytes IV + ciphertext
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return out;
}

async function decryptBytes(encBytes, cryptoKey) {
  const iv = encBytes.slice(0, 12);
  const ct = encBytes.slice(12);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct)
  );
}

function base64ToUint8(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function uint8ToBase64(arr) {
  let bin = '';
  arr.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function indexKey(serviceId, patientId) {
  return `am_wound_idx_${serviceId}_${patientId}`;
}
function photoFilename(serviceId, patientId, ts) {
  return `am_wound_${serviceId}_${patientId}_${ts}.enc`;
}

// ── Lecture/Écriture index ────────────────────────────────────────────────────

function loadIndex(serviceId, patientId) {
  try {
    const raw = localStorage.getItem(indexKey(serviceId, patientId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveIndex(serviceId, patientId, idx) {
  try { localStorage.setItem(indexKey(serviceId, patientId), JSON.stringify(idx)); } catch {}
}

// ── Export pour handleDischarge ───────────────────────────────────────────────

export async function deleteAllWoundPhotos(serviceId, patientId) {
  try {
    const idx = loadIndex(serviceId, patientId);
    for (const entry of idx) {
      try { await Filesystem.deleteFile({ path: entry.filename, directory: Directory.Data }); } catch {}
    }
    localStorage.removeItem(indexKey(serviceId, patientId));
  } catch {}
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function WoundPhotos({ patient, service, cryptoKey, readOnly }) {
  const [photos,      setPhotos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState(null); // photo en plein écran
  const [showTransfer,setShowTransfer]= useState(false);
  const [label,       setLabel]       = useState('');
  const [showLabel,   setShowLabel]   = useState(false);
  const [pendingB64,  setPendingB64]  = useState(null);
  const [error,       setError]       = useState('');

  const dark = loadDarkPref();
  const P = {
    glass: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    bdr:   dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };

  // ── Chargement photos ────────────────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const idx = loadIndex(service.id, patient.id);
      const loaded = [];
      for (const entry of idx) {
        try {
          const file = await Filesystem.readFile({ path: entry.filename, directory: Directory.Data });
          const encBytes = base64ToUint8(file.data);
          const plainBytes = await decryptBytes(encBytes, cryptoKey);
          const b64 = uint8ToBase64(plainBytes);
          loaded.push({ ...entry, dataUrl: `data:image/jpeg;base64,${b64}` });
        } catch { /* fichier corrompu ou supprimé */ }
      }
      setPhotos(loaded);
    } finally { setLoading(false); }
  }, [service.id, patient.id, cryptoKey]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // ── Prise de photo ───────────────────────────────────────────────────────────
  async function handleCapture(fromGallery = false) {
    setError('');
    try {
      // Demander les permissions runtime (Android 13+)
      const perms = await Camera.requestPermissions({ permissions: fromGallery ? ['photos'] : ['camera'] });
      const granted = fromGallery ? perms.photos : perms.camera;
      if (granted === 'denied') {
        setError('Permission refusée. Vérifiez les paramètres de l\'application.');
        return;
      }
      const photo = await Camera.getPhoto({
        quality: 60,
        width: 800,
        height: 800,
        resultType: CameraResultType.Base64,
        source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
        presentationStyle: 'fullscreen',
      });
      if (!photo.base64String) { setError('Photo vide reçue.'); return; }
      setPendingB64(photo.base64String);
      setLabel('');
      setShowLabel(true);
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('User cancelled')) return;
      setError('Erreur caméra : ' + msg.slice(0, 80));
    }
  }

  // ── Sauvegarde après label ────────────────────────────────────────────────────
  async function handleSave() {
    if (!pendingB64) return;
    setSaving(true);
    setShowLabel(false);
    setError('');
    // Libérer pendingB64 de l'état avant de chiffrer (économie mémoire)
    const photoB64 = pendingB64;
    setPendingB64(null);
    try {
      const ts         = Date.now();
      const filename   = photoFilename(service.id, patient.id, ts);
      const plainBytes = base64ToUint8(photoB64);
      const encBytes   = await encryptBytes(plainBytes, cryptoKey);
      const encB64     = uint8ToBase64(encBytes);
      await Filesystem.writeFile({
        path: filename,
        data: encB64,
        directory: Directory.Data,
        recursive: true,
      });
      const idx = loadIndex(service.id, patient.id);
      const entry = { filename, ts, label: label.trim() || 'Photo sans libellé', time: timeStr() };
      saveIndex(service.id, patient.id, [...idx, entry]);
      setPendingB64(null);
      await loadPhotos();
    } catch (e) {
      const msg = e?.message || String(e);
      setError('Erreur sauvegarde : ' + msg.slice(0, 80));
      console.error(e);
    } finally { setSaving(false); }
  }

  // ── Suppression ──────────────────────────────────────────────────────────────
  async function handleDelete(photo) {
    try {
      await Filesystem.deleteFile({ path: photo.filename, directory: Directory.Data });
      const idx = loadIndex(service.id, patient.id).filter(e => e.filename !== photo.filename);
      saveIndex(service.id, patient.id, idx);
      setSelected(null);
      await loadPhotos();
    } catch { setError('Erreur lors de la suppression.'); }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <span style={{ color:T.muted, fontSize:13 }}>Chargement des photos…</span>
    </div>
  );

  return (
    <div style={{ padding:'0 16px 20px' }}>

      {/* Header section */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ color:C, fontSize:11, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:700 }}>
            SUIVI PLAIES / PANSEMENTS
          </div>
          <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} · Chiffrées · Supprimées à la sortie
          </div>
        </div>
        {photos.length > 0 && !readOnly && (
          <button onClick={() => setShowTransfer(true)}
            style={{ background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:8, color:C, fontSize:12, padding:'6px 10px', cursor:'pointer' }}>
            📤 Partager
          </button>
        )}
      </div>

      {/* Bandeau lecture seule */}
      {readOnly && (
        <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b33', borderRadius:10, padding:'8px 12px', marginBottom:12, color:'#f59e0b', fontSize:12 }}>
          👁 Consultation uniquement — Ajout impossible sur cette date
        </div>
      )}

      {error && (
        <div style={{ background:'#f43f5e18', border:'1px solid #f43f5e33', borderRadius:10, padding:'8px 12px', marginBottom:12, color:'#f43f5e', fontSize:12 }}>
          {error}
        </div>
      )}

      {/* Grille photos */}
      {photos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {photos.map((p, i) => (
            <div key={p.filename} onClick={() => setSelected(p)} style={{ cursor:'pointer', borderRadius:12, overflow:'hidden', border:`1px solid ${P.bdr}`, position:'relative' }}>
              <img src={p.dataUrl} alt={p.label}
                style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.55)', padding:'4px 8px' }}>
                <div style={{ color:'#fff', fontSize:10, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</div>
                <div style={{ color:'rgba(255,255,255,0.7)', fontSize:9 }}>{p.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {photos.length === 0 && !readOnly && (
        <div style={{ textAlign:'center', padding:'32px 16px', color:T.muted, fontSize:13, lineHeight:1.6 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
          Aucune photo de plaie enregistrée<br/>
          <span style={{ fontSize:12 }}>Les photos sont chiffrées et supprimées à la sortie du patient</span>
        </div>
      )}

      {/* Boutons capture */}
      {!readOnly && (
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => handleCapture(false)} disabled={saving}
            style={{ flex:1, background:C+'22', border:`1px solid ${C}44`, borderRadius:12, color:C, padding:'13px', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            📷 {saving ? 'Enregistrement…' : 'Photo'}
          </button>
          <button onClick={() => handleCapture(true)} disabled={saving}
            style={{ flex:1, background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            🖼 Galerie
          </button>
        </div>
      )}

      {/* Modal libellé */}
      {showLabel && (
        <div onTouchMove={e => e.stopPropagation()}
          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', zIndex:200 }}>
          <div style={{ background:T.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 40px', width:'100%', boxSizing:'border-box' }}>
            <div style={{ color:T.text, fontWeight:700, fontSize:16, marginBottom:14 }}>📝 Libellé de la photo</div>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex : Plaie tibiale J3 post-op"
              autoFocus
              style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'11px 14px', color:T.text, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:12 }}
            />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setShowLabel(false); setPendingB64(null); }}
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

      {/* Plein écran photo */}
      {selected && (
        <div onTouchMove={e => e.stopPropagation()}
          style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', display:'flex', flexDirection:'column', zIndex:300 }}>
          {/* Header */}
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
          {/* Image */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 8px' }}>
            <img src={selected.dataUrl} alt={selected.label}
              style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', borderRadius:8 }} />
          </div>
          <div style={{ padding:'12px 16px 32px', textAlign:'center', color:'rgba(255,255,255,0.4)', fontSize:11 }}>
            🔒 Photo chiffrée AES-256
          </div>
        </div>
      )}

      {/* Transfert sécurisé */}
      {showTransfer && (
        <WoundPhotoTransfer
          photos={photos}
          patient={patient}
          service={service}
          cryptoKey={cryptoKey}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}
