/**
 * WoundPhotoTransfer.jsx — Transfert sécurisé de photos de plaies
 * 
 * Export : photo chiffrée → fichier .nplanr.enc → Intent Android SEND
 *          (Bluetooth, Nearby Share, messagerie, etc.)
 * Import : sélectionner un fichier .nplanr.enc → déchiffrer → attacher au patient
 * Code : verbal 6 chiffres, valide 15 minutes
 */

import { useState } from 'react';
import { T, s, loadDarkPref } from '../../theme.js';

const C = '#f97316';

// ── Crypto transfert ──────────────────────────────────────────────────────────

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function deriveTransferKey(code) {
  const enc = new TextEncoder().encode(`nplanr_wound_${code}`);
  const base = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt: new TextEncoder().encode('nplanr_wound_salt_v1'), iterations:50000, hash:'SHA-256' },
    base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
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

export default function WoundPhotoTransfer({ photos, patient, service, cryptoKey, onClose }) {
  const [mode,       setMode]       = useState(null); // 'export' | 'import'
  const [selPhoto,   setSelPhoto]   = useState(null);
  const [code,       setCode]       = useState('');
  const [busy,       setBusy]       = useState(false);
  const [step,       setStep]       = useState('select'); // select | code | done | error
  const [error,      setError]      = useState('');
  const [importCode, setImportCode] = useState('');

  const dark = loadDarkPref();
  const P = {
    glass: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    bdr:   dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };

  // ── EXPORT ────────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!selPhoto) return;
    setBusy(true);
    setError('');
    try {
      // 1. Déchiffrer la photo avec la clé patient
      const { Filesystem, Directory } = await (await import('@capacitor/filesystem')).default ?? 
        await import('@capacitor/filesystem');

      // Dynamique import
      const fsModule = await import('@capacitor/filesystem');
      const Fs = fsModule.Filesystem;
      const Dir = fsModule.Directory;

      const file = await Fs.readFile({ path: selPhoto.filename, directory: Dir.Data });

      function b64ToU8(b64) {
        const bin = atob(b64); const arr = new Uint8Array(bin.length);
        for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr;
      }

      const encBytes = b64ToU8(file.data);
      const iv_plain = encBytes.slice(0, 12);
      const ct_plain = encBytes.slice(12);
      const plainBytes = new Uint8Array(
        await crypto.subtle.decrypt({ name:'AES-GCM', iv:iv_plain }, cryptoKey, ct_plain)
      );

      // 2. Re-chiffrer avec la clé de transfert
      const newCode = generateCode();
      const transferKey = await deriveTransferKey(newCode);
      const iv_transfer = crypto.getRandomValues(new Uint8Array(12));
      const ct_transfer = await crypto.subtle.encrypt(
        { name:'AES-GCM', iv:iv_transfer }, transferKey, plainBytes
      );

      // 3. Construire le blob JSON
      const blob = {
        v: 1,
        label: selPhoto.label,
        time: selPhoto.time,
        patient: patient.initials,
        service: service.name,
        expires: Date.now() + 15 * 60 * 1000,
        iv: uint8ToBase64(iv_transfer),
        ct: uint8ToBase64(new Uint8Array(ct_transfer)),
      };
      const blobB64 = btoa(JSON.stringify(blob));

      // 4. Écrire le fichier temporaire .nplanr.enc
      const tmpFile = `nplanr_wound_transfer_${Date.now()}.enc`;
      await Fs.writeFile({
        path: tmpFile,
        data: blobB64,
        directory: Dir.Cache,
        recursive: true,
      });

      const fileUri = await Fs.getUri({ path: tmpFile, directory: Dir.Cache });

      // 5. Intent Android SEND
      const shareModule = await import('@capacitor/share');
      const Share = shareModule.Share;
      await Share.share({
        title: `Photo plaie — ${patient.initials} — ${selPhoto.label}`,
        text: `Code de déchiffrement (valide 15 min) : ${newCode}\n\nOuvrir dans N-Planr pour importer.`,
        url: fileUri.uri,
        dialogTitle: 'Envoyer la photo chiffrée via…',
      });

      setCode(newCode);
      setStep('done');
    } catch (e) {
      console.error(e);
      setError('Erreur lors de l\'export : ' + (e?.message || 'inconnue'));
      setStep('error');
    } finally { setBusy(false); }
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (importCode.length !== 6) { setError('Code à 6 chiffres requis.'); return; }
    setBusy(true);
    setError('');
    try {
      // Sélectionner le fichier via intent
      const { FilePicker } = await import('@capawesome/capacitor-file-picker');
      const result = await FilePicker.pickFiles({ types: ['application/octet-stream'], multiple: false });
      if (!result.files?.length) { setBusy(false); return; }
      const picked = result.files[0];

      // Lire le contenu base64
      const fsModule = await import('@capacitor/filesystem');
      const Fs = fsModule.Filesystem;
      const Dir = fsModule.Directory;

      let blobB64;
      if (picked.data) {
        blobB64 = picked.data;
      } else {
        const read = await Fs.readFile({ path: picked.path });
        blobB64 = read.data;
      }

      const blob = JSON.parse(atob(blobB64));
      if (blob.v !== 1 || !blob.iv || !blob.ct) throw new Error('Fichier invalide');
      if (blob.expires < Date.now()) throw new Error('Code expiré (> 15 min)');

      // Déchiffrer avec le code
      const transferKey = await deriveTransferKey(importCode.trim());
      const plainBytes = new Uint8Array(await crypto.subtle.decrypt(
        { name:'AES-GCM', iv: base64ToUint8(blob.iv) }, transferKey, base64ToUint8(blob.ct)
      ));

      // Re-chiffrer avec la clé patient locale
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, cryptoKey, plainBytes);
      const encBytes = new Uint8Array(12 + ct.byteLength);
      encBytes.set(iv, 0); encBytes.set(new Uint8Array(ct), 12);

      // Sauvegarder
      const ts = Date.now();
      const filename = `am_wound_${service.id}_${patient.id}_${ts}.enc`;
      await Fs.writeFile({
        path: filename, data: uint8ToBase64(encBytes),
        directory: Dir.Data, recursive: true,
      });

      // Mettre à jour l'index
      const idxKey = `am_wound_idx_${service.id}_${patient.id}`;
      const idx = (() => { try { return JSON.parse(localStorage.getItem(idxKey)||'[]'); } catch {return[];} })();
      idx.push({ filename, ts, label: blob.label || 'Photo importée', time: blob.time || '--:--' });
      localStorage.setItem(idxKey, JSON.stringify(idx));

      setStep('done');
      setTimeout(() => onClose(), 2000);
    } catch (e) {
      console.error(e);
      setError('Code incorrect ou fichier invalide.');
      setStep('error');
    } finally { setBusy(false); }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <div onTouchMove={e => e.stopPropagation()}
      style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.78)', display:'flex', alignItems:'flex-end', zIndex:400 }}>
      <div style={{ background:T.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 44px', width:'100%', boxSizing:'border-box', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ color:C, fontSize:11, fontFamily:'monospace', letterSpacing:2, textTransform:'uppercase', fontWeight:700 }}>TRANSFERT SÉCURISÉ</div>
            <div style={{ color:T.text, fontWeight:700, fontSize:18, marginTop:2 }}>📤 Photos de plaies</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer' }}>×</button>
        </div>

        {/* Info sécurité */}
        <div style={{ background:C+'12', border:`1px solid ${C}30`, borderRadius:12, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ color:C, fontSize:12, fontWeight:700, marginBottom:4 }}>🔒 Chiffrement de bout en bout</div>
          <div style={{ color:T.muted, fontSize:12, lineHeight:1.6 }}>
            La photo est chiffrée AES-256 avec un code à usage unique valide 15 minutes.
            Le code est transmis verbalement, séparément du fichier.
          </div>
        </div>

        {/* Choix mode */}
        {!mode && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => { setMode('export'); setStep('select'); }}
              style={{ background:C+'22', border:`1px solid ${C}44`, borderRadius:14, color:C, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
              📤 Envoyer une photo
              <div style={{ fontSize:12, color:C+'99', fontWeight:400, marginTop:4 }}>
                Sélectionner une photo → partager via Bluetooth / Nearby
              </div>
            </button>
            <button onClick={() => { setMode('import'); setStep('select'); }}
              style={{ background:P.glass, border:`1px solid ${P.bdr}`, borderRadius:14, color:T.text, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
              📥 Recevoir une photo
              <div style={{ fontSize:12, color:T.muted, fontWeight:400, marginTop:4 }}>
                Importer un fichier .enc reçu + saisir le code verbal
              </div>
            </button>
          </div>
        )}

        {/* EXPORT — sélection photo */}
        {mode === 'export' && step === 'select' && (
          <>
            <div style={{ color:T.muted, fontSize:13, marginBottom:12 }}>Choisir la photo à envoyer :</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {photos.map(p => (
                <div key={p.filename} onClick={() => setSelPhoto(p)}
                  style={{ borderRadius:10, overflow:'hidden', border:`2px solid ${selPhoto?.filename===p.filename ? C : P.bdr}`, cursor:'pointer', position:'relative' }}>
                  <img src={p.dataUrl} alt={p.label} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}/>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.6)', padding:'3px 6px' }}>
                    <div style={{ color:'#fff', fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
            {error && <div style={{ color:'#f43f5e', fontSize:13, marginBottom:10 }}>{error}</div>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setMode(null)} style={{ flex:1, background:'none', border:`1px solid ${P.bdr}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer' }}>Retour</button>
              <button onClick={handleExport} disabled={!selPhoto || busy}
                style={{ flex:1, background:selPhoto&&!busy?C:'#555', border:'none', borderRadius:12, color:'#fff', padding:'13px', fontSize:14, fontWeight:700, cursor:selPhoto?'pointer':'default' }}>
                {busy ? 'Chiffrement…' : '📤 Envoyer'}
              </button>
            </div>
          </>
        )}

        {/* IMPORT */}
        {mode === 'import' && step === 'select' && (
          <>
            <div style={{ color:T.muted, fontSize:13, marginBottom:12, lineHeight:1.6 }}>
              1. Recevez le fichier .enc via Bluetooth ou Nearby Share<br/>
              2. Saisissez le code verbal communiqué par l'expéditeur
            </div>
            <label style={s.label}>Code à 6 chiffres</label>
            <input value={importCode} onChange={e => setImportCode(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder="123456" inputMode="numeric" maxLength={6}
              style={{ ...s.input, fontSize:22, letterSpacing:8, textAlign:'center', marginBottom:14 }} />
            {error && <div style={{ color:'#f43f5e', fontSize:13, marginBottom:10 }}>{error}</div>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setMode(null)} style={{ flex:1, background:'none', border:`1px solid ${P.bdr}`, borderRadius:12, color:T.muted, padding:'13px', fontSize:14, cursor:'pointer' }}>Retour</button>
              <button onClick={handleImport} disabled={importCode.length!==6||busy}
                style={{ flex:1, background:importCode.length===6&&!busy?C:'#555', border:'none', borderRadius:12, color:'#fff', padding:'13px', fontSize:14, fontWeight:700, cursor:importCode.length===6?'pointer':'default' }}>
                {busy ? 'Import…' : '📥 Importer'}
              </button>
            </div>
          </>
        )}

        {/* Succès export */}
        {step === 'done' && mode === 'export' && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ color:T.text, fontWeight:700, fontSize:18, marginBottom:8 }}>Fichier envoyé</div>
            <div style={{ color:T.muted, fontSize:13, marginBottom:16, lineHeight:1.6 }}>
              Communiquez verbalement ce code au destinataire :<br/>
              <span style={{ fontSize:28, fontWeight:800, color:C, letterSpacing:6, fontFamily:'monospace' }}>{code}</span><br/>
              <span style={{ fontSize:11 }}>Valide 15 minutes · Usage unique</span>
            </div>
            <button onClick={onClose} style={{ background:C, border:'none', borderRadius:12, color:'#fff', padding:'13px 28px', fontSize:15, fontWeight:700, cursor:'pointer' }}>Fermer</button>
          </div>
        )}

        {/* Succès import */}
        {step === 'done' && mode === 'import' && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ color:T.text, fontWeight:700, fontSize:18 }}>Photo importée</div>
            <div style={{ color:T.muted, fontSize:13, marginTop:8 }}>Chiffrée et attachée au patient</div>
          </div>
        )}

        {/* Erreur */}
        {step === 'error' && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
            <div style={{ color:'#f43f5e', fontSize:15, marginBottom:16 }}>{error}</div>
            <button onClick={() => { setStep('select'); setError(''); }}
              style={{ background:C, border:'none', borderRadius:12, color:'#fff', padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>Réessayer</button>
          </div>
        )}

      </div>
    </div>
  );
}
