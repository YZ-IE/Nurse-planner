/**
 * PhotoImport.jsx — Aide-Mémoire
 * Import d'un service à partir d'une photo de feuille de transmission papier.
 * Appli 100% locale/chiffrée, zéro réseau : la détection automatique des
 * lits (Tesseract.js + wasm embarqués, aucune photo envoyée) est une aide au
 * pré-remplissage, pas une lecture fiable de l'écriture manuscrite — la
 * photo reste la référence visuelle pendant la vérification manuelle.
 */

import { useState, useEffect } from 'react';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { SPECIALTIES, getTemplateFields, getSpecialty } from './templates.js';
import { genId, todayStr, FieldInput } from './utils.jsx';
import { createOcrWorker, recognizePage, recognizeDigits, detectBedRows } from './ocrImport.js';

// ─── Dates ────────────────────────────────────────────────────────────────────

function mondayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDays(fromStr, toStr) {
  return Math.round((new Date(toStr + 'T00:00:00') - new Date(fromStr + 'T00:00:00')) / 86400000);
}
function formatFR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Photo ────────────────────────────────────────────────────────────────────

function compressForPreview(base64, maxPx = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

function rotateDataUrl(dataUrl, deg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swap = deg % 180 !== 0;
      const w = swap ? img.height : img.width;
      const h = swap ? img.width : img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.translate(w / 2, h / 2);
      ctx.rotate(deg * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ─── Ligne (1 lit) ────────────────────────────────────────────────────────────

function emptyRow() {
  return {
    id: genId(),
    bedNumber: '', bedPosition: '', gender: 'F', initials: '', age: '',
    admissionReason: '', atcd: '',
    opDate: '', jPostop: '', rdv: '',
    allergie: '', douleur: '', appui: '', appuiDureeJours: '',
    zimmer: '', hbpm: false, avq: '', pst: false,
    extraCares: [],
    observations: '',
  };
}

const CARE_LABELS = {
  allergie: 'Allergie', douleur: 'Antalgie', appui: 'Appui', zimmer: 'Zimmer/Attelle',
  hbpm: 'HBPM prescrit', j_postop: 'J post-op', avq: 'AVQ', pst: 'Pansement réalisé',
};

function newCare(type, label, plannedTime) {
  return { id: genId(), type, label, plannedTime, note: '', done: false, doneTime: null, doneValue: null };
}

// ─── Carte "lit" ──────────────────────────────────────────────────────────────

function RowCard({ row, fieldsById, rdvFieldId, onChange, onRemove, weekMonday, accentColor }) {
  const [open, setOpen] = useState(true);
  const C = accentColor;

  function patch(p) { onChange({ ...row, ...p }); }

  function handleJPostop(v) {
    const p = { jPostop: v };
    if (v !== '' && !row.opDate) p.opDate = addDaysStr(weekMonday, -Number(v));
    patch(p);
  }
  function handleOpDate(v) {
    const p = { opDate: v };
    if (v && row.jPostop === '') p.jPostop = String(diffDays(v, weekMonday));
    patch(p);
  }

  const repriseDate = (row.appui && row.appuiDureeJours && row.opDate)
    ? addDaysStr(row.opDate, Number(row.appuiDureeJours)) : null;

  const section = { marginTop: 14 };
  const sectionLabel = { ...s.label, color: T.muted, marginBottom: 8 };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${C}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700, flex: 1 }}>
          Lit {row.bedNumber || '?'} {row.initials && `— ${row.initials}`}
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', padding: 4 }}>🗑</button>
        <span style={{ color: T.muted, fontSize: 18 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <>
          <div style={section}>
            <div style={sectionLabel}>IDENTITÉ</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={row.bedNumber} onChange={e => patch({ bedNumber: e.target.value.replace(/\D/g, '') })}
                placeholder="N° lit" inputMode="numeric" style={{ ...s.input, width: 80 }} />
              {['Porte', 'Fenêtre', 'Seule'].map(opt => (
                <button key={opt} onClick={() => patch({ bedPosition: row.bedPosition === opt ? '' : opt })}
                  style={{ background: row.bedPosition === opt ? C + '33' : T.surface, border: `1px solid ${row.bedPosition === opt ? C : T.border}`, borderRadius: 8, color: row.bedPosition === opt ? C : T.muted, fontSize: 13, padding: '7px 12px', cursor: 'pointer' }}>
                  {opt}
                </button>
              ))}
              {['F', 'M'].map(g => (
                <button key={g} onClick={() => patch({ gender: g })}
                  style={{ background: row.gender === g ? C + '33' : T.surface, border: `1px solid ${row.gender === g ? C : T.border}`, borderRadius: 8, color: row.gender === g ? C : T.muted, fontSize: 13, fontWeight: 700, padding: '7px 12px', cursor: 'pointer', width: 40 }}>
                  {g}
                </button>
              ))}
              <input value={row.initials} onChange={e => patch({ initials: e.target.value.toUpperCase() })}
                placeholder="Initiales" maxLength={6} style={{ ...s.input, width: 90 }} />
              <input value={row.age} onChange={e => patch({ age: e.target.value.replace(/\D/g, '') })}
                placeholder="Âge" inputMode="numeric" style={{ ...s.input, width: 70 }} />
            </div>
          </div>

          <div style={section}>
            <div style={sectionLabel}>MOTIF D'HOSPITALISATION</div>
            <input value={row.admissionReason} onChange={e => patch({ admissionReason: e.target.value })}
              placeholder="Ex : PTG Gauche" style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
            <input value={row.atcd} onChange={e => patch({ atcd: e.target.value })}
              placeholder="Antécédents / comorbidités" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={section}>
            <div style={sectionLabel}>CHRONOLOGIE</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <div style={{ color: T.muted, fontSize: 10, marginBottom: 3 }}>Opéré(e) le</div>
                <input type="date" value={row.opDate} onChange={e => handleOpDate(e.target.value)} style={{ ...s.input, width: 150 }} />
              </div>
              <div>
                <div style={{ color: T.muted, fontSize: 10, marginBottom: 3 }}>J post-op</div>
                <input value={row.jPostop} onChange={e => handleJPostop(e.target.value.replace(/\D/g, ''))}
                  placeholder="J" inputMode="numeric" style={{ ...s.input, width: 60, textAlign: 'center' }} />
              </div>
            </div>
            <div style={{ color: T.muted, fontSize: 10, marginBottom: 8 }}>
              Calcul basé sur le lundi {formatFR(weekMonday)} — modifiez l'un des deux champs, l'autre se déduit automatiquement.
            </div>
            {rdvFieldId && (
              <input value={row.rdv} onChange={e => patch({ rdv: e.target.value })}
                placeholder="RDV / examens" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            )}
          </div>

          <div style={section}>
            <div style={sectionLabel}>PRISE EN CHARGE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>Allergie</div>
                <FieldInput field={fieldsById.allergie} value={row.allergie} onChange={v => patch({ allergie: v })} accentColor={C} />
              </div>
              <div>
                <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>Antalgie</div>
                <FieldInput field={fieldsById.douleur} value={row.douleur} onChange={v => patch({ douleur: v })} accentColor={C} />
                {row.douleur === 'Palier 3 LP' && (
                  <div style={{ color: '#22c55e', fontSize: 11, marginTop: 4 }}>→ programmé automatiquement à 8h et 20h</div>
                )}
              </div>
              {fieldsById.appui && (
                <div>
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>Appui</div>
                  <FieldInput field={fieldsById.appui} value={row.appui} onChange={v => patch({ appui: v })} accentColor={C} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ color: T.muted, fontSize: 12 }}>pendant</span>
                    <input value={row.appuiDureeJours} onChange={e => patch({ appuiDureeJours: e.target.value.replace(/\D/g, '') })}
                      placeholder="0" inputMode="numeric" style={{ ...s.input, width: 55, textAlign: 'center' }} />
                    <span style={{ color: T.muted, fontSize: 12 }}>jours</span>
                  </div>
                  {repriseDate && (
                    <div style={{ color: '#22c55e', fontSize: 11, marginTop: 4 }}>
                      → reprise d'appui calculée le {formatFR(repriseDate)}
                    </div>
                  )}
                </div>
              )}
              {fieldsById.zimmer && (
                <div>
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>Zimmer / Attelle</div>
                  <FieldInput field={fieldsById.zimmer} value={row.zimmer} onChange={v => patch({ zimmer: v })} accentColor={C} />
                </div>
              )}
              {fieldsById.hbpm && (
                <div>
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>HBPM prescrit</div>
                  <FieldInput field={fieldsById.hbpm} value={row.hbpm} onChange={v => patch({ hbpm: v })} accentColor={C} />
                  {row.hbpm && <div style={{ color: '#22c55e', fontSize: 11, marginTop: 4 }}>→ programmé automatiquement à 18h</div>}
                </div>
              )}
              {fieldsById.avq && (
                <div>
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>AVQ / Autonomie</div>
                  <FieldInput field={fieldsById.avq} value={row.avq} onChange={v => patch({ avq: v })} accentColor={C} />
                </div>
              )}
              {fieldsById.pst && (
                <div>
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 4 }}>Pansement réalisé</div>
                  <FieldInput field={fieldsById.pst} value={row.pst} onChange={v => patch({ pst: v })} accentColor={C} />
                </div>
              )}
            </div>
          </div>

          <div style={section}>
            <div style={sectionLabel}>SOINS À HEURE FIXE (colonne "18H" et assimilées)</div>
            {row.extraCares.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={c.label} onChange={e => patch({ extraCares: row.extraCares.map(x => x.id === c.id ? { ...x, label: e.target.value } : x) })}
                  placeholder="Ex : Gouttes, ATCO…" style={{ ...s.input, flex: 1 }} />
                <input type="time" value={c.time} onChange={e => patch({ extraCares: row.extraCares.map(x => x.id === c.id ? { ...x, time: e.target.value } : x) })}
                  style={{ ...s.input, width: 90 }} />
                <button onClick={() => patch({ extraCares: row.extraCares.filter(x => x.id !== c.id) })}
                  style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <button onClick={() => patch({ extraCares: [...row.extraCares, { id: genId(), label: '', time: '18:00' }] })}
              style={{ background: 'none', border: `1px dashed ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 12, padding: '7px 12px', cursor: 'pointer', width: '100%' }}>
              + Ajouter un soin à heure fixe (défaut 18h)
            </button>
          </div>

          <div style={section}>
            <div style={sectionLabel}>OBSERVATIONS</div>
            <textarea value={row.observations} onChange={e => patch({ observations: e.target.value })}
              rows={3} placeholder="Entrée/sortie, examens programmés, permissions…"
              style={{ ...s.input, width: '100%', boxSizing: 'border-box', resize: 'none' }} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PhotoImport({ cryptoKey, accentColor, onBack, onImported }) {
  const C = accentColor || '#6366f1';

  const [step,       setStep]       = useState('photo');
  const [photos,     setPhotos]     = useState([]);
  const [viewerIdx,  setViewerIdx]  = useState(null);
  const [sheetDate,  setSheetDate]  = useState(todayStr());
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const [services,       setServices]       = useState(null);
  const [targetMode,     setTargetMode]     = useState('existing');
  const [selectedSvcId,  setSelectedSvcId]  = useState(null);
  const [newSvcForm,     setNewSvcForm]     = useState({ name: '', specialty: 'traumato', bedCount: 20 });
  const [targetService,  setTargetService]  = useState(null);

  const [rows,        setRows]        = useState([emptyRow()]);
  const [rowsSeeded,  setRowsSeeded]  = useState(false);

  const [ocrBusy,      setOcrBusy]      = useState(false);
  const [ocrProgress,  setOcrProgress]  = useState(0);
  const [ocrStatus,    setOcrStatus]    = useState('');
  const [detectedRows, setDetectedRows] = useState(null);

  const weekMonday = mondayOfWeek(sheetDate);

  useEffect(() => { secureGet('services', cryptoKey).then(d => setServices(d || [])); }, [cryptoKey]);

  // ── Étape photo ─────────────────────────────────────────────────────────────

  async function handleCapture(fromGallery) {
    setError('');
    try {
      await Camera.requestPermissions({ permissions: fromGallery ? ['photos'] : ['camera'] });
      const photo = await Camera.getPhoto({
        quality: 80, width: 1600, resultType: CameraResultType.Base64,
        source: fromGallery ? CameraSource.Photos : CameraSource.Camera,
        allowEditing: false, saveToGallery: false, correctOrientation: true,
      });
      if (!photo.base64String) { setError('Photo vide.'); return; }
      const dataUrl = await compressForPreview(photo.base64String);
      setPhotos(prev => [...prev, { id: genId(), dataUrl }]);
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('User cancelled')) return;
      setError('Erreur caméra : ' + msg.slice(0, 80));
    }
  }

  async function handleRotate(id, deg) {
    const p = photos.find(x => x.id === id);
    if (!p) return;
    const rotated = await rotateDataUrl(p.dataUrl, deg);
    setPhotos(prev => prev.map(x => x.id === id ? { ...x, dataUrl: rotated } : x));
  }

  async function handleDetect() {
    if (photos.length === 0) return;
    setOcrBusy(true); setError(''); setSuccess(''); setOcrProgress(0); setOcrStatus('Initialisation…');
    let worker = null;
    try {
      worker = await createOcrWorker(m => {
        if (m.status) setOcrStatus(m.status);
        if (typeof m.progress === 'number') setOcrProgress(m.progress);
      });
      let allRows = [];
      for (const p of photos) {
        const { words } = await recognizePage(worker, p.dataUrl);
        const detected = detectBedRows(words);
        // Relecture ciblée "chiffres seuls" du n° de lit et de l'âge — bien
        // plus fiable que la passe pleine page pour ces deux colonnes.
        for (const row of detected) {
          const pad = 6;
          const boxToRect = box => ({
            left: Math.max(0, box.left - pad), top: Math.max(0, box.top - pad),
            width: box.width + pad * 2, height: box.height + pad * 2,
          });
          try {
            const cleanBed = await recognizeDigits(worker, p.dataUrl, boxToRect(row.bedBox));
            if (cleanBed) row.bedNumber = cleanBed;
          } catch { /* garde la lecture de la passe pleine page */ }
          if (row.ageBox) {
            try {
              const cleanAge = await recognizeDigits(worker, p.dataUrl, boxToRect(row.ageBox));
              if (cleanAge) row.age = cleanAge;
            } catch { /* garde la lecture de la passe pleine page */ }
          }
        }
        allRows = allRows.concat(detected);
      }
      setDetectedRows(allRows);
      setRowsSeeded(false); // permet de re-remplir "rows" si la détection est relancée
      if (allRows.length === 0) {
        setError('Aucun lit détecté automatiquement (écriture manuscrite, orientation…) — la saisie manuelle reste nécessaire.');
      } else {
        setSuccess(`🔍 ${allRows.length} ligne(s) détectée(s) — à vérifier à l'étape suivante.`);
      }
    } catch (e) {
      setError('Erreur de reconnaissance : ' + (e?.message || String(e)).slice(0, 100));
    } finally {
      if (worker) await worker.terminate();
      setOcrBusy(false); setOcrStatus('');
    }
  }

  // ── Étape cible ──────────────────────────────────────────────────────────────

  async function confirmTarget() {
    setError('');
    if (targetMode === 'existing') {
      const svc = (services || []).find(sv => sv.id === selectedSvcId);
      if (!svc) { setError('Sélectionnez un service.'); return; }
      setTargetService(svc);
    } else {
      if (!newSvcForm.name.trim()) { setError('Nom du service requis.'); return; }
      const svc = {
        id: genId(), name: newSvcForm.name.trim(), specialty: newSvcForm.specialty,
        bedCount: Number(newSvcForm.bedCount), fields: getTemplateFields(newSvcForm.specialty),
        bedConfig: {}, createdAt: Date.now(),
      };
      setTargetService(svc);
    }
    if (!rowsSeeded) {
      if (detectedRows && detectedRows.length) {
        setRows(detectedRows.map(d => ({
          ...emptyRow(),
          bedNumber: d.bedNumber, age: d.age || '',
          hbpm: !!d.hbpm, douleur: d.douleur || '', avq: d.avq || '', appui: d.appui || '',
          jPostop: d.jPostop || '',
          observations: d.rawText ? `🔍 OCR (à vérifier) : ${d.rawText}` : '',
        })));
      }
      setRowsSeeded(true);
    }
    setStep('rows');
  }

  const fieldsById = targetService ? Object.fromEntries(targetService.fields.map(f => [f.id, f])) : {};
  const rdvField   = targetService ? targetService.fields.find(f => f.id.startsWith('rdv_')) : null;

  function updateRow(id, next) { setRows(rs => rs.map(r => r.id === id ? next : r)); }
  function addRow() { setRows(rs => [...rs, emptyRow()]); }
  function removeRow(id) { setRows(rs => rs.filter(r => r.id !== id)); }

  // ── Import final ──────────────────────────────────────────────────────────────

  async function handleImport() {
    setBusy(true); setError('');
    try {
      const validRows = rows.filter(r => r.bedNumber && r.initials.trim() && r.age);
      if (validRows.length === 0) { setError('Aucun lit complet (n°, initiales, âge requis).'); setBusy(false); return; }

      let services = await secureGet('services', cryptoKey) || [];
      if (!services.find(sv => sv.id === targetService.id)) {
        services = [...services, targetService];
      }
      await secureSet('services', services, cryptoKey);

      const existingPatients = await secureGet(`patients_${targetService.id}`, cryptoKey) || [];
      const today            = todayStr();
      const existingDaily    = await secureGet(`daily_${targetService.id}_${today}`, cryptoKey) || {};

      let nextPatients = [...existingPatients];
      let nextDaily     = { ...existingDaily };

      const FIELD_MAP = {
        allergie:  r => r.allergie.trim() || null,
        douleur:   r => r.douleur || null,
        appui:     r => r.appui || null,
        zimmer:    r => r.zimmer.trim() || null,
        hbpm:      r => r.hbpm || null,
        j_postop:  r => r.jPostop !== '' ? Number(r.jPostop) : null,
        avq:       r => r.avq || null,
        pst:       r => r.pst || null,
      };

      for (const row of validRows) {
        const bedNum = Number(row.bedNumber);
        const patientFieldValues = {};
        const dailyFieldValues   = {};
        const extraLines         = [];

        for (const [fid, getter] of Object.entries(FIELD_MAP)) {
          const value = getter(row);
          if (value === null || value === '') continue;
          const field = targetService.fields.find(f => f.id === fid);
          if (field) { (field.persistent ? patientFieldValues : dailyFieldValues)[fid] = value; }
          else       { extraLines.push(`${CARE_LABELS[fid] || fid} : ${value === true ? 'oui' : value}`); }
        }
        if (rdvField && row.rdv.trim()) {
          (rdvField.persistent ? patientFieldValues : dailyFieldValues)[rdvField.id] = row.rdv.trim();
        }
        if (row.opDate) extraLines.push(`Opéré(e) le ${formatFR(row.opDate)}`);
        if (row.appui && row.appuiDureeJours && row.opDate) {
          const reprise = addDaysStr(row.opDate, Number(row.appuiDureeJours));
          extraLines.push(`Reprise d'appui prévue le ${formatFR(reprise)} (calculée : opéré le ${formatFR(row.opDate)} + ${row.appuiDureeJours}j)`);
        }
        const observations = [row.observations.trim(), ...extraLines].filter(Boolean).join('\n');

        const existingIdx = nextPatients.findIndex(p => p.present && p.bedNumber === bedNum);
        let patientId;
        if (existingIdx >= 0) {
          patientId = nextPatients[existingIdx].id;
          nextPatients[existingIdx] = {
            ...nextPatients[existingIdx],
            initials: row.initials.trim().toUpperCase(), gender: row.gender, age: Number(row.age),
            admissionReason: row.admissionReason.trim(), atcd: row.atcd.trim(),
            bedPosition: row.bedPosition || nextPatients[existingIdx].bedPosition || null,
            fieldValues: { ...nextPatients[existingIdx].fieldValues, ...patientFieldValues },
          };
        } else {
          patientId = genId();
          nextPatients.push({
            id: patientId, serviceId: targetService.id, bedNumber: bedNum,
            initials: row.initials.trim().toUpperCase(), age: Number(row.age), gender: row.gender,
            admissionReason: row.admissionReason.trim(), atcd: row.atcd.trim(),
            bedPosition: row.bedPosition || null,
            fieldValues: patientFieldValues, customFields: [], present: true, admittedAt: Date.now(),
          });
        }

        const careEntries = [];
        if (row.hbpm) careEntries.push(newCare('injection', 'HBPM', '18:00'));
        if (row.douleur === 'Palier 3 LP') {
          careEntries.push(newCare('antalgie', 'Palier 3 LP', '08:00'));
          careEntries.push(newCare('antalgie', 'Palier 3 LP', '20:00'));
        }
        row.extraCares.forEach(c => { if (c.label.trim()) careEntries.push(newCare('autre', c.label.trim(), c.time || '18:00')); });

        const dailyEntry = nextDaily[patientId] || { fieldValues: {}, events: [], careEntries: [], observations: '' };
        nextDaily[patientId] = {
          ...dailyEntry,
          fieldValues:  { ...dailyEntry.fieldValues, ...dailyFieldValues },
          careEntries:  [...(dailyEntry.careEntries || []), ...careEntries],
          observations: [dailyEntry.observations, observations].filter(Boolean).join('\n'),
        };
      }

      await secureSet(`patients_${targetService.id}`, nextPatients, cryptoKey);
      await secureSet(`daily_${targetService.id}_${today}`, nextDaily, cryptoKey);

      setPhotos([]);
      setSuccess(`✅ ${validRows.length} lit(s) importé(s) dans "${targetService.name}"`);
      onImported?.();
    } catch (e) {
      setError('Erreur lors de l\'import : ' + e.message);
    } finally { setBusy(false); }
  }

  // ── Rendu commun ──────────────────────────────────────────────────────────────

  const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 16 };

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => step === 'photo' ? onBack() : setStep(step === 'target' ? 'photo' : step === 'rows' ? 'target' : 'rows')}
          style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <div>
          <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📷 Import depuis une photo</div>
          <div style={{ color: T.muted, fontSize: 12 }}>
            {{ photo: 'Étape 1 — Photo', target: 'Étape 2 — Service cible', rows: 'Étape 3 — Saisie par lit' }[step]}
          </div>
        </div>
        {photos.length > 0 && step !== 'photo' && (
          <button onClick={() => setViewerIdx(0)}
            style={{ marginLeft: 'auto', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, color: C, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
            🖼 Voir la photo
          </button>
        )}
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {error   && <div style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f43f5e', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#22c55e', fontSize: 13 }}>{success}</div>}

        {/* ═════ ÉTAPE PHOTO ═════ */}
        {step === 'photo' && (
          <>
            <div style={{ ...card }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Photo(s) de la feuille</div>
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
                  {photos.map((p, i) => (
                    <img key={p.id} src={p.dataUrl} onClick={() => setViewerIdx(i)} alt=""
                      style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}`, cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleCapture(false)} style={{ ...s.btn(C), flex: 1 }}>📷 Photo</button>
                <button onClick={() => handleCapture(true)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>🖼 Galerie</button>
              </div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                Plusieurs photos possibles (feuille pliée, recto/verso). La photo reste en mémoire le temps de la saisie, elle n'est jamais enregistrée sur l'appareil. Si le tableau est de travers, ouvrez la photo (🖼) pour la pivoter avant de lancer la détection.
              </div>
            </div>

            {photos.length > 0 && (
              <div style={card}>
                <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Détection automatique des lits (bêta)</div>
                <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 10 }}>
                  Reconnaissance 100% locale sur l'appareil, aucune photo envoyée. L'écriture manuscrite reste difficile à lire : vérifiez chaque ligne à l'étape suivante.
                </div>
                <button onClick={handleDetect} disabled={ocrBusy}
                  style={{ ...s.btn('#a78bfa'), width: '100%', padding: 12, fontSize: 14, opacity: ocrBusy ? 0.6 : 1 }}>
                  {ocrBusy ? `${ocrStatus || 'Analyse…'} ${Math.round(ocrProgress * 100)}%` : '🔍 Détecter les lits automatiquement'}
                </button>
                {detectedRows !== null && !ocrBusy && (
                  <div style={{ color: detectedRows.length ? '#22c55e' : '#f97316', fontSize: 12, marginTop: 8 }}>
                    {detectedRows.length ? `${detectedRows.length} ligne(s) détectée(s)` : 'Aucune ligne détectée'}
                  </div>
                )}
              </div>
            )}

            <div style={card}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Date de la feuille</div>
              <input type="date" value={sheetDate} onChange={e => setSheetDate(e.target.value)} style={{ ...s.input, width: 160 }} />
              <div style={{ color: T.muted, fontSize: 11, marginTop: 8 }}>
                Sert à calculer les dates opératoires à partir des "J+n" (référence : lundi {formatFR(weekMonday)}).
              </div>
            </div>

            <button onClick={() => setStep('target')} disabled={photos.length === 0}
              style={{ ...s.btn(C), width: '100%', padding: 13, fontSize: 15, opacity: photos.length ? 1 : 0.4 }}>
              Continuer →
            </button>
          </>
        )}

        {/* ═════ ÉTAPE SERVICE CIBLE ═════ */}
        {step === 'target' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ id: 'existing', label: 'Service existant' }, { id: 'new', label: 'Nouveau service' }].map(t => (
                <button key={t.id} onClick={() => setTargetMode(t.id)}
                  style={{ flex: 1, background: targetMode === t.id ? C + '22' : T.surface, border: `1px solid ${targetMode === t.id ? C : T.border}`, borderRadius: 8, color: targetMode === t.id ? C : T.muted, fontSize: 13, fontWeight: targetMode === t.id ? 700 : 400, padding: '9px 4px', cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {targetMode === 'existing' && (
              <div style={card}>
                {(services || []).length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>Aucun service existant — créez-en un nouveau.</div>}
                {(services || []).map(sv => {
                  const sp = getSpecialty(sv.specialty);
                  return (
                    <button key={sv.id} onClick={() => setSelectedSvcId(sv.id)}
                      style={{ display: 'block', width: '100%', marginBottom: 8, background: selectedSvcId === sv.id ? sp.color + '22' : T.bg, border: `1px solid ${selectedSvcId === sv.id ? sp.color : T.border}`, borderRadius: 10, color: T.text, padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{sv.name}</div>
                      <div style={{ color: T.muted, fontSize: 12 }}>{sp.label}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {targetMode === 'new' && (
              <div style={card}>
                <input value={newSvcForm.name} onChange={e => setNewSvcForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom du service" style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {SPECIALTIES.map(sp => (
                    <button key={sp.id} onClick={() => setNewSvcForm(f => ({ ...f, specialty: sp.id }))}
                      style={{ background: newSvcForm.specialty === sp.id ? sp.color + '22' : T.bg, border: `1px solid ${newSvcForm.specialty === sp.id ? sp.color : T.border}`, borderRadius: 8, color: newSvcForm.specialty === sp.id ? sp.color : T.text, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>
                      {sp.label}
                    </button>
                  ))}
                </div>
                <input type="number" value={newSvcForm.bedCount} onChange={e => setNewSvcForm(f => ({ ...f, bedCount: e.target.value }))}
                  placeholder="Nombre de lits" style={{ ...s.input, width: 140 }} />
              </div>
            )}

            <button onClick={confirmTarget} style={{ ...s.btn(C), width: '100%', padding: 13, fontSize: 15 }}>Continuer →</button>
          </>
        )}

        {/* ═════ ÉTAPE SAISIE PAR LIT ═════ */}
        {step === 'rows' && targetService && (
          <>
            <div style={{ color: T.muted, fontSize: 12, marginBottom: 14 }}>
              Service : <strong style={{ color: T.text }}>{targetService.name}</strong> — utilisez la photo (bouton en haut) comme référence pendant la saisie.
            </div>

            {rows.map(row => (
              <RowCard key={row.id} row={row} fieldsById={fieldsById} rdvFieldId={rdvField?.id}
                onChange={next => updateRow(row.id, next)} onRemove={() => removeRow(row.id)}
                weekMonday={weekMonday} accentColor={C} />
            ))}

            <button onClick={addRow}
              style={{ background: 'none', border: `1px dashed ${T.border}`, borderRadius: 10, color: T.muted, fontSize: 14, padding: '12px', cursor: 'pointer', width: '100%', marginBottom: 20 }}>
              + Ajouter un lit
            </button>

            <button onClick={handleImport} disabled={busy}
              style={{ ...s.btn('#22c55e'), width: '100%', padding: 14, fontSize: 15, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
              {busy ? 'Import…' : `✅ Importer ${rows.filter(r => r.bedNumber && r.initials.trim() && r.age).length} lit(s)`}
            </button>
          </>
        )}
      </div>

      {/* ── Visionneuse photo plein écran ── */}
      {viewerIdx !== null && photos[viewerIdx] && (
        <div onTouchMove={e => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
            <button onClick={() => setViewerIdx(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>←</button>
            {photos.length > 1 && <div style={{ color: '#fff', fontSize: 13 }}>{viewerIdx + 1} / {photos.length}</div>}
            <button onClick={() => handleRotate(photos[viewerIdx].id, 90)}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 18, padding: '6px 10px', cursor: 'pointer' }}>↻</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', touchAction: 'pinch-zoom', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={photos[viewerIdx].dataUrl} alt="" style={{ maxWidth: '100%', minHeight: '100%', objectFit: 'contain' }} />
          </div>
          {photos.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 30px' }}>
              <button onClick={() => setViewerIdx(i => (i - 1 + photos.length) % photos.length)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px 20px', cursor: 'pointer' }}>← Préc.</button>
              <button onClick={() => setViewerIdx(i => (i + 1) % photos.length)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px 20px', cursor: 'pointer' }}>Suiv. →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
