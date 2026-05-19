/**
 * ServicesScreen.jsx — Aide-Mémoire v4
 * + Suppression d'un service (avec confirmation)
 */

import { useState, useEffect, useRef } from 'react';
import { T, s } from '../../theme.js';
import { secureGet, secureSet } from './crypto.js';
import { SPECIALTIES, getTemplateFields, getSpecialty, isTournee } from './templates.js';
import { formatDateFR } from './utils.jsx';
import { computeSlots } from './ServiceView.jsx';

export default function ServicesScreen({ cryptoKey, accentColor, onBack, onSelectService, onImport, onSearchNavigate }) {
  const C = accentColor;

  const [services,       setServices]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState('list');
  const [form,           setForm]           = useState({ name: '', specialty: 'traumato', bedCount: 20 });
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);

  // ── Recherche globale ────────────────────────────────────────────────────
  const [showSearch,   setShowSearch]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [allPatients,  setAllPatients]  = useState(null); // null = not loaded yet
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  async function openSearch() {
    setShowSearch(true);
    setSearchQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 80);
    if (allPatients !== null) return;
    setSearchLoading(true);
    try {
      const svcs = await secureGet('services', cryptoKey) || [];
      const results = await Promise.all(
        svcs.map(async sv => {
          const pts = await secureGet(`patients_${sv.id}`, cryptoKey) || [];
          const slots = computeSlots(sv);
          const bedLabel = Object.fromEntries(slots.map(sl => [sl.slotIndex, sl.roomLabel]));
          return pts.filter(p => p.present).map(p => ({
            service: sv,
            patient: p,
            bedLabel: bedLabel[p.bedNumber] ?? String(p.bedNumber),
          }));
        })
      );
      setAllPatients(results.flat());
    } finally { setSearchLoading(false); }
  }

  const searchResults = (() => {
    if (!allPatients || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return allPatients.filter(({ patient, bedLabel }) =>
      patient.initials.toLowerCase().includes(q) ||
      bedLabel.toLowerCase().includes(q) ||
      (patient.admissionReason || '').toLowerCase().includes(q) ||
      (patient.atcd || '').toLowerCase().includes(q)
    ).slice(0, 20);
  })();

  useEffect(() => {
    secureGet('services', cryptoKey).then(data => setServices(data || [])).finally(() => setLoading(false));
  }, []);

  async function persistServices(next) {
    setServices(next);
    await secureSet('services', next, cryptoKey);
  }

  async function handleCreate() {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const tournee    = isTournee(form.specialty);
      const newService = {
        id: Date.now().toString(), name, specialty: form.specialty,
        bedCount: tournee ? 0 : Number(form.bedCount),
        fields: tournee ? [] : getTemplateFields(form.specialty),
        bedConfig: {}, createdAt: Date.now(),
      };
      await persistServices([...services, newService]);
      setForm({ name: '', specialty: 'traumato', bedCount: 20 });
      setView('list');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    await persistServices(services.filter(s => s.id !== id));
    setConfirmDelete(null);
  }

  if (loading) return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.muted, fontSize: 14 }}>Chargement…</span>
    </div>
  );

  // ── Formulaire création ──────────────────────────────────────────────────

  if (view === 'create') {
    const sp            = getSpecialty(form.specialty);
    const tournee       = isTournee(form.specialty);
    const previewFields = tournee ? [] : getTemplateFields(form.specialty);
    return (
      <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 20px 50px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>Nouveau service</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ ...s.label, color: T.muted, marginBottom: 8 }}>NOM DU SERVICE</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex : Traumatologie A" maxLength={40}
              style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ ...s.label, color: T.muted, marginBottom: 10 }}>SPÉCIALITÉ</div>
            {SPECIALTIES.map(item => {
              const active = form.specialty === item.id;
              return (
                <button key={item.id} onClick={() => setForm(f => ({ ...f, specialty: item.id }))}
                  style={{ display: 'block', width: '100%', marginBottom: 8, background: active ? item.color + '22' : T.surface, border: `1px solid ${active ? item.color : T.border}`, borderRadius: 10, color: active ? item.color : T.text, padding: '12px 16px', textAlign: 'left', fontSize: 15, fontWeight: active ? 700 : 400, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  {item.label}
                </button>
              );
            })}
          </div>
          {!tournee && (
            <div>
              <div style={{ ...s.label, color: T.muted, marginBottom: 10 }}>NOMBRE DE LITS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <button onClick={() => setForm(f => ({ ...f, bedCount: Math.max(1, f.bedCount - 1) }))}
                  style={{ ...s.btn(C), width: 48, height: 48, fontSize: 24, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ color: T.text, fontSize: 26, fontWeight: 700, minWidth: 50, textAlign: 'center' }}>{form.bedCount}</span>
                <button onClick={() => setForm(f => ({ ...f, bedCount: Math.min(80, f.bedCount + 1) }))}
                  style={{ ...s.btn(C), width: 48, height: 48, fontSize: 24, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          )}
          {tournee ? (
            <div style={{ ...s.card, padding: 14, background: sp.color + '0d', border: `1px solid ${sp.color}33` }}>
              <div style={{ color: sp.color, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {form.specialty === 'tournee_had' ? '🏠 Hospitalisation à Domicile' : '🚗 Tournée infirmière libérale'}
              </div>
              <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>
                Liste de patients ordonnée · Cotation NGAP intégrée · Validation des visites avec horodatage
              </div>
            </div>
          ) : (
            <div style={{ ...s.card, padding: 14 }}>
              <div style={{ ...s.label, color: T.muted, marginBottom: 10 }}>CHAMPS ({previewFields.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {previewFields.map(f => (
                  <span key={f.id} style={{ background: sp.color + '1a', border: `1px solid ${sp.color}44`, borderRadius: 6, color: sp.color, fontSize: 12, padding: '3px 8px' }}>{f.label}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleCreate} disabled={!form.name.trim() || saving}
            style={{ ...s.btn(C), width: '100%', padding: '15px', fontSize: 16, fontWeight: 700, opacity: form.name.trim() && !saving ? 1 : 0.4 }}>
            {saving ? 'Enregistrement…' : 'Créer le service'}
          </button>
        </div>
      </div>
    );
  }

  // ── Liste ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: T.bg, position: 'absolute', inset: 0, overflowY: 'auto', padding: '20px 20px 50px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <div>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 700 }}>Aide-Mémoire</div>
            <div style={{ color: T.muted, fontSize: 11 }}>🔒 Données chiffrées · Secret professionnel</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={openSearch}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, padding: '8px 12px', fontSize: 15, cursor: 'pointer' }}
            title="Rechercher un patient">🔍</button>
          <button onClick={() => setView('create')}
            style={{ ...s.btn(C), width: 40, height: 40, padding: 0, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <button onClick={onImport}
            style={{ background: '#6366f122', border: '1px solid #6366f144', borderRadius: 10, color: '#6366f1', padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📥</button>
        </div>
      </div>

      <div style={{ ...s.card, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>📅</span>
        <span style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {services.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 80 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏥</div>
          <div style={{ color: T.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Aucun service configuré</div>
          <div style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>Appuyez sur + pour commencer</div>
          <button onClick={onImport} style={{ background: '#6366f122', border: '1px solid #6366f144', borderRadius: 12, color: '#6366f1', padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📥 Importer un service
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map(service => {
            const sp = getSpecialty(service.specialty);
            const isDeleting = confirmDelete === service.id;
            return (
              <div key={service.id}>
                <div style={{ background: T.surface, border: `1px solid ${isDeleting ? '#f43f5e44' : T.border}`, borderLeft: `3px solid ${sp.color}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, WebkitTapHighlightColor: 'transparent' }}>
                  {/* Icône spécialité */}
                  <div onClick={() => !isDeleting && onSelectService(service)}
                    style={{ width: 44, height: 44, borderRadius: 10, background: sp.color + '22', border: `1px solid ${sp.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, cursor: 'pointer' }}>
                    {sp.label.split(' ')[0]}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => !isDeleting && onSelectService(service)}>
                    <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>{service.name}</div>
                    <div style={{ color: T.muted, fontSize: 13 }}>
                      {sp.label.slice(sp.label.indexOf(' ') + 1)}
                      {isTournee(service.specialty) ? ' · Itinérant' : ` · ${service.bedCount} lits`}
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  {!isDeleting ? (
                    <button onClick={() => setConfirmDelete(service.id)}
                      style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                      title="Supprimer">🗑</button>
                  ) : (
                    <span style={{ color: T.muted, fontSize: 20, flexShrink: 0 }}>›</span>
                  )}
                </div>

                {/* Confirmation suppression inline */}
                {isDeleting && (
                  <div style={{ background: '#f43f5e11', border: '1px solid #f43f5e33', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '12px 16px' }}>
                    <div style={{ color: T.text, fontSize: 13, marginBottom: 10 }}>
                      Supprimer <strong>{service.name}</strong> ? Les données patients seront conservées.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: '9px', fontSize: 13, cursor: 'pointer' }}>
                        Annuler
                      </button>
                      <button onClick={() => handleDelete(service.id)}
                        style={{ flex: 1, background: '#f43f5e', border: 'none', borderRadius: 8, color: '#fff', padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Overlay recherche globale ── */}
      {showSearch && (
        <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 200, display: 'flex', flexDirection: 'column' }}>

          {/* Header recherche */}
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: T.bg }}>
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Initiales, chambre, motif…"
              style={{ ...s.input, flex: 1, boxSizing: 'border-box', fontSize: 15 }}
            />
            {searchQuery.length > 0 && (
              <button onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Résultats */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 40px' }}>

            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted, fontSize: 13 }}>Chargement des patients…</div>
            )}

            {!searchLoading && !searchQuery.trim() && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: T.muted }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Rechercher un patient</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Par initiales, numéro de lit ou motif d'admission</div>
              </div>
            )}

            {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.muted, fontSize: 13 }}>
                Aucun patient trouvé pour « {searchQuery.trim()} »
              </div>
            )}

            {searchResults.map(({ service, patient, bedLabel: bed }) => {
              const sp = getSpecialty(service.specialty);
              return (
                <div
                  key={`${service.id}_${patient.id}`}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    if (onSearchNavigate) {
                      onSearchNavigate(service, patient.id);
                    } else {
                      onSelectService(service);
                    }
                  }}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${sp.color}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: T.muted, fontSize: 11, fontWeight: 700, minWidth: 60 }}>🛏 {bed}</span>
                    <span style={{ color: T.text, fontSize: 15, fontWeight: 800 }}>{patient.initials}</span>
                    <span style={{ color: T.muted, fontSize: 12 }}>{patient.gender} {patient.age}a</span>
                    <span style={{ marginLeft: 'auto', color: sp.color, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{service.name}</span>
                  </div>
                  {patient.admissionReason && (
                    <div style={{ color: T.muted, fontSize: 12, marginLeft: 68 }}>
                      {patient.admissionReason.length > 60 ? patient.admissionReason.slice(0, 60) + '…' : patient.admissionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
