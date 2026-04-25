/**
 * SecureTransfer.jsx — Aide-Mémoire v3
 * Import complet :
 *   · Patients + soins du jour
 *   · Configuration chambres (bedRooms / bedConfig)
 *   · Création automatique du service s'il est absent
 */

import { useState } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, secureSet, encryptForTransfer, decryptFromTransfer, generateTransferCode } from './crypto.js';
import { todayStr } from './utils.jsx';

const ACCENT = '#6366f1';

export default function SecureTransfer({ service, cryptoKey, onBack }) {
  const [tab,      setTab]      = useState(service ? 'export' : 'import');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // Export
  const [blob,   setBlob]   = useState('');
  const [code,   setCode]   = useState('');
  const [copied, setCopied] = useState(false);

  // Import
  const [pastedBlob, setPastedBlob] = useState('');
  const [inputCode,  setInputCode]  = useState('');
  const [preview,    setPreview]    = useState(null);
  const [confirmed,  setConfirmed]  = useState(false);

  const today = todayStr();

  function reset() {
    setError(''); setSuccess('');
    setBlob(''); setCode(''); setCopied(false);
    setPastedBlob(''); setInputCode(''); setPreview(null); setConfirmed(false);
  }

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  async function handleExport() {
    setBusy(true); setError(''); setBlob(''); setCode('');
    try {
      const [patients, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${today}`, cryptoKey),
      ]);
      const payload = {
        exportedAt: Date.now(),
        service: {
          id:        service.id,
          name:      service.name,
          specialty: service.specialty,
          fields:    service.fields,
          bedRooms:  service.bedRooms  || [],
          bedConfig: service.bedConfig || {},
          bedCount:  service.bedCount  || 20,
        },
        patients: patients || [],
        daily:    daily    || {},
      };
      const generatedCode = generateTransferCode();
      const b64 = await encryptForTransfer(generatedCode, payload);
      setBlob(b64);
      setCode(generatedCode);
    } catch (e) {
      setError('Erreur lors de la génération : ' + e.message);
    } finally { setBusy(false); }
  }

  async function copyBlob() {
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      try {
        const ta = document.querySelector('textarea[readonly]');
        if (ta) { ta.focus(); ta.select(); document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 3000); }
        else { setError('Appuyez sur le texte, sélectionnez tout et copiez'); }
      } catch { setError('Appuyez sur le texte, sélectionnez tout et copiez'); }
    }
  }

  // ── IMPORT ──────────────────────────────────────────────────────────────────
  async function handleDecrypt() {
    if (!pastedBlob.trim() || inputCode.replace(/\s/g, '').length !== 8) {
      setError('Collez le blob et entrez le code 8 chiffres'); return;
    }
    try {
      const parsed = JSON.parse(atob(pastedBlob.trim()));
    } catch { setError('Format invalide — copiez le texte en entier.'); return; }
    setBusy(true); setError(''); setPreview(null);
    try {
      const payload = await decryptFromTransfer(pastedBlob.trim(), inputCode);
      setPreview(payload);
    } catch {
      setError('Déchiffrement impossible. Vérifiez le code ou le blob.');
    } finally { setBusy(false); }
  }

  async function handleImport() {
    if (!preview || !confirmed) return;
    setBusy(true); setError('');
    try {
      const src = preview.service;

      // ── 1. Créer ou mettre à jour le service dans la liste ────────────────
      const services = await secureGet('services', cryptoKey) || [];
      const exists   = services.find(sv => sv.id === src.id);

      if (!exists) {
        // Service absent → le créer avec toute la config exportée
        const newService = {
          id:        src.id,
          name:      src.name,
          specialty: src.specialty,
          fields:    src.fields    || [],
          bedRooms:  src.bedRooms  || [],
          bedConfig: src.bedConfig || {},
          bedCount:  src.bedCount  || 20,
          createdAt: Date.now(),
          importedAt: Date.now(),
        };
        await secureSet('services', [...services, newService], cryptoKey);
      } else {
        // Service existant → mettre à jour la config chambres
        const updated = services.map(sv =>
          sv.id === src.id
            ? {
                ...sv,
                bedRooms:  src.bedRooms  || sv.bedRooms  || [],
                bedConfig: src.bedConfig || sv.bedConfig || {},
                bedCount:  src.bedCount  || sv.bedCount,
                fields:    src.fields    || sv.fields,
              }
            : sv
        );
        await secureSet('services', updated, cryptoKey);
      }

      // ── 2. Importer patients et soins du jour (ID source) ─────────────────
      await secureSet(`patients_${src.id}`, preview.patients, cryptoKey);
      await secureSet(`daily_${src.id}_${today}`, preview.daily, cryptoKey);

      const nb = preview.patients?.length || 0;
      const msg = exists
        ? `✅ Import réussi — ${nb} patient(s) · config chambres mise à jour`
        : `✅ Service "${src.name}" créé — ${nb} patient(s) importé(s)`;
      setSuccess(msg);
      setPastedBlob(''); setInputCode(''); setPreview(null); setConfirmed(false);

    } catch (e) {
      setError('Erreur lors de l\'import : ' + e.message);
    } finally { setBusy(false); }
  }

  const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px' };

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>🔐 Transfert sécurisé</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{service ? service.name + " · Strictement local" : "Import uniquement"}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'export', label: '📤 Exporter' }, { id: 'import', label: '📥 Importer' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); reset(); }}
              style={{ flex: 1, background: tab === t.id ? ACCENT + '22' : T.surface, border: `1px solid ${tab === t.id ? ACCENT : T.border}`, borderRadius: 8, color: tab === t.id ? ACCENT : T.muted, fontSize: 13, fontWeight: tab === t.id ? 700 : 400, padding: '8px 4px', cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>

        {/* Info sécurité */}
        <div style={{ background: T.surface2, border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🔒 Protocole de sécurité</div>
          <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5 }}>
            AES-256-GCM · PBKDF2 100k · Code vocal séparé · Zéro réseau
          </div>
        </div>

        {error   && <div style={{ background: '#f43f5e22', border: '1px solid #f43f5e44', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f43f5e', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#22c55e', fontSize: 13 }}>{success}</div>}

        {/* ════ EXPORT ════ */}
        {tab === 'export' && (
          <>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Ce qui est exporté</div>
              {[
                '👥 Patients présents (initiales, âge, motif, ATCD)',
                '💊 Soins du jour (planifiés et effectués)',
                '📊 Constantes et événements du jour',
                '🚪 Configuration des chambres',
              ].map((item, i) => (
                <div key={i} style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>✓ {item}</div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Étape 1 — Générer le paquet chiffré</div>
              <button onClick={handleExport} disabled={busy}
                style={{ ...s.btn(ACCENT), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
                {busy ? 'Chiffrement…' : '🔐 Générer le paquet chiffré'}
              </button>
            </div>

            {blob && (
              <>
                <div style={{ background: T.orgaDim, border: '1px solid #22c55e44', borderRadius: 12, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ color: '#22c55e', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    🔑 Code secret — à dire verbalement à votre collègue
                  </div>
                  <div style={{ color: '#22c55e', fontSize: 38, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 6 }}>
                    {code}
                  </div>
                  <div style={{ color: '#4ade80', fontSize: 11, marginTop: 8 }}>
                    ⚠️ Ne pas envoyer ce code par le même canal que le paquet
                  </div>
                </div>

                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Étape 2 — Copier le paquet chiffré</div>
                  <textarea value={blob} readOnly rows={5} onFocus={e => e.target.select()} style={{ ...s.input, width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 10, lineHeight: 1.4, resize: "none", wordBreak: "break-all", color: T.muted, marginBottom: 4, cursor: "text" }} />
                  <div style={{ color: T.muted, fontSize: 10, marginBottom: 12, textAlign: "right" }}>{blob.length} caractères — {copied ? "✅ Copié" : "à copier"}</div>
                  <button onClick={copyBlob}
                    style={{ ...s.btn(copied ? '#22c55e' : ACCENT), width: '100%', padding: '12px', fontSize: 14, fontWeight: 700 }}>
                    {copied ? '✅ Copié !' : '📋 Copier le paquet chiffré'}
                  </button>
                  <div style={{ color: T.muted, fontSize: 11, marginTop: 10, textAlign: 'center' }}>
                    Votre collègue colle ce texte dans l'onglet Import
                  </div>
                </div>

                <div style={{ background: '#1a0a12', border: '1px solid #f43f5e33', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: '#f43f5e', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚠️ Secret professionnel</div>
                  <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5 }}>
                    Communiquez le code uniquement de vive voix. Le paquet chiffré peut transiter par tout canal.
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ════ IMPORT ════ */}
        {tab === 'import' && !preview && (
          <>
            {/* Info ce qui sera importé */}
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Ce qui sera importé</div>
              {[
                '👥 Patients + données cliniques',
                '💊 Soins du jour',
                '🚪 Configuration des chambres',
                '🏥 Service créé automatiquement s\'il est absent',
              ].map((item, i) => (
                <div key={i} style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>✓ {item}</div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Étape 1 — Coller le paquet chiffré</div>
              <textarea value={pastedBlob} onChange={e => setPastedBlob(e.target.value)}
                placeholder="Collez ici le texte copié depuis l'autre appareil…"
                rows={4}
                style={{ ...s.input, width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.4 }} />
              {pastedBlob.trim().length > 0 && (
                <div style={{ color: pastedBlob.trim().length < 200 ? '#f97316' : T.muted, fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                  {pastedBlob.trim().length} car.{pastedBlob.trim().length < 200 ? ' ⚠️ Trop court' : ' ✓'}
                </div>
              )}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Étape 2 — Code secret (8 chiffres)</div>
              <input value={inputCode} onChange={e => setInputCode(e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="Ex : 1234 5678" maxLength={9} inputMode="numeric"
                style={{ ...s.input, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 22, textAlign: 'center', letterSpacing: 4 }} />
              <div style={{ color: T.muted, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                Code communiqué verbalement par votre collègue
              </div>
            </div>

            <button onClick={handleDecrypt}
              disabled={busy || !pastedBlob.trim() || inputCode.replace(/\s/g, '').length !== 8}
              style={{ ...s.btn(ACCENT), width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, opacity: (pastedBlob.trim() && inputCode.replace(/\s/g, '').length === 8 && !busy) ? 1 : 0.4 }}>
              {busy ? 'Déchiffrement…' : '🔓 Déchiffrer et prévisualiser'}
            </button>
          </>
        )}

        {/* ── Prévisualisation ── */}
        {tab === 'import' && preview && (
          <>
            <div style={{ background: T.orgaDim, border: '1px solid #22c55e44', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
              <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>✅ Déchiffrement réussi — Aperçu</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ background: '#166534', color: '#4ade80', fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>
                  🏥 {preview.service?.name}
                </span>
                <span style={{ background: '#166534', color: '#4ade80', fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>
                  👥 {preview.patients?.length || 0} patient(s)
                </span>
                <span style={{ background: '#166534', color: '#4ade80', fontSize: 11, borderRadius: 8, padding: '3px 10px' }}>
                  🚪 {(preview.service?.bedRooms || []).length || preview.service?.bedCount || 0} chambre(s)
                </span>
              </div>

              <div style={{ color: T.muted, fontSize: 11, marginBottom: 10 }}>
                Exporté le {preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('fr-FR') : '—'}
              </div>

              {(preview.patients || []).slice(0, 5).map(p => (
                <div key={p.id} style={{ background: T.surface, borderRadius: 8, padding: '6px 10px', marginBottom: 6, fontSize: 12, display: 'flex', gap: 6 }}>
                  <span style={{ color: T.muted }}>Lit {p.bedNumber}</span>
                  <span style={{ color: T.text, fontWeight: 700 }}>{p.initials}</span>
                  <span style={{ color: T.muted }}>{p.gender} {p.age}a</span>
                  {p.admissionReason && <span style={{ color: T.muted }}>— {p.admissionReason.slice(0, 25)}</span>}
                </div>
              ))}
              {(preview.patients || []).length > 5 && (
                <div style={{ color: T.muted, fontSize: 11, textAlign: 'center' }}>… et {preview.patients.length - 5} autre(s)</div>
              )}
            </div>

            <div style={{ background: '#1a0a12', border: '1px solid #f43f5e33', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ color: '#f43f5e', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⚠️ Action irréversible</div>
              <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                Les patients et soins du jour du service <strong style={{ color: T.text }}>{preview.service?.name}</strong> seront remplacés sur cet appareil.
                La configuration des chambres sera mise à jour.
                {!true && ' Le service sera créé s\'il est absent.'}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: T.text, fontSize: 12 }}>
                  Je confirme vouloir importer et remplacer les données locales
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setPreview(null); setPastedBlob(''); setInputCode(''); setConfirmed(false); }}
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 14, padding: '12px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleImport} disabled={!confirmed || busy}
                style={{ ...s.btn(confirmed ? '#22c55e' : T.muted), flex: 2, padding: '12px', fontSize: 14, fontWeight: 700, opacity: (confirmed && !busy) ? 1 : 0.4 }}>
                {busy ? 'Import…' : '✅ Confirmer l\'import'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
