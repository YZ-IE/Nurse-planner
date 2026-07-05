/**
 * ImportFromPhoto.jsx — Import de patients depuis une photo de feuille de transmission
 * OCR via @pantrist/capacitor-plugin-ml-kit-text-recognition (ML Kit natif, offline).
 * Parsing : Mme/Mr + NOM majuscules → initiales/genre, lit (3 chiffres + P/F), âge 2 chiffres.
 */

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { T } from '../../theme.js';
import { genId } from './utils.jsx';
import { computeSlots } from './ServiceView.jsx';

const ACCENT = '#6366f1';

const INP = {
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
  color: T.text, fontSize: 13, padding: '6px 8px', width: '100%', boxSizing: 'border-box',
};

// ─── OCR (ML Kit natif via Capacitor, 100% offline) ───────────────────────────

export function isOCRSupported() {
  return Capacitor.isNativePlatform();
}

async function runOCR(dataUrl, onProgress) {
  if (!isOCRSupported()) {
    throw new Error('OCR_UNSUPPORTED');
  }

  onProgress(30, 'Analyse OCR en cours…');

  // Le plugin attend le base64 brut (sans le préfixe "data:image/...;base64,")
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

  const result = await CapacitorPluginMlKitTextRecognition.detectText({
    base64Image: base64,
    rotation: 0,
  });

  onProgress(100, 'Terminé');
  return result.text || '';
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseOCR(rawText) {
  const results = [];
  const seen = new Set();

  // Pattern principal : titre de civilité + NOM en majuscules
  const nameRE = /\b(Mme|M(?:me|r|\.)?)\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸÇ][A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸÇ\-]{2,25})/g;

  let m;
  while ((m = nameRE.exec(rawText)) !== null) {
    const title   = m[1];
    const surname = m[2];
    const dedupKey = surname.toUpperCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const gender = /^Mme$/i.test(title) ? 'F' : 'M';
    const initials = surname.split(/[\s\-]+/).map(p => p[0].toUpperCase()).join('').slice(0, 5);

    // Numéro de lit dans les 150 chars précédant le nom
    const before = rawText.slice(Math.max(0, m.index - 150), m.index);
    const bedMatches = [...before.matchAll(/(\d{3})\s*([PF])?(?=\s|$)/gi)];
    const lastBed = bedMatches[bedMatches.length - 1];
    const bedLabel = lastBed ? (lastBed[1] + (lastBed[2] || '')).toUpperCase() : '';

    // Âge : 2 chiffres (18-99) dans les 80 chars suivants, hors date
    const after = rawText.slice(m.index, m.index + 80);
    const ageM = after.match(/\b([2-9]\d)\b(?!\s*\/)/);
    const age = ageM ? Number(ageM[1]) : '';

    results.push({ _key: genId(), initials, gender, age, bedLabel, slotIndex: null });
  }

  return results;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ImportFromPhoto({ service, existingPatients, onImport, onClose }) {
  const [phase,    setPhase]    = useState('capture'); // capture | processing | review
  const [progress, setProgress] = useState(0);
  const [progMsg,  setProgMsg]  = useState('');
  const [error,    setError]    = useState('');
  const [detected, setDetected] = useState([]);

  const slots = computeSlots(service);
  const occupied = new Set(existingPatients.filter(p => p.present).map(p => p.bedNumber));
  const freeSlots = slots.filter(s => !occupied.has(s.slotIndex));

  // ── Capture + OCR ──────────────────────────────────────────────────────────
  async function handleCapture() {
    setError('');
    try {
      try { await Camera.requestPermissions({ permissions: ['camera', 'photos'] }); } catch {}
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        allowEditing: false,
        saveToGallery: false,
        correctOrientation: true,
      });
      if (!photo.dataUrl) { setError('Photo vide.'); return; }

      setPhase('processing');
      setProgress(0);
      setProgMsg('Initialisation…');

      const raw = await runOCR(photo.dataUrl, (pct, msg) => {
        setProgress(pct);
        setProgMsg(msg);
      });

      // Pre-match lit OCR → slot disponible
      const parsed = parseOCR(raw).map(pt => {
        const match = freeSlots.find(s =>
          s.roomLabel.replace(/\s/g, '').toUpperCase() === pt.bedLabel.replace(/\s/g, '').toUpperCase()
        );
        return { ...pt, slotIndex: match?.slotIndex ?? null };
      });

      setDetected(parsed);
      setPhase('review');
    } catch (e) {
      const msg = e?.message || String(e);
      if (/cancel|User cancelled|No image picked/i.test(msg)) { setPhase('capture'); return; }
      if (msg === 'OCR_UNSUPPORTED') {
        // TextDetector non disponible — passer directement à la revue vide pour saisie manuelle
        setDetected([]);
        setPhase('review');
        return;
      }
      setError('Erreur OCR : ' + msg.slice(0, 100));
      setPhase('capture');
    }
  }

  function update(key, field, val) {
    setDetected(prev => prev.map(p => p._key === key ? { ...p, [field]: val } : p));
  }

  function addBlank() {
    setDetected(prev => [...prev, { _key: genId(), initials: '', gender: 'M', age: '', bedLabel: '', slotIndex: null }]);
  }

  async function handleImport() {
    const ready = detected.filter(p => p.slotIndex && p.initials.trim());
    if (!ready.length) return;
    const newPts = ready.map(p => ({
      id: genId(),
      serviceId: service.id,
      bedNumber: p.slotIndex,
      initials: p.initials.trim().toUpperCase(),
      age: Number(p.age) || 0,
      gender: p.gender,
      admissionReason: '',
      atcd: '',
      fieldValues: {},
      customFields: [],
      present: true,
      admittedAt: Date.now(),
    }));
    await onImport(newPts);
    onClose();
  }

  // ── Phase : capture ────────────────────────────────────────────────────────
  if (phase === 'capture') return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div style={{ background: T.surface, borderRadius: '16px 16px 0 0', padding: '24px 20px 48px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>📷 Import depuis photo</div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>Feuille de transmission ou tableau de service</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
            Photographiez la feuille. L'app détecte automatiquement les <strong style={{ color: T.text }}>numéros de chambre</strong>, <strong style={{ color: T.text }}>noms</strong> et <strong style={{ color: T.text }}>âges</strong> des patients.
          </div>
          <div style={{ color: isOCRSupported() ? T.success : T.muted, fontSize: 12, marginTop: 8 }}>
            {isOCRSupported()
              ? '✓ OCR natif disponible — fonctionne sans connexion réseau'
              : '⚠️ OCR non disponible sur cet appareil — vous pourrez ajouter les patients manuellement'}
          </div>
        </div>

        {error && (
          <div style={{ color: T.danger, fontSize: 13, marginBottom: 16, background: T.dangerDim, borderRadius: 8, padding: '8px 12px' }}>{error}</div>
        )}

        <button onClick={handleCapture}
          style={{ width: '100%', padding: '14px', background: ACCENT, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          📷 Prendre / choisir une photo
        </button>
      </div>
    </div>
  );

  // ── Phase : processing ─────────────────────────────────────────────────────
  if (phase === 'processing') return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, gap: 20, padding: 32 }}>
      <div style={{ fontSize: 52 }}>🔍</div>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center' }}>{progMsg}</div>
      <div style={{ width: '100%', maxWidth: 280, height: 6, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: ACCENT, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <div style={{ color: T.muted, fontSize: 13 }}>{progress}%</div>
    </div>
  );

  // ── Phase : review ─────────────────────────────────────────────────────────
  const readyCount = detected.filter(p => p.slotIndex && p.initials.trim()).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => setPhase('capture')} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>
            {isOCRSupported() ? 'Résultats OCR' : 'Saisie manuelle'}
          </div>
          <div style={{ color: T.muted, fontSize: 12 }}>
            {isOCRSupported()
              ? <>{detected.length} patient{detected.length !== 1 ? 's' : ''} détecté{detected.length !== 1 ? 's' : ''} · <span style={{ color: readyCount > 0 ? ACCENT : T.muted }}>{readyCount} prêt{readyCount !== 1 ? 's' : ''}</span></>
              : 'OCR non disponible — ajoutez les patients manuellement'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 8px' }}>

        {detected.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{isOCRSupported() ? '😕' : '✏️'}</div>
            <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>
              {isOCRSupported() ? 'Aucun patient détecté' : 'Saisie manuelle'}
            </div>
            <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
              {isOCRSupported()
                ? 'Prenez une photo plus nette ou ajoutez manuellement'
                : 'Utilisez le bouton ci-dessous pour ajouter les patients un par un'}
            </div>
          </div>
        )}

        {detected.map((pt, i) => {
          const slotOk = !!pt.slotIndex;
          const initOk = !!pt.initials.trim();
          const ready  = slotOk && initOk;
          return (
            <div key={pt._key} style={{ background: T.surface, border: `1px solid ${ready ? ACCENT + '44' : T.border}`, borderLeft: `3px solid ${ready ? ACCENT : T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: T.muted, fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                {pt.bedLabel && (
                  <span style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, color: T.muted, fontSize: 10, padding: '1px 6px' }}>
                    OCR : {pt.bedLabel}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <button onClick={() => setDetected(prev => prev.filter(p => p._key !== pt._key))}
                  style={{ background: 'none', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {/* Fields grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

                {/* Lit */}
                <div>
                  <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Lit *</div>
                  <select value={pt.slotIndex || ''} onChange={e => update(pt._key, 'slotIndex', e.target.value ? Number(e.target.value) : null)}
                    style={{ ...INP, borderColor: slotOk ? T.border : T.danger + '88' }}>
                    <option value="">— Choisir —</option>
                    {freeSlots.map(s => (
                      <option key={s.slotIndex} value={s.slotIndex}>{s.roomLabel}</option>
                    ))}
                  </select>
                </div>

                {/* Initiales */}
                <div>
                  <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Initiales *</div>
                  <input value={pt.initials} onChange={e => update(pt._key, 'initials', e.target.value.toUpperCase())}
                    maxLength={5} placeholder="Ex : M.D"
                    style={{ ...INP, borderColor: initOk ? T.border : T.danger + '88' }} />
                </div>

                {/* Sexe */}
                <div>
                  <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Sexe</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['M', 'F'].map(g => (
                      <button key={g} onClick={() => update(pt._key, 'gender', g)}
                        style={{ flex: 1, padding: '6px', background: pt.gender === g ? ACCENT : T.bg, border: `1px solid ${pt.gender === g ? ACCENT : T.border}`, borderRadius: 6, color: pt.gender === g ? '#fff' : T.muted, fontSize: 13, fontWeight: pt.gender === g ? 700 : 400, cursor: 'pointer' }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Âge */}
                <div>
                  <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Âge</div>
                  <input type="number" value={pt.age} onChange={e => update(pt._key, 'age', e.target.value)}
                    min={0} max={120} placeholder="—"
                    style={INP} />
                </div>

              </div>
            </div>
          );
        })}

        <button onClick={addBlank}
          style={{ width: '100%', padding: '10px', background: 'none', border: `1px dashed ${T.border}`, borderRadius: 10, color: T.muted, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
          + Ajouter manuellement
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px 36px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <button onClick={handleImport} disabled={readyCount === 0}
          style={{ width: '100%', padding: '14px', background: readyCount > 0 ? ACCENT : T.border, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: readyCount > 0 ? 'pointer' : 'default', opacity: readyCount > 0 ? 1 : 0.5 }}>
          ✓ Importer {readyCount} patient{readyCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
