/**
 * WoundPhotoQRTransfer.jsx — Transfert QR animé de photos de plaies
 * Send : photo → chiffrement AES-256 → découpage → QR codes animés
 * Receive : caméra → jsQR → assemblage → code verbal → déchiffrement
 */

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { T, loadDarkPref } from '../../theme.js';

const C = '#f97316';
const CHUNK_SIZE = 1200; // chars base64 par QR (bien en dessous du max binaire L ~2953)
const FPS = 2;

// ── Crypto (dupliqué depuis WoundPhotoTransfer) ───────────────────────────────

async function deriveTransferKey(code) {
  const enc  = new TextEncoder().encode(`nplanr_wound_${code}`);
  const base = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt:new TextEncoder().encode('nplanr_wound_salt_v1'), iterations:50000, hash:'SHA-256' },
    base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
  );
}

function b64toU8(b64) {
  const bin = atob(b64);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function u8toB64chunked(a) {
  let s = '';
  const SZ = 8192;
  for (let i = 0; i < a.length; i += SZ) s += String.fromCharCode(...a.subarray(i, i + SZ));
  return btoa(s);
}

function jsonToB64(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function b64ToJson(b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function compressImageForTransfer(plainBytes) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([plainBytes]);
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.onload  = () => {
      URL.revokeObjectURL(url);
      const MAX   = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width  * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => {
        if (!b) { reject(new Error('Compression échouée')); return; }
        b.arrayBuffer().then(ab => resolve(new Uint8Array(ab))).catch(reject);
      }, 'image/jpeg', 0.65);
    };
    img.src = url;
  });
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function makeChunks(data) {
  const raw = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) raw.push(data.slice(i, i + CHUNK_SIZE));
  return raw.map((d, i) => `NP1:${raw.length}:${i}:${d}`);
}

function parseChunk(str) {
  if (!str || !str.startsWith('NP1:')) return null;
  const colon1 = str.indexOf(':', 4);
  const colon2 = str.indexOf(':', colon1 + 1);
  const colon3 = str.indexOf(':', colon2 + 1);
  if (colon1 < 0 || colon2 < 0 || colon3 < 0) return null;
  const total = parseInt(str.slice(4, colon1), 10);
  const index = parseInt(str.slice(colon1 + 1, colon2), 10);
  const data  = str.slice(colon3 + 1);
  if (isNaN(total) || isNaN(index)) return null;
  return { total, index, data };
}

// ── QRSend ────────────────────────────────────────────────────────────────────

function QRSend({ photo, patient, service, onClose }) {
  const [qrImages, setQrImages] = useState([]);
  const [code,     setCode]     = useState('');
  const [busy,     setBusy]     = useState(true);
  const [error,    setError]    = useState('');
  const [frame,    setFrame]    = useState(0);
  const [paused,   setPaused]   = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      try {
        // Extraire les bytes depuis le dataUrl déjà déchiffré
        const b64 = photo.dataUrl.split(',')[1];
        const bin = atob(b64);
        const plainBytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) plainBytes[i] = bin.charCodeAt(i);

        const compressed = await compressImageForTransfer(plainBytes);

        const newCode = String(Math.floor(100000 + Math.random() * 900000));
        const tKey    = await deriveTransferKey(newCode);
        const iv_t    = crypto.getRandomValues(new Uint8Array(12));
        const ct_t    = await crypto.subtle.encrypt({ name:'AES-GCM', iv:iv_t }, tKey, compressed);

        const blob = {
          v:1, label:photo.label, time:photo.time,
          patient:patient.initials, service:service.name,
          expires:Date.now() + 15*60*1000,
          iv:u8toB64chunked(iv_t), ct:u8toB64chunked(new Uint8Array(ct_t)),
        };
        const blobB64  = jsonToB64(blob);
        const chunks   = makeChunks(blobB64);
        const images   = [];
        for (const chunk of chunks) {
          const url = await QRCode.toDataURL(chunk, { errorCorrectionLevel:'L', width:280, margin:1 });
          images.push(url);
        }
        if (!cancelled) { setQrImages(images); setCode(newCode); setBusy(false); }
      } catch(e) {
        if (!cancelled) { setError(e?.message || 'Erreur'); setBusy(false); }
      }
    }
    prepare();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!qrImages.length || paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setFrame(f => (f + 1) % qrImages.length), 1000 / FPS);
    return () => clearInterval(timerRef.current);
  }, [qrImages, paused]);

  const P = { bdr: 'rgba(128,128,128,0.2)' };

  if (busy) return (
    <div style={{ textAlign:'center', padding:'40px 20px' }}>
      <div style={{ color:T.muted, fontSize:14 }}>Chiffrement et génération des QR codes…</div>
    </div>
  );
  if (error) return (
    <div style={{ textAlign:'center', padding:'40px 20px' }}>
      <div style={{ color:'#f43f5e', fontSize:14, marginBottom:16 }}>{error}</div>
      <button onClick={onClose} style={{ background:C, border:'none', borderRadius:10, color:'#fff', padding:'10px 20px', cursor:'pointer' }}>Fermer</button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ background:C+'12', border:`1px solid ${C}30`, borderRadius:12, padding:'10px 14px', width:'100%', boxSizing:'border-box' }}>
        <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:4 }}>Code verbal à communiquer</div>
        <div style={{ color:T.text, fontWeight:800, fontSize:28, letterSpacing:8, fontFamily:'monospace', textAlign:'center' }}>{code}</div>
        <div style={{ color:T.muted, fontSize:11, textAlign:'center', marginTop:4 }}>Valide 15 min · Usage unique</div>
      </div>

      <div style={{ position:'relative', background:'#fff', borderRadius:12, padding:8, alignSelf:'center' }}>
        {qrImages[frame] && (
          <img src={qrImages[frame]} alt={`QR ${frame+1}/${qrImages.length}`}
            style={{ width:260, height:260, display:'block', borderRadius:4 }}/>
        )}
        <div style={{ position:'absolute', bottom:14, right:14, background:'rgba(0,0,0,0.65)', borderRadius:8, padding:'2px 8px' }}>
          <span style={{ color:'#fff', fontSize:11, fontFamily:'monospace' }}>{frame+1}/{qrImages.length}</span>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, width:'100%' }}>
        <button onClick={() => setFrame(f => (f - 1 + qrImages.length) % qrImages.length)}
          style={{ flex:1, background:'none', border:`1px solid ${P.bdr}`, borderRadius:10, color:T.text, padding:'10px', cursor:'pointer', fontSize:18 }}>◀</button>
        <button onClick={() => setPaused(p => !p)}
          style={{ flex:2, background:paused?C+'22':'none', border:`1px solid ${paused?C:P.bdr}`, borderRadius:10, color:paused?C:T.muted, padding:'10px', cursor:'pointer', fontSize:13, fontWeight:paused?700:400 }}>
          {paused ? '▶ Reprendre' : '⏸ Pause'}
        </button>
        <button onClick={() => setFrame(f => (f + 1) % qrImages.length)}
          style={{ flex:1, background:'none', border:`1px solid ${P.bdr}`, borderRadius:10, color:T.text, padding:'10px', cursor:'pointer', fontSize:18 }}>▶</button>
      </div>

      <div style={{ color:T.muted, fontSize:11, textAlign:'center', lineHeight:1.6 }}>
        {qrImages.length > 1
          ? `${qrImages.length} codes — montrez-les un par un dans l'ordre`
          : 'Montrez ce code à scanner sur l\'autre appareil'}
      </div>

      <button onClick={onClose}
        style={{ background:'none', border:`1px solid ${P.bdr}`, borderRadius:10, color:T.muted, padding:'10px', cursor:'pointer', fontSize:14, width:'100%' }}>
        Fermer
      </button>
    </div>
  );
}

// ── QRReceive ─────────────────────────────────────────────────────────────────

function QRReceive({ patient, service, cryptoKey, onClose, onImported }) {
  const [step,     setStep]     = useState('scan'); // 'scan' | 'code' | 'done' | 'error'
  const [chunks,   setChunks]   = useState({});
  const [total,    setTotal]    = useState(null);
  const [blobB64,  setBlobB64]  = useState('');
  const [code,     setCode]     = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const chunksRef  = useRef({});

  useEffect(() => {
    let stopped = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal:'environment' }, width:{ ideal:1280 }, height:{ ideal:720 } }
        });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch(e) {
        setError('Caméra inaccessible : ' + (e?.message || String(e)));
        setStep('error');
      }
    }
    startCamera();
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 'scan') return;
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!ctx) return;

    function scanFrame() {
      const video = videoRef.current;
      if (video?.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts:'dontInvert' });
        if (qr?.data) {
          const parsed = parseChunk(qr.data);
          if (parsed) {
            const { total: t, index: i, data: d } = parsed;
            if (!chunksRef.current[i]) {
              chunksRef.current = { ...chunksRef.current, [i]: d };
              const count = Object.keys(chunksRef.current).length;
              setChunks({ ...chunksRef.current });
              setTotal(t);
              if (count >= t) {
                const assembled = Array.from({ length:t }, (_, k) => chunksRef.current[k] || '').join('');
                setBlobB64(assembled);
                setStep('code');
                return;
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    }
    rafRef.current = requestAnimationFrame(scanFrame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step]);

  useEffect(() => {
    if (step !== 'scan') { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, [step]);

  async function handleDecrypt() {
    if (code.length !== 6 || busy) return;
    setBusy(true); setError('');
    try {
      const blob = b64ToJson(blobB64.trim());
      if (blob.v !== 1 || !blob.iv || !blob.ct) throw new Error('Données invalides');
      if (blob.expires < Date.now()) throw new Error('expiré');
      const tKey  = await deriveTransferKey(code.trim());
      const plain = new Uint8Array(await crypto.subtle.decrypt(
        { name:'AES-GCM', iv:b64toU8(blob.iv) }, tKey, b64toU8(blob.ct)
      ));
      const iv2  = crypto.getRandomValues(new Uint8Array(12));
      const ct2  = await crypto.subtle.encrypt({ name:'AES-GCM', iv:iv2 }, cryptoKey, plain);
      const enc2 = new Uint8Array(12 + ct2.byteLength);
      enc2.set(iv2, 0); enc2.set(new Uint8Array(ct2), 12);
      const ts = Date.now();
      localStorage.setItem('am_wound_' + service.id + '_' + patient.id + '_' + ts, u8toB64chunked(enc2));
      const idxKey = 'am_wound_idx_' + service.id + '_' + patient.id;
      const idx = (() => { try { return JSON.parse(localStorage.getItem(idxKey) || '[]'); } catch { return []; } })();
      idx.push({ ts, label:blob.label || 'Photo QR', time:blob.time || '--:--' });
      localStorage.setItem(idxKey, JSON.stringify(idx));
      setStep('done');
      setTimeout(() => { onImported?.(); onClose(); }, 2000);
    } catch(e) {
      setError((e?.message||'').includes('expiré') ? 'Code expiré (> 15 min).' : 'Code incorrect — vérifiez les 6 chiffres.');
    } finally { setBusy(false); }
  }

  const P = { bdr:'rgba(128,128,128,0.2)' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {step === 'scan' && (
        <>
          <div style={{ color:T.muted, fontSize:13, textAlign:'center', lineHeight:1.6 }}>
            {total !== null
              ? `${Object.keys(chunks).length}/${total} QR codes reçus — montrez le suivant`
              : 'Pointez la caméra vers les QR codes animés'}
          </div>

          {total !== null && (
            <div style={{ background:T.surface, borderRadius:10, padding:'8px 12px', border:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Array.from({ length:total }, (_, i) => (
                  <div key={i} style={{
                    width:26, height:26, borderRadius:6, fontSize:10, display:'flex',
                    alignItems:'center', justifyContent:'center', fontWeight:700,
                    background: chunks[i] !== undefined ? C+'33' : T.bg,
                    color:      chunks[i] !== undefined ? C : T.muted,
                    border:`1px solid ${chunks[i] !== undefined ? C : T.border}`,
                  }}>{i+1}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderRadius:12, overflow:'hidden', background:'#000', position:'relative', aspectRatio:'4/3' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:220, height:220, border:`2px solid ${C}cc`, borderRadius:8 }}/>
            </div>
            <canvas ref={canvasRef} style={{ display:'none' }}/>
          </div>

          <button onClick={onClose}
            style={{ background:'none', border:`1px solid ${P.bdr}`, borderRadius:10, color:T.muted, padding:'10px', cursor:'pointer', fontSize:14 }}>
            Annuler
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <div style={{ background:C+'12', border:`1px solid ${C}30`, borderRadius:12, padding:'10px 14px' }}>
            <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:4 }}>✅ {total} QR code{total>1?'s':''} scannés</div>
            <div style={{ color:T.muted, fontSize:12 }}>Entrez maintenant le code verbal</div>
          </div>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder='123456' inputMode='numeric' maxLength={6} autoFocus
            style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10,
              padding:'11px 14px', color:T.text, fontSize:22, letterSpacing:8, textAlign:'center',
              outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}/>
          {error && <div style={{ color:'#f43f5e', fontSize:13 }}>{error}</div>}
          <button onClick={handleDecrypt} disabled={busy || code.length !== 6}
            style={{ background:code.length===6&&!busy?C:'#555', border:'none', borderRadius:12,
              color:'#fff', padding:'13px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            {busy ? 'Déchiffrement…' : '🔓 Importer la photo'}
          </button>
          <button onClick={onClose}
            style={{ background:'none', border:`1px solid ${P.bdr}`, borderRadius:10, color:T.muted, padding:'10px', cursor:'pointer', fontSize:14 }}>
            Annuler
          </button>
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <div style={{ color:T.text, fontWeight:700, fontSize:18 }}>Photo importée</div>
          <div style={{ color:T.muted, fontSize:13, marginTop:8 }}>Chiffrée et attachée au patient</div>
        </div>
      )}

      {step === 'error' && (
        <div style={{ textAlign:'center', padding:'24px 0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
          <div style={{ color:'#f43f5e', fontSize:14, marginBottom:16 }}>{error}</div>
          <button onClick={onClose}
            style={{ background:C, border:'none', borderRadius:12, color:'#fff', padding:'12px 24px', cursor:'pointer' }}>
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function WoundPhotoQRTransfer({ photos, patient, service, cryptoKey, onClose, onImported }) {
  const [mode,     setMode]     = useState(null);
  const [selPhoto, setSelPhoto] = useState(null);

  const dark = loadDarkPref();
  const P = {
    glass: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    bdr:   dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };

  return (
    <div
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.78)', display:'flex', alignItems:'flex-end', zIndex:400 }}>
      <div style={{ background:T.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 44px', width:'100%', boxSizing:'border-box', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ color:C, fontSize:11, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:700 }}>TRANSFERT QR</div>
            <div style={{ color:T.text, fontWeight:700, fontSize:18, marginTop:2 }}>📱 QR codes animés</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        <div style={{ background:C+'12', border:`1px solid ${C}30`, borderRadius:12, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:4 }}>🔒 Chiffrement de bout en bout</div>
          <div style={{ color:T.muted, fontSize:12, lineHeight:1.6 }}>
            AES-256 · Aucune connexion requise · Code verbal 6 chiffres valide 15 min
          </div>
        </div>

        {/* Choix mode */}
        {!mode && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => setMode('send')}
              style={{ background:C+'22', border:`1px solid ${C}44`, borderRadius:14, color:C, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
              📤 Envoyer via QR
              <div style={{ fontSize:12, color:C+'99', fontWeight:400, marginTop:4 }}>Affiche des QR codes animés à scanner avec l'autre téléphone</div>
            </button>
            <button onClick={() => setMode('receive')}
              style={{ background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:14, color:T.text, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
              📷 Recevoir via QR
              <div style={{ fontSize:12, color:T.muted, fontWeight:400, marginTop:4 }}>Scanne les QR codes affichés sur l'autre téléphone</div>
            </button>
          </div>
        )}

        {/* Send — sélection photo */}
        {mode === 'send' && !selPhoto && (
          <>
            <div style={{ color:T.muted, fontSize:13, marginBottom:12 }}>Choisir la photo à envoyer :</div>
            {photos.length === 0 && (
              <div style={{ color:T.muted, fontSize:13, textAlign:'center', padding:'20px 0' }}>Aucune photo disponible</div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {photos.map(p => (
                <div key={p.ts} onClick={() => setSelPhoto(p)}
                  style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${P.bdr}`, cursor:'pointer' }}>
                  <img src={p.dataUrl} alt={p.label} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
                  <div style={{ padding:'3px 6px', background:T.bg }}>
                    <div style={{ color:T.text, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setMode(null)}
              style={{ background:'none', border:`1px solid ${P.bdr}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer', width:'100%' }}>Retour</button>
          </>
        )}

        {/* Send — affichage QR */}
        {mode === 'send' && selPhoto && (
          <QRSend
            photo={selPhoto}
            patient={patient}
            service={service}
            onClose={() => { setSelPhoto(null); setMode(null); onClose(); }}
          />
        )}

        {/* Receive */}
        {mode === 'receive' && (
          <QRReceive
            patient={patient}
            service={service}
            cryptoKey={cryptoKey}
            onClose={() => { setMode(null); onClose(); }}
            onImported={onImported}
          />
        )}
      </div>
    </div>
  );
}
