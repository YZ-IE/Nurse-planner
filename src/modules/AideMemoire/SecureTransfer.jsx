/**
 * SecureTransfer.jsx — Aide-Mémoire v3
 * Import complet :
 *   · Patients + soins du jour
 *   · Configuration chambres (bedRooms / bedConfig)
 *   · Création automatique du service s'il est absent
 */

import { useState } from 'react';
import { T, tk, SOLID } from '../../theme.js';
import { Btn, IconBtn, Banner, Input, Textarea, toast } from '../../ui/index.js';
import { secureGet, secureSet, encryptForTransfer, decryptFromTransfer, generateTransferCode } from './crypto.js';
import { todayStr } from './utils.jsx';

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
      toast('Transfert terminé');
      setPastedBlob(''); setInputCode(''); setPreview(null); setConfirmed(false);

    } catch (e) {
      setError('Erreur lors de l\'import : ' + e.message);
    } finally { setBusy(false); }
  }

  const card     = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: tk.radius.md, padding: '14px' };
  const secLabel = { color: T.muted, fontSize: tk.font.xs, fontWeight: 600, letterSpacing: 0.2, marginBottom: 8 };

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <IconBtn label="Retour" onClick={onBack} fontSize={22}>←</IconBtn>
          <div>
            <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: 700 }}>🔐 Transfert sécurisé</div>
            <div style={{ color: T.muted, fontSize: tk.font.sm }}>{service ? service.name + " · Strictement local" : "Import uniquement"}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'export', label: '📤 Exporter' }, { id: 'import', label: '📥 Importer' }].map(t => (
            <Btn key={t.id}
              variant={tab === t.id ? 'soft' : 'outline'}
              color={tab === t.id ? T.info : T.muted}
              onClick={() => { setTab(t.id); reset(); }}
              style={{ flex: 1 }}>
              {t.label}
            </Btn>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>

        {/* Info sécurité */}
        <Banner kind="info" icon="🔒" title="Protocole de sécurité" style={{ marginBottom: 16 }}>
          AES-256-GCM · PBKDF2 100k · Code vocal séparé · Zéro réseau
        </Banner>

        {error   && <Banner kind="danger"  style={{ marginBottom: 14 }}>{error}</Banner>}
        {success && <Banner kind="success" style={{ marginBottom: 14 }}>{success}</Banner>}

        {/* ════ EXPORT ════ */}
        {tab === 'export' && (
          <>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={secLabel}>Ce qui est exporté</div>
              {[
                '👥 Patients présents (initiales, âge, motif, ATCD)',
                '💊 Soins du jour (planifiés et effectués)',
                '📊 Constantes et événements du jour',
                '🚪 Configuration des chambres',
              ].map((item, i) => (
                <div key={i} style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 4 }}>✓ {item}</div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={secLabel}>Étape 1 — Générer le paquet chiffré</div>
              <Btn color={SOLID.info} size="lg" full disabled={busy} onClick={handleExport}>
                {busy ? 'Chiffrement…' : '🔐 Générer le paquet chiffré'}
              </Btn>
            </div>

            {blob && (
              <>
                <div style={{ background: T.successDim, border: `1px solid ${T.success}44`, borderRadius: tk.radius.md, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ color: T.success, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 8 }}>
                    🔑 Code secret — à dire verbalement à votre collègue
                  </div>
                  {/* Code vocal — reste en monospace (lecture chiffre par chiffre) */}
                  <div style={{ color: T.success, fontSize: 38, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 6 }}>
                    {code}
                  </div>
                  <div style={{ color: T.success, fontSize: tk.font.xs, marginTop: 8 }}>
                    ⚠️ Ne pas envoyer ce code par le même canal que le paquet
                  </div>
                </div>

                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={secLabel}>Étape 2 — Copier le paquet chiffré</div>
                  <Textarea value={blob} readOnly rows={5} onFocus={e => e.target.select()}
                    style={{ fontFamily: 'monospace', fontSize: tk.font.xs, lineHeight: 1.4, resize: 'none', wordBreak: 'break-all', color: T.muted, marginBottom: 4, cursor: 'text' }} />
                  <div style={{ color: T.muted, fontSize: tk.font.xs, marginBottom: 12, textAlign: 'right' }}>{blob.length} caractères — {copied ? '✅ Copié' : 'à copier'}</div>
                  <Btn color={copied ? SOLID.success : SOLID.info} full onClick={copyBlob}>
                    {copied ? '✅ Copié !' : '📋 Copier le paquet chiffré'}
                  </Btn>
                  <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 10, textAlign: 'center' }}>
                    Votre collègue colle ce texte dans l'onglet Import
                  </div>
                </div>

                <Banner kind="danger" icon="⚠️" title="Secret professionnel">
                  Communiquez le code uniquement de vive voix. Le paquet chiffré peut transiter par tout canal.
                </Banner>
              </>
            )}
          </>
        )}

        {/* ════ IMPORT ════ */}
        {tab === 'import' && !preview && (
          <>
            {/* Info ce qui sera importé */}
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={secLabel}>Ce qui sera importé</div>
              {[
                '👥 Patients + données cliniques',
                '💊 Soins du jour',
                '🚪 Configuration des chambres',
                '🏥 Service créé automatiquement s\'il est absent',
              ].map((item, i) => (
                <div key={i} style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 4 }}>✓ {item}</div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={secLabel}>Étape 1 — Coller le paquet chiffré</div>
              <Textarea value={pastedBlob} onChange={e => setPastedBlob(e.target.value)}
                placeholder="Collez ici le texte copié depuis l'autre appareil…"
                rows={4}
                style={{ resize: 'none', fontFamily: 'monospace', fontSize: tk.font.xs, lineHeight: 1.4 }} />
              {pastedBlob.trim().length > 0 && (
                <div style={{ color: pastedBlob.trim().length < 200 ? T.warning : T.muted, fontSize: tk.font.xs, marginTop: 4, textAlign: 'right' }}>
                  {pastedBlob.trim().length} car.{pastedBlob.trim().length < 200 ? ' ⚠️ Trop court' : ' ✓'}
                </div>
              )}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={secLabel}>Étape 2 — Code secret (8 chiffres)</div>
              {/* Code de transfert 8 chiffres — monospace conservé */}
              <Input value={inputCode} onChange={e => setInputCode(e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="Ex : 1234 5678" maxLength={9} inputMode="numeric"
                style={{ fontFamily: 'monospace', fontSize: tk.font.xxl, textAlign: 'center', letterSpacing: 4 }} />
              <div style={{ color: T.muted, fontSize: tk.font.xs, marginTop: 8, textAlign: 'center' }}>
                Code communiqué verbalement par votre collègue
              </div>
            </div>

            <Btn color={SOLID.info} size="lg" full onClick={handleDecrypt}
              disabled={busy || !pastedBlob.trim() || inputCode.replace(/\s/g, '').length !== 8}>
              {busy ? 'Déchiffrement…' : '🔓 Déchiffrer et prévisualiser'}
            </Btn>
          </>
        )}

        {/* ── Prévisualisation ── */}
        {tab === 'import' && preview && (
          <>
            <div style={{ background: T.successDim, border: `1px solid ${T.success}44`, borderRadius: tk.radius.md, padding: '14px', marginBottom: 16 }}>
              <div style={{ color: T.success, fontSize: tk.font.base, fontWeight: 700, marginBottom: 10 }}>✅ Déchiffrement réussi — Aperçu</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ background: T.surface, border: `1px solid ${T.success}44`, color: T.success, fontSize: tk.font.xs, borderRadius: tk.radius.sm, padding: '4px 10px' }}>
                  🏥 {preview.service?.name}
                </span>
                <span style={{ background: T.surface, border: `1px solid ${T.success}44`, color: T.success, fontSize: tk.font.xs, borderRadius: tk.radius.sm, padding: '4px 10px' }}>
                  👥 {preview.patients?.length || 0} patient(s)
                </span>
                <span style={{ background: T.surface, border: `1px solid ${T.success}44`, color: T.success, fontSize: tk.font.xs, borderRadius: tk.radius.sm, padding: '4px 10px' }}>
                  🚪 {(preview.service?.bedRooms || []).length || preview.service?.bedCount || 0} chambre(s)
                </span>
              </div>

              <div style={{ color: T.muted, fontSize: tk.font.xs, marginBottom: 10 }}>
                Exporté le {preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('fr-FR') : '—'}
              </div>

              {(preview.patients || []).slice(0, 5).map(p => (
                <div key={p.id} style={{ background: T.surface, borderRadius: tk.radius.sm, padding: '8px 10px', marginBottom: 6, fontSize: tk.font.sm, display: 'flex', gap: 6 }}>
                  <span style={{ color: T.muted }}>Lit {p.bedNumber}</span>
                  <span style={{ color: T.text, fontWeight: 700 }}>{p.initials}</span>
                  <span style={{ color: T.muted }}>{p.gender} {p.age}a</span>
                  {p.admissionReason && <span style={{ color: T.muted }}>— {p.admissionReason.slice(0, 25)}</span>}
                </div>
              ))}
              {(preview.patients || []).length > 5 && (
                <div style={{ color: T.muted, fontSize: tk.font.xs, textAlign: 'center' }}>… et {preview.patients.length - 5} autre(s)</div>
              )}
            </div>

            <Banner kind="danger" icon="⚠️" title="Action irréversible" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 10 }}>
                Les patients et soins du jour du service <strong style={{ color: T.text }}>{preview.service?.name}</strong> seront remplacés sur cet appareil.
                La configuration des chambres sera mise à jour.
                {!true && ' Le service sera créé s\'il est absent.'}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: T.text, fontSize: tk.font.sm }}>
                  Je confirme vouloir importer et remplacer les données locales
                </span>
              </label>
            </Banner>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="outline" color={T.muted} size="lg" style={{ flex: 1 }}
                onClick={() => { setPreview(null); setPastedBlob(''); setInputCode(''); setConfirmed(false); }}>
                Annuler
              </Btn>
              <Btn color={SOLID.success} size="lg" style={{ flex: 2 }} disabled={!confirmed || busy} onClick={handleImport}>
                {busy ? 'Import…' : '✅ Confirmer l\'import'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
