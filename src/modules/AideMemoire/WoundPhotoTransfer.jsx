/**
 * WoundPhotoTransfer.jsx — Transfert sécurisé de photos de plaies
 * Export : chiffrement AES-256 + Intent Android SEND (.nplanr.enc)
 * Import : input[type=file] natif + déchiffrement + code verbal 6 chiffres
 */

import { useState, useRef } from 'react';
import { T, s, loadDarkPref } from '../../theme.js';
import { Share } from '@capacitor/share';

const C = '#f97316';

async function deriveTransferKey(code) {
  const enc = new TextEncoder().encode(`nplanr_wound_${code}`);
  const base = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt:new TextEncoder().encode('nplanr_wound_salt_v1'), iterations:50000, hash:'SHA-256' },
    base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
  );
}

function b64toU8(b64) {
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return a;
}
function u8toB64(a) {
  let s=''; a.forEach(b=>s+=String.fromCharCode(b)); return btoa(s);
}
// btoa() ne supporte pas l'Unicode — on encode en UTF-8 d'abord
function jsonToB64(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function b64ToJson(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default function WoundPhotoTransfer({ photos, patient, service, cryptoKey, onClose, onImported }) {
  const [mode,       setMode]       = useState(null);
  const [selPhoto,   setSelPhoto]   = useState(null);
  const [code,       setCode]       = useState('');
  const [busy,       setBusy]       = useState(false);
  const [step,       setStep]       = useState('select');
  const [error,      setError]      = useState('');
  const [importCode, setImportCode] = useState('');
  const [importBlob,  setImportBlob]  = useState('');
  const fileRef = useRef(null);

  const dark = loadDarkPref();
  const P = {
    glass: dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',
    bdr:   dark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.10)',
  };

  // ── EXPORT ────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!selPhoto) return;
    setBusy(true); setError('');
    try {

      // Lire le fichier chiffré
      const file = { data: localStorage.getItem('am_wound_' + service.id + '_' + patient.id + '_' + selPhoto.ts) };
      const enc  = b64toU8(file.data);

      // Déchiffrer avec la clé patient
      const iv_p = enc.slice(0,12), ct_p = enc.slice(12);
      const plain = new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:iv_p}, cryptoKey, ct_p));

      // Re-chiffrer avec clé de transfert
      const newCode    = String(Math.floor(100000 + Math.random()*900000));
      const tKey       = await deriveTransferKey(newCode);
      const iv_t       = crypto.getRandomValues(new Uint8Array(12));
      const ct_t       = await crypto.subtle.encrypt({name:'AES-GCM',iv:iv_t}, tKey, plain);

      const blob = {
        v:1, label:selPhoto.label, time:selPhoto.time,
        patient:patient.initials, service:service.name,
        expires:Date.now()+15*60*1000,
        iv:u8toB64(iv_t), ct:u8toB64(new Uint8Array(ct_t)),
      };
      const blobB64 = jsonToB64(blob);

      // Web Share API avec File object — pas de Filesystem (évite crash URI/FileProvider)
      const shareBytes = new TextEncoder().encode(blobB64);
      const shareFile  = new File([shareBytes], `plaie_${Date.now()}.nplanr`, { type: 'application/octet-stream' });
      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: 'Photo plaie chiffrée' });
      } else {
        await Share.share({ text: blobB64, dialogTitle: 'Envoyer via…' });
      }

      setCode(newCode);
      setStep('done');
    } catch(e) {
      console.error(e);
      setError('Erreur export : '+(e?.message||'inconnue'));
      setStep('error');
    } finally { setBusy(false); }
  }

  // ── IMPORT — lecture via input[type=file] ─────────────────────────────────
  async function handleImportBlob(blobB64, transferCode) {
    setBusy(true); setError('');
    let blobDecoded = false;
    try {
      const blob = b64ToJson(blobB64.trim().replace(/\s+/g, ''));
      blobDecoded = true;
      if (blob.v !== 1 || !blob.iv || !blob.ct) throw new Error('Blob invalide');
      if (blob.expires < Date.now()) throw new Error('Code expiré (> 15 min)');
      const tKey  = await deriveTransferKey(transferCode.trim());
      const plain = new Uint8Array(await crypto.subtle.decrypt(
        {name:'AES-GCM', iv:b64toU8(blob.iv)}, tKey, b64toU8(blob.ct)
      ));
      const iv2  = crypto.getRandomValues(new Uint8Array(12));
      const ct2  = await crypto.subtle.encrypt({name:'AES-GCM',iv:iv2}, cryptoKey, plain);
      const enc2 = new Uint8Array(12+ct2.byteLength);
      enc2.set(iv2,0); enc2.set(new Uint8Array(ct2),12);
      const ts  = Date.now();
      localStorage.setItem('am_wound_'+service.id+'_'+patient.id+'_'+ts, u8toB64(enc2));
      const idxKey = 'am_wound_idx_'+service.id+'_'+patient.id;
      const idx = (()=>{ try{return JSON.parse(localStorage.getItem(idxKey)||'[]');}catch{return[];} })();
      idx.push({ ts, label:blob.label||'Photo importée', time:blob.time||'--:--' });
      localStorage.setItem(idxKey, JSON.stringify(idx));
      setStep('done');
      setTimeout(()=>{ onImported?.(); onClose(); }, 2000);
    } catch(e) {
      console.error('[WoundPhotoTransfer import]', e);
      if (e?.message === 'Code expiré (> 15 min)') setError('Code expiré.');
      else if (!blobDecoded || e?.message === 'Blob invalide') setError('Texte invalide — vérifiez le collage.');
      else setError('Code incorrect — vérifiez les 6 chiffres saisis.');
    } finally { setBusy(false); }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      // Lire le fichier comme texte base64
      const blobB64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsText(file);
      });

      const blob = b64ToJson(blobB64.trim().replace(/\s+/g, ''));
      if (blob.v!==1||!blob.iv||!blob.ct) throw new Error('Fichier invalide');
      if (blob.expires < Date.now())       throw new Error('Code expiré (> 15 min)');
      if (!importCode||importCode.length!==6) throw new Error('Code à 6 chiffres requis');

      // Déchiffrer avec le code verbal
      const tKey  = await deriveTransferKey(importCode.trim());
      const plain = new Uint8Array(await crypto.subtle.decrypt(
        {name:'AES-GCM', iv:b64toU8(blob.iv)}, tKey, b64toU8(blob.ct)
      ));

      // Re-chiffrer avec la clé patient
      const iv2  = crypto.getRandomValues(new Uint8Array(12));
      const ct2  = await crypto.subtle.encrypt({name:'AES-GCM',iv:iv2}, cryptoKey, plain);
      const enc2 = new Uint8Array(12+ct2.byteLength);
      enc2.set(iv2,0); enc2.set(new Uint8Array(ct2),12);

      // Sauvegarder
      const ts       = Date.now();
      const filename = `am_wound_${service.id}_${patient.id}_${ts}.enc`;
      await Promise.resolve(localStorage.setItem('am_wound_' + service.id + '_' + patient.id + '_' + ts, u8toB64(enc2)));

      // Index
      const idxKey = `am_wound_idx_${service.id}_${patient.id}`;
      const idx = (() => { try { return JSON.parse(localStorage.getItem(idxKey)||'[]'); } catch{return[];} })();
      idx.push({ ts, label:blob.label||'Photo importée', time:blob.time||'--:--' });
      localStorage.setItem(idxKey, JSON.stringify(idx));

      setStep('done');
      setTimeout(() => { onImported?.(); onClose(); }, 2000);
    } catch(e) {
      console.error(e);
      setError(e?.message==='Code expiré (> 15 min)' ? 'Code expiré.' : 'Code incorrect ou fichier invalide.');
    } finally { setBusy(false); }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div onTouchMove={e=>e.stopPropagation()}
      style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.78)',display:'flex',alignItems:'flex-end',zIndex:400}}>
      <div style={{background:T.surface,borderRadius:'20px 20px 0 0',padding:'20px 20px 44px',width:'100%',boxSizing:'border-box',maxHeight:'90vh',overflowY:'auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div style={{color:C,fontSize:11,fontFamily:'monospace',letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>TRANSFERT SÉCURISÉ</div>
            <div style={{color:T.text,fontWeight:700,fontSize:18,marginTop:2}}>📤 Photos de plaies</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:T.muted,fontSize:22,cursor:'pointer'}}>×</button>
        </div>

        <div style={{background:C+'12',border:`1px solid ${C}30`,borderRadius:12,padding:'10px 14px',marginBottom:16}}>
          <div style={{color:C,fontSize:12,fontWeight:700,marginBottom:4}}>🔒 Chiffrement de bout en bout</div>
          <div style={{color:T.muted,fontSize:12,lineHeight:1.6}}>
            AES-256 · Code unique 6 chiffres valide 15 min · Communiqué verbalement
          </div>
        </div>

        {/* Choix mode */}
        {!mode && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={()=>{setMode('export');setStep('select');}}
              style={{background:C+'22',border:`1px solid ${C}44`,borderRadius:14,color:C,padding:'15px',fontSize:15,fontWeight:700,cursor:'pointer',textAlign:'left'}}>
              📤 Envoyer une photo
              <div style={{fontSize:12,color:C+'99',fontWeight:400,marginTop:4}}>Sélectionner → fichier .nplanr partagé via WhatsApp / Nearby Share</div>
            </button>
            <button onClick={()=>{setMode('import');setStep('select');}}
              style={{background:P.glass,border:`1px solid ${P.bdr}`,borderRadius:14,color:T.text,padding:'15px',fontSize:15,fontWeight:700,cursor:'pointer',textAlign:'left'}}>
              📥 Recevoir une photo
              <div style={{fontSize:12,color:T.muted,fontWeight:400,marginTop:4}}>Ouvrir le fichier .nplanr reçu + code verbal</div>
            </button>
          </div>
        )}

        {/* EXPORT — sélection */}
        {mode==='export' && step==='select' && (
          <>
            <div style={{color:T.muted,fontSize:13,marginBottom:12}}>Choisir la photo à envoyer :</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {photos.map(p=>(
                <div key={p.ts} onClick={()=>setSelPhoto(p)}
                  style={{borderRadius:10,overflow:'hidden',border:`2px solid ${selPhoto?.ts===p.ts?C:P.bdr}`,cursor:'pointer',position:'relative'}}>
                  <img src={p.dataUrl} alt={p.label} style={{width:'100%',aspectRatio:'1',objectFit:'cover',display:'block'}}/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.6)',padding:'3px 6px'}}>
                    <div style={{color:'#fff',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
            {error&&<div style={{color:'#f43f5e',fontSize:13,marginBottom:10}}>{error}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setMode(null)} style={{flex:1,background:'none',border:`1px solid ${P.bdr}`,borderRadius:12,color:T.muted,padding:'13px',fontSize:14,cursor:'pointer'}}>Retour</button>
              <button onClick={handleExport} disabled={!selPhoto||busy}
                style={{flex:1,background:selPhoto&&!busy?C:'#555',border:'none',borderRadius:12,color:'#fff',padding:'13px',fontSize:14,fontWeight:700,cursor:selPhoto?'pointer':'default'}}>
                {busy?'Chiffrement…':'📤 Envoyer'}
              </button>
            </div>
          </>
        )}

        {/* IMPORT */}
        {mode==='import' && step==='select' && (
          <>
            <div style={{color:T.muted,fontSize:13,marginBottom:12,lineHeight:1.6}}>
              1. Saisissez le code verbal (6 chiffres)<br/>
              2. Ouvrez le fichier <span style={{fontFamily:'monospace'}}>.nplanr</span> reçu
            </div>
            <label style={s.label}>Code à 6 chiffres</label>
            <input value={importCode} onChange={e=>setImportCode(e.target.value.replace(/\D/g,'').slice(0,6))}
              placeholder='123456' inputMode='numeric' maxLength={6}
              style={{...s.input,fontSize:22,letterSpacing:8,textAlign:'center',marginBottom:14}}/>
            <input ref={fileRef} type='file' accept='.nplanr' onChange={handleFileChange} style={{display:'none'}}/>
            {error&&<div style={{color:'#f43f5e',fontSize:13,marginBottom:10}}>{error}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setMode(null)} style={{flex:1,background:'none',border:`1px solid ${P.bdr}`,borderRadius:12,color:T.muted,padding:'13px',fontSize:14,cursor:'pointer'}}>Retour</button>
              <button onClick={()=>fileRef.current?.click()}
                disabled={busy||importCode.length!==6}
                style={{flex:1,background:!busy&&importCode.length===6?C:'#555',border:'none',borderRadius:12,color:'#fff',padding:'13px',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                {busy?'Import…':'📂 Ouvrir .nplanr'}
              </button>
            </div>
          </>
        )}

        {/* Succès export */}
        {step==='done'&&mode==='export'&&(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{color:T.text,fontWeight:700,fontSize:18,marginBottom:8}}>Fichier envoyé</div>
            <div style={{color:T.muted,fontSize:13,marginBottom:16,lineHeight:1.6}}>
              Code verbal à communiquer :<br/>
              <span style={{fontSize:28,fontWeight:800,color:C,letterSpacing:6,fontFamily:'monospace'}}>{code}</span><br/>
              <span style={{fontSize:11}}>Valide 15 min · Usage unique</span>
            </div>
            <button onClick={onClose} style={{background:C,border:'none',borderRadius:12,color:'#fff',padding:'13px 28px',fontSize:15,fontWeight:700,cursor:'pointer'}}>Fermer</button>
          </div>
        )}

        {/* Succès import */}
        {step==='done'&&mode==='import'&&(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{color:T.text,fontWeight:700,fontSize:18}}>Photo importée</div>
            <div style={{color:T.muted,fontSize:13,marginTop:8}}>Chiffrée et attachée au patient</div>
          </div>
        )}

        {/* Erreur */}
        {step==='error'&&(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>❌</div>
            <div style={{color:'#f43f5e',fontSize:15,marginBottom:16}}>{error}</div>
            <button onClick={()=>{setStep('select');setError('');}}
              style={{background:C,border:'none',borderRadius:12,color:'#fff',padding:'12px 24px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Réessayer</button>
          </div>
        )}

      </div>
    </div>
  );
}
