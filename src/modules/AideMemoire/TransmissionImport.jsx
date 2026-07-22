/**
 * TransmissionImport.jsx — Aide-Mémoire
 * Import "feuille de transmission" par photo.
 *
 * Chaîne de traitement — 100% locale, aucun réseau :
 *   1. Photo (caméra ou galerie) via @capacitor/camera
 *   2. OCR sur l'appareil via @capacitor-mlkit/text-recognition (ML Kit
 *      Android / Vision iOS) — aucune image ni texte n'est envoyé à un
 *      service tiers
 *   3. Le fichier photo temporaire est supprimé dès le texte extrait
 *   4. Le texte OCR est passé à parseTransmissionSheet() (fonction pure,
 *      testée unitairement) qui propose chambre/nom/âge/motif — jamais
 *      une valeur inventée pour un champ non détecté
 *   5. Écran de revue OBLIGATOIRE : chaque champ est éditable, chaque
 *      ligne indique "nouveau patient" vs "mise à jour" par chambre
 *   6. Rien n'est écrit dans le stockage chiffré avant le clic explicite
 *      sur "Valider l'import" — les patients non mentionnés ne sont
 *      jamais supprimés (la sortie reste une action manuelle séparée)
 *   7. Seules les initiales dérivées du nom sont conservées (jamais le
 *      nom complet lui-même) — cohérent avec la politique de
 *      pseudonymisation déjà appliquée par le reste de l'app
 */

import { useState, useEffect } from 'react';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { TextRecognition } from '@capacitor-mlkit/text-recognition';
import { T, s, loadDarkPref } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { genId } from './utils.jsx';
import { appendLog } from './AccessLog.jsx';
import { computeSlots } from './ServiceView.jsx';
import { parseTransmissionSheet, nameToInitials } from './transmissionParser.js';

const C = '#6366f1';

function matchSlot(slots, roomText) {
  if (!roomText) return null;
  const norm = String(roomText).trim().toLowerCase();
  const byLabel = slots.find(sl => String(sl.roomLabel).trim().toLowerCase() === norm);
  if (byLabel) return byLabel.slotIndex;
  const byIndex = slots.find(sl => String(sl.slotIndex) === norm);
  if (byIndex) return byIndex.slotIndex;
  return null;
}

function buildRows(parsedEntries, slots) {
  return parsedEntries.map(entry => ({
    id:            genId(),
    include:       true,
    ocrName:       entry.name,
    ocrRoom:       entry.room,
    bedNumber:     matchSlot(slots, entry.room),
    initials:      nameToInitials(entry.name),
    age:           entry.age !== null ? String(entry.age) : '',
    reason:        entry.reason || '',
    gender:        'M',
  }));
}

function blankRow() {
  return { id: genId(), include: true, ocrName: null, ocrRoom: null, bedNumber: null, initials: '', age: '', reason: '', gender: 'M' };
}

export default function TransmissionImport({ service, cryptoKey, onBack }) {
  const dark = loadDarkPref();
  const P = {
    glass: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    bdr:   dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
  };

  const [step,      setStep]      = useState('intro'); // intro · busy · review · saving · done · error
  const [error,     setError]     = useState('');
  const [patients,  setPatients]  = useState([]);
  const [rows,      setRows]      = useState([]);
  const [summary,   setSummary]   = useState(null);

  const slots = computeSlots(service);

  useEffect(() => {
    secureGet(`patients_${service.id}`, cryptoKey).then(pts => setPatients(pts || []));
  }, [service.id, cryptoKey]);

  async function handleCapture(fromGallery) {
    setError('');
    setStep('busy');
    let tempPath = null; // uniquement pour une photo QU'ON a fait prendre — jamais pour une photo déjà existante choisie dans la galerie de l'utilisateur
    try {
      // getPhoto() est dépréciée par Capacitor lui-même (au profit de
      // takePhoto/chooseFromGallery) : son ancien mécanisme peut, sur
      // certains appareils/versions d'Android récentes, ne déclencher
      // aucune UI et ne jamais résoudre ni rejeter l'appel — exactement le
      // blocage silencieux observé ("Analyse en cours…" qui ne se termine
      // jamais). On utilise donc les méthodes actuelles, non dépréciées.
      let uri;
      if (fromGallery) {
        const { results } = await Camera.chooseFromGallery({
          mediaType: MediaTypeSelection.Photo,
          allowMultipleSelection: false,
        });
        uri = results?.[0]?.uri;
      } else {
        const photo = await Camera.takePhoto({
          quality:            90,
          targetWidth:        3000,
          targetHeight:       3000,
          correctOrientation: true,
          saveToGallery:      false,
        });
        uri = photo.uri;
        tempPath = uri;
      }
      if (!uri) { setError('Photo vide ou sélection annulée.'); setStep('intro'); return; }

      const { text } = await TextRecognition.processImage({ path: uri });

      const parsed = parseTransmissionSheet(text || '');
      if (parsed.length === 0) {
        setError("Aucun texte reconnu sur cette photo. Réessayez avec un meilleur cadrage/éclairage, ou ajoutez une ligne manuellement.");
        setRows([]);
      }
      setRows(buildRows(parsed, slots));
      setStep('review');
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('cancel') || msg.includes('User cancelled')) { setStep('intro'); return; }
      setError('Erreur : ' + msg.slice(0, 140));
      setStep('error');
    } finally {
      // Seule une photo qu'on a fait prendre nous-mêmes est supprimée —
      // jamais une photo existante de la galerie de l'utilisateur.
      if (tempPath) { try { await Filesystem.deleteFile({ path: tempPath }); } catch {} }
    }
  }

  function updateRow(id, patch) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id));
  }
  function addManualRow() {
    setRows(prev => [...prev, blankRow()]);
  }

  // Le patient déjà présent dans une chambre est recalculé dynamiquement à
  // partir du choix courant de chambre (pas figé au moment de l'OCR) : si
  // l'utilisateur change la chambre d'une ligne, le statut nouveau/mise à
  // jour et l'enregistrement suivent ce choix, jamais l'inverse.
  function findExisting(list, bedNumber) {
    return bedNumber !== null ? list.find(p => p.present && p.bedNumber === bedNumber) : null;
  }

  const occupiedByOthers = (bedNumber, rowId) =>
    rows.some(r => r.id !== rowId && r.include && r.bedNumber === bedNumber && bedNumber !== null);

  async function handleValidate() {
    setStep('saving');
    try {
      let created = 0, updated = 0, skipped = 0;
      let next = [...patients];

      for (const row of rows) {
        if (!row.include) { skipped++; continue; }
        if (row.bedNumber === null) { skipped++; continue; }

        const initials = row.initials.trim().toUpperCase();
        const age      = row.age === '' ? null : Number(row.age);
        const reason   = row.reason.trim();

        // Recherché dans `next` (pas `patients`) : si une ligne précédente de
        // ce même import a déjà créé un patient dans cette chambre, cette
        // ligne le met à jour au lieu de créer un doublon dans le même lit.
        const existing = findExisting(next, row.bedNumber);

        if (existing) {
          next = next.map(p => p.id === existing.id ? {
            ...p,
            initials:        initials || p.initials,
            age:             age !== null && !Number.isNaN(age) ? age : p.age,
            admissionReason: reason || p.admissionReason,
          } : p);
          updated++;
        } else {
          if (!initials || age === null || Number.isNaN(age)) { skipped++; continue; }
          next.push({
            id: genId(), serviceId: service.id, bedNumber: row.bedNumber,
            initials, age, gender: row.gender, admissionReason: reason, atcd: '',
            fieldValues: {}, customFields: [], present: true, admittedAt: Date.now(),
          });
          created++;
        }
      }

      await secureSet(`patients_${service.id}`, next, cryptoKey);
      appendLog('IMPORT_TRANSMISSION', `${created} créé(s) · ${updated} mis à jour · ${skipped} ignoré(s)`);
      setSummary({ created, updated, skipped });
      setStep('done');
    } catch (e) {
      setError('Erreur à l\'enregistrement : ' + (e?.message || String(e)).slice(0, 140));
      setStep('error');
    }
  }

  const Header = ({ title }) => (
    <div style={{ padding: '14px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
      <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>{title}</div>
    </div>
  );

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === 'intro' || step === 'busy') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <Header title="📷 Import feuille de transmission" />
      <div style={{ padding: '18px 16px 60px' }}>
        <div style={{ background: '#22c55e14', border: '1px solid #22c55e40', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🔒 Traitement 100% local sur votre appareil</div>
          <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6 }}>
            La photo est analysée hors-ligne (reconnaissance de texte embarquée). Ni l'image ni le texte reconnu ne quittent votre téléphone — aucun serveur, aucun cloud.
            Une photo prise ici est <strong>supprimée immédiatement</strong> après l'extraction du texte ; une photo choisie depuis votre galerie n'est ni copiée ni modifiée, seulement lue.
          </div>
        </div>

        <div style={{ background: P.glass, border: `1px solid ${P.bdr}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>⚠️ Rien n'est enregistré automatiquement</div>
          <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6 }}>
            L'extraction est une <strong>proposition</strong>, pas une vérité : le layout des feuilles varie trop pour lui faire confiance seule.
            Vous vérifierez et corriger chaque champ (chambre, initiales, âge, motif) avant toute validation. Les patients déjà suivis et absents de la photo ne sont jamais supprimés.
          </div>
        </div>

        {error && (
          <div style={{ background: '#f43f5e18', border: '1px solid #f43f5e33', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#f43f5e', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => handleCapture(false)} disabled={step === 'busy'}
            style={{ ...s.btn(C), width: '100%', padding: '15px', fontSize: 15, opacity: step === 'busy' ? 0.6 : 1 }}>
            {step === 'busy' ? '⏳ Analyse en cours…' : '📷 Prendre une photo'}
          </button>
          <button onClick={() => handleCapture(true)} disabled={step === 'busy'}
            style={{ background: P.glass, border: `1px solid ${P.bdr}`, borderRadius: 12, color: T.text, padding: '15px', fontSize: 15, cursor: 'pointer', opacity: step === 'busy' ? 0.6 : 1 }}>
            🖼 Depuis la galerie
          </button>
        </div>
      </div>
    </div>
  );

  // ── REVIEW ─────────────────────────────────────────────────────────────────
  if (step === 'review') {
    const includedCount = rows.filter(r => r.include).length;
    return (
      <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
        <Header title="✅ Vérifier avant import" />
        <div style={{ padding: '14px 16px 100px' }}>
          <div style={{ color: T.muted, fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
            {rows.length} ligne(s) détectée(s). Corrigez les champs, choisissez la chambre si besoin, décochez ce qu'il ne faut pas importer.
          </div>

          {error && (
            <div style={{ background: '#f9731618', border: '1px solid #f9731640', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#f97316', fontSize: 12.5 }}>
              {error}
            </div>
          )}

          {rows.map(row => {
            const existing   = findExisting(patients, row.bedNumber);
            const isUpdate   = !!existing;
            const unresolved = row.bedNumber === null;
            const conflict   = row.bedNumber !== null && occupiedByOthers(row.bedNumber, row.id) && !existing;

            return (
              <div key={row.id} style={{
                background: T.surface, border: `1px solid ${unresolved ? '#f97316aa' : T.border}`,
                borderLeft: `3px solid ${unresolved ? '#f97316' : isUpdate ? '#06b6d4' : '#22c55e'}`,
                borderRadius: 12, padding: '14px', marginBottom: 12, opacity: row.include ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={row.include} onChange={e => updateRow(row.id, { include: e.target.checked })} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: unresolved ? '#f9731622' : isUpdate ? '#06b6d422' : '#22c55e22',
                      color:      unresolved ? '#f97316'   : isUpdate ? '#06b6d4'   : '#22c55e',
                    }}>
                      {unresolved ? '⚠️ Chambre à préciser' : isUpdate ? '✏️ Mise à jour' : '🆕 Nouveau patient'}
                    </span>
                  </label>
                  <button onClick={() => removeRow(row.id)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer' }}>🗑</button>
                </div>

                {row.ocrName && (
                  <div style={{ color: T.muted, fontSize: 11, fontStyle: 'italic', marginBottom: 10 }}>
                    Texte OCR détecté (non enregistré) : « {row.ocrName} »
                  </div>
                )}

                {conflict && (
                  <div style={{ color: '#f43f5e', fontSize: 11, marginBottom: 8 }}>⚠️ Chambre déjà utilisée par une autre ligne ci-dessous.</div>
                )}

                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...s.label, marginBottom: 5 }}>CHAMBRE</div>
                    <select value={row.bedNumber ?? ''} onChange={e => updateRow(row.id, { bedNumber: e.target.value === '' ? null : Number(e.target.value) })}
                      style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">— à choisir —</option>
                      {slots.map(sl => <option key={sl.slotIndex} value={sl.slotIndex}>{sl.roomLabel}</option>)}
                    </select>
                  </div>
                  <div style={{ width: 90 }}>
                    <div style={{ ...s.label, marginBottom: 5 }}>ÂGE</div>
                    <input type="number" inputMode="numeric" value={row.age} onChange={e => updateRow(row.id, { age: e.target.value })}
                      style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  {!isUpdate && (
                    <div>
                      <div style={{ ...s.label, marginBottom: 5 }}>SEXE</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['M', 'F'].map(g => (
                          <button key={g} onClick={() => updateRow(row.id, { gender: g })}
                            style={{ background: row.gender === g ? C + '33' : T.bg, border: `1px solid ${row.gender === g ? C : T.border}`, borderRadius: 8, color: row.gender === g ? C : T.muted, fontWeight: 700, fontSize: 14, width: 38, height: 38, cursor: 'pointer' }}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ ...s.label, marginBottom: 5 }}>INITIALES (pas de nom complet)</div>
                  <input value={row.initials} onChange={e => updateRow(row.id, { initials: e.target.value })} maxLength={5}
                    placeholder="Ex : J.D" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <div style={{ ...s.label, marginBottom: 5 }}>MOTIF D'HOSPITALISATION</div>
                  <input value={row.reason} onChange={e => updateRow(row.id, { reason: e.target.value })}
                    style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
            );
          })}

          <button onClick={addManualRow}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: P.glass, border: `1px dashed ${P.bdr}`, borderRadius: 12, color: T.muted, fontSize: 14, padding: '12px', cursor: 'pointer', marginBottom: 20 }}>
            <span style={{ fontSize: 18 }}>+</span> Ajouter une ligne manuellement
          </button>

          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '14px 16px', background: T.bg, borderTop: `1px solid ${T.border}`, boxSizing: 'border-box' }}>
            <button onClick={handleValidate} disabled={includedCount === 0}
              style={{ ...s.btn(C), width: '100%', padding: '15px', fontSize: 15, opacity: includedCount === 0 ? 0.4 : 1 }}>
              ✅ Valider l'import ({includedCount} ligne{includedCount > 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SAVING ─────────────────────────────────────────────────────────────────
  if (step === 'saving') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Enregistrement…</span>
    </div>
  );

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <Header title="Import terminé" />
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Import terminé</div>
        <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          {summary?.created || 0} nouveau(x) patient(s)<br />
          {summary?.updated || 0} patient(s) mis à jour<br />
          {summary?.skipped || 0} ligne(s) ignorée(s)
        </div>
        <button onClick={onBack} style={{ ...s.btn(C), padding: '13px 28px', fontSize: 15 }}>Retour au service</button>
      </div>
    </div>
  );

  // ── ERROR ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
      <Header title="Erreur" />
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
        <div style={{ color: '#f43f5e', fontSize: 14, marginBottom: 20 }}>{error}</div>
        <button onClick={() => setStep('intro')} style={{ ...s.btn(C), padding: '12px 24px', fontSize: 14 }}>Réessayer</button>
      </div>
    </div>
  );
}
