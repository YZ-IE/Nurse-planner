/**
 * HandoverReport.jsx — Aide-Mémoire
 * Générateur de relève : compile les soins faits/restants, événements et
 * RDV/infos du jour, par patient, en un texte de transmission.
 * Le texte est lisible à l'écran pour une relève orale, et ne peut sortir
 * de l'app que via le même circuit chiffré que le Transfert sécurisé
 * (AES + code à 8 chiffres communiqué verbalement) — conformément au
 * correctif CNIL déjà en place (aucune donnée patient en clair exportée).
 */
import { useState, useEffect, useCallback } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, encryptForTransfer, decryptFromTransfer, generateTransferCode } from './crypto.js';
import { getSpecialty } from './templates.js';
import { todayStr, activeFlagsEmoji, formatDateLabel } from './utils.jsx';
import { computeSlots } from './ServiceView.jsx';
import MenuButton from './MenuButton.jsx';

const CARE_META = {
  constantes_vitales: { emoji: '📊' }, antalgie: { emoji: '💊' }, bilan: { emoji: '🧪' },
  diurese: { emoji: '💧' }, ecg: { emoji: '📈' }, hgt: { emoji: '🩸' }, injection: { emoji: '💉' },
  pansement: { emoji: '🩹' }, perfusion: { emoji: '🫙' }, poids: { emoji: '⚖️' }, autre: { emoji: '📋' },
};
function careEmoji(type) { return (CARE_META[type] || CARE_META.autre).emoji; }

function buildReportText(service, patients, dailyData, selectedDate) {
  const lines = [];
  lines.push(`RELÈVE — ${service.name}`);
  lines.push(`${formatDateLabel(selectedDate)} · ${patients.length} patient(s) présent(s)`);
  lines.push('─'.repeat(40));
  const slots = computeSlots(service);

  for (const p of patients) {
    const slot  = slots.find(sl => sl.slotIndex === p.bedNumber);
    const label = slot ? slot.roomLabel : String(p.bedNumber);
    const daily = dailyData[p.id] || {};
    const allFields = [...(service.fields || []), ...(p.customFields || [])];
    const flags = activeFlagsEmoji(allFields, p.fieldValues || {}, daily.fieldValues || {});

    lines.push('');
    lines.push(`🛏 ${label} — ${p.initials} (${p.gender} ${p.age}a)${flags.length ? '  ' + flags.join(' ') : ''}`);
    if (p.admissionReason) lines.push(`   Motif : ${p.admissionReason}`);

    const care    = daily.careEntries || [];
    const done    = care.filter(c => c.done);
    const pending = care.filter(c => !c.done);
    if (done.length)    lines.push(`   Soins faits : ${done.map(c => `${careEmoji(c.type)} ${c.label} (${c.doneTime}${c.doneValue ? ' — ' + c.doneValue : ''})`).join(' · ')}`);
    if (pending.length) lines.push(`   Soins restants : ${pending.map(c => `${careEmoji(c.type)} ${c.label} (${c.plannedTime})`).join(' · ')}`);

    const events = daily.events || [];
    if (events.length) lines.push(`   Événements : ${events.map(e => `${e.time} ${e.text}`).join(' | ')}`);

    if ((daily.observations || '').trim()) lines.push(`   Observations : ${daily.observations.trim()}`);

    if (!done.length && !pending.length && !events.length && !(daily.observations || '').trim()) {
      lines.push('   — Rien à signaler —');
    }
  }
  return lines.join('\n');
}

export default function HandoverReport({ service, cryptoKey, onBack, onMenu, selectedDate: selDate }) {
  const selectedDate = selDate || todayStr();

  const [loading,    setLoading]    = useState(true);
  const [reportText, setReportText] = useState('');
  const [tab,        setTab]        = useState('generate'); // 'generate' | 'receive'

  const [code,    setCode]    = useState('');
  const [blob,    setBlob]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState('');

  const [pastedBlob, setPastedBlob] = useState('');
  const [inputCode,  setInputCode]  = useState('');
  const [received,   setReceived]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pts, daily] = await Promise.all([
        secureGet(`patients_${service.id}`, cryptoKey),
        secureGet(`daily_${service.id}_${selectedDate}`, cryptoKey),
      ]);
      const present = (pts || []).filter(p => p.present).sort((a, b) => a.bedNumber - b.bedNumber);
      setReportText(buildReportText(service, present, daily || {}, selectedDate));
    } finally { setLoading(false); }
  }, [service.id, cryptoKey, selectedDate]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerateBlob() {
    setBusy(true); setError(''); setBlob(''); setCode(''); setCopied(false);
    try {
      const newCode = generateTransferCode();
      const b64 = await encryptForTransfer(newCode, {
        type: 'handover', service: service.name, date: selectedDate, text: reportText,
      });
      setCode(newCode);
      setBlob(b64);
    } catch (e) {
      setError('Erreur lors du chiffrement : ' + (e?.message || String(e)));
    } finally { setBusy(false); }
  }

  async function copyBlob() {
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError('Appuyez sur le texte, sélectionnez tout et copiez');
    }
  }

  async function handleDecrypt() {
    if (!pastedBlob.trim() || inputCode.replace(/\s/g, '').length !== 8) {
      setError('Collez le blob et entrez le code à 8 chiffres'); return;
    }
    setBusy(true); setError(''); setReceived(null);
    try {
      const payload = await decryptFromTransfer(pastedBlob.trim(), inputCode);
      if (payload?.type !== 'handover') throw new Error('bad type');
      setReceived(payload);
    } catch {
      setError('Déchiffrement impossible. Vérifiez le code ou le blob.');
    } finally { setBusy(false); }
  }

  const INP = { ...s.input, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <MenuButton onClick={onMenu} />
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>📝 Relève</div>
            <div style={{ color: T.muted, fontSize: 12 }}>{service.name} · {formatDateLabel(selectedDate)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'generate', label: '📝 Générer' }, { id: 'receive', label: '📥 Recevoir' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
              style={{
                flex: 1, background: tab === t.id ? '#6366f122' : T.surface,
                border: `1px solid ${tab === t.id ? '#6366f1' : T.border}`, borderRadius: 10,
                color: tab === t.id ? '#6366f1' : T.muted, fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                padding: '9px', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>
        {error && (
          <div style={{ background: '#f43f5e18', border: '1px solid #f43f5e33', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#f43f5e', fontSize: 13 }}>
            {error}
          </div>
        )}

        {tab === 'generate' && (
          <>
            <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Aperçu (lecture à l'oral entre équipes)
            </div>
            {loading ? (
              <div style={{ color: T.muted, fontSize: 13 }}>Chargement…</div>
            ) : (
              <pre style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px',
                color: T.text, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'inherit', margin: 0, marginBottom: 18, maxHeight: 320, overflowY: 'auto',
              }}>{reportText}</pre>
            )}

            <div style={{ background: '#6366f111', border: '1px solid #6366f133', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
              🔒 Aucune donnée patient ne sort de l'app en clair. Le texte est chiffré avant tout partage — le code à 8 chiffres se communique <strong>verbalement</strong>, jamais avec le blob.
            </div>

            {!blob ? (
              <button onClick={handleGenerateBlob} disabled={busy || loading}
                style={{ ...s.btn('#6366f1'), width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Chiffrement…' : '🔐 Générer le transfert chiffré'}
              </button>
            ) : (
              <>
                <div style={{ ...s.card, marginBottom: 10 }}>
                  <div style={{ ...s.label }}>Code à communiquer verbalement</div>
                  <div style={{ color: '#6366f1', fontSize: 26, fontWeight: 800, letterSpacing: 2, textAlign: 'center', margin: '8px 0' }}>{code}</div>
                </div>
                <textarea readOnly value={blob} rows={4}
                  style={{ ...INP, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={copyBlob} style={{ flex: 1, ...s.btn(copied ? '#22c55e' : '#6366f1'), padding: '12px', fontSize: 13, fontWeight: 700 }}>
                    {copied ? '✓ Copié' : '📋 Copier le blob'}
                  </button>
                  <button onClick={handleGenerateBlob} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, fontSize: 13, cursor: 'pointer' }}>
                    🔄 Régénérer
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'receive' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...s.label, marginBottom: 6 }}>Blob reçu (collé)</div>
              <textarea value={pastedBlob} onChange={e => setPastedBlob(e.target.value)} rows={4}
                placeholder="Collez ici le texte chiffré reçu…"
                style={{ ...INP, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...s.label, marginBottom: 6 }}>Code à 8 chiffres</div>
              <input value={inputCode} onChange={e => setInputCode(e.target.value)} inputMode="numeric" placeholder="0000 0000"
                style={{ ...INP, textAlign: 'center', fontSize: 18, letterSpacing: 2 }} />
            </div>
            <button onClick={handleDecrypt} disabled={busy}
              style={{ ...s.btn('#6366f1'), width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, marginBottom: 16, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Déchiffrement…' : '🔓 Déchiffrer et afficher'}
            </button>

            {received && (
              <>
                <div style={{ color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {received.service} · {formatDateLabel(received.date)}
                </div>
                <pre style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px',
                  color: T.text, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'inherit', margin: 0, maxHeight: 420, overflowY: 'auto',
                }}>{received.text}</pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
