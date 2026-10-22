/**
 * OcrScanner.jsx — Aide-Mémoire
 * Scanner OCR pour feuilles de transmission papier.
 * 100% local : capture caméra (@capacitor/camera) + reconnaissance de texte
 * via tesseract.js, moteur + données de langue (français) servis depuis les
 * assets statiques de l'app (public/tesseract, public/tessdata) — aucun appel réseau.
 * Le texte reconnu est rattaché, après relecture, aux événements du jour d'un patient.
 */
import { useState, useCallback, useEffect } from 'react';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { timeStr, genId } from './utils.jsx';
import MenuButton from './MenuButton.jsx';
import SpringCheck from './SpringCheck.jsx';

async function recognizeText(dataUrl, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('fra', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core-lstm.wasm.js',
    langPath: '/tessdata',
    gzip: true,
    cacheMethod: 'none',
    logger: m => { if (m.status === 'recognizing text') onProgress?.(Math.round((m.progress || 0) * 100)); },
  });
  try {
    const { data } = await worker.recognize(dataUrl);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

export default function OcrScanner({ service, cryptoKey, onBack, onMenu }) {
  const [patients,   setPatients]   = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [step,        setStep]      = useState('capture'); // capture | processing | review
  const [imageUrl,    setImageUrl]  = useState(null);
  const [progress,    setProgress]  = useState(0);
  const [text,        setText]      = useState('');
  const [patientId,   setPatientId] = useState(null);
  const [error,       setError]     = useState('');
  const [saving,      setSaving]    = useState(false);
  const [justSaved,   setJustSaved] = useState(false);

  useEffect(() => {
    secureGet(`patients_${service.id}`, cryptoKey)
      .then(pts => setPatients((pts || []).filter(p => p.present).sort((a, b) => a.bedNumber - b.bedNumber)))
      .finally(() => setLoading(false));
  }, [service.id, cryptoKey]);

  const handleCapture = useCallback(async (fromGallery = false) => {
    setError('');
    try {
      await Camera.requestPermissions({ permissions: fromGallery ? ['photos'] : ['camera'] });
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1400,
        resultType: CameraResultType.DataUrl,
        source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
      });
      if (!photo.dataUrl) { setError('Photo vide.'); return; }
      setImageUrl(photo.dataUrl);
      setStep('processing');
      setProgress(0);
      const recognized = await recognizeText(photo.dataUrl, setProgress);
      setText(recognized);
      setStep('review');
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('User cancelled')) return;
      setError('Erreur scan : ' + msg.slice(0, 100));
      setStep('capture');
    }
  }, []);

  async function handleSave() {
    if (!patientId || !text.trim()) return;
    setSaving(true);
    try {
      const daily = await secureGet(`daily_${service.id}_${timeStrDateKey()}`, cryptoKey) || {};
      const entry = daily[patientId] || { fieldValues: {}, events: [], observations: '', careEntries: [] };
      const next  = { ...entry, events: [...(entry.events || []), { id: genId(), time: timeStr(), text: `📄 ${text.trim()}` }] };
      await secureSet(`daily_${service.id}_${timeStrDateKey()}`, { ...daily, [patientId]: next }, cryptoKey);
      setJustSaved(true);
      setTimeout(() => { onBack(); }, 700);
    } finally {
      setSaving(false);
    }
  }

  function timeStrDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function reset() {
    setImageUrl(null); setText(''); setPatientId(null); setError(''); setProgress(0);
    setStep('capture');
  }

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuButton onClick={onMenu} />
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📄 Scanner transmission</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{service.name} · Reconnaissance 100% locale</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 60px' }}>

        {error && (
          <div style={{ background: '#f43f5e18', border: '1px solid #f43f5e33', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#f43f5e', fontSize: 13 }}>
            {error}
          </div>
        )}

        {step === 'capture' && (
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
            <div style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Photographier une feuille de transmission</div>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 26, lineHeight: 1.6 }}>
              Le texte est extrait sur l'appareil, sans connexion réseau.<br/>Vous pourrez le relire avant de l'associer à un patient.
            </div>
            <div style={{ display: 'flex', gap: 10, maxWidth: 320, margin: '0 auto' }}>
              <button onClick={() => handleCapture(false)}
                style={{ flex: 1, background: '#6366f1', border: 'none', borderRadius: 12, color: '#fff', padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 48 }}>
                📷 Photo
              </button>
              <button onClick={() => handleCapture(true)}
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
                🖼 Galerie
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            {imageUrl && <img src={imageUrl} alt="" style={{ maxWidth: '70%', maxHeight: 180, borderRadius: 12, marginBottom: 20, objectFit: 'contain' }} />}
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: '#6366f1', margin: '0 auto 16px', animation: 'ocrspin 0.8s linear infinite' }} />
            <style>{'@keyframes ocrspin{to{transform:rotate(360deg)}}'}</style>
            <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Reconnaissance en cours… {progress}%</div>
          </div>
        )}

        {step === 'review' && (
          <>
            {imageUrl && (
              <img src={imageUrl} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />
            )}
            <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Texte reconnu (modifiable)</div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
              placeholder="Aucun texte détecté — vous pouvez saisir manuellement"
              style={{ ...s.input, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, marginBottom: 16 }} />

            <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Associer au patient</div>
            {loading ? (
              <div style={{ color: T.muted, fontSize: 13 }}>Chargement…</div>
            ) : patients.length === 0 ? (
              <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 16 }}>Aucun patient présent dans ce service</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {patients.map(p => {
                  const active = patientId === p.id;
                  return (
                    <button key={p.id} onClick={() => setPatientId(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, minHeight: 48,
                        background: active ? '#6366f122' : T.surface, border: `1px solid ${active ? '#6366f1' : T.border}`,
                        borderRadius: 10, color: active ? '#6366f1' : T.text, fontSize: 14, fontWeight: active ? 700 : 500,
                        padding: '10px 14px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                      }}>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>🛏 {p.bedNumber}</span>
                      <span>{p.initials}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset}
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, color: T.muted, padding: '13px', fontSize: 14, cursor: 'pointer', minHeight: 48 }}>
                Recommencer
              </button>
              <button onClick={handleSave} disabled={!patientId || !text.trim() || saving}
                style={{ flex: 2, background: '#22c55e', border: 'none', borderRadius: 12, color: '#fff', padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 48, opacity: (!patientId || !text.trim() || saving) ? 0.4 : 1 }}>
                {saving ? 'Enregistrement…' : '✓ Rattacher au patient'}
              </button>
            </div>
          </>
        )}
      </div>

      <SpringCheck show={justSaved} />
    </div>
  );
}
