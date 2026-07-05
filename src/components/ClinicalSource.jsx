/**
 * ClinicalSource.jsx — Affiche la source et date d'un contenu clinique.
 * Conformité MDR art. 10.
 */
import { CLINICAL_SOURCES } from '../clinicalVersion.js';
import { T, tk } from '../theme.js';

export function ClinicalSource({ sourceKey }) {
  const src = CLINICAL_SOURCES[sourceKey];
  if (!src) return null;
  return (
    <div style={{ borderTop:`1px solid ${T.border}`, marginTop:16, paddingTop:10,
      display:'flex', alignItems:'flex-start', gap:6 }}>
      <span style={{ fontSize:tk.font.sm, color:T.muted, flexShrink:0 }}>📚</span>
      <div>
        <div style={{ fontSize:tk.font.xs, color:T.muted, lineHeight:1.5 }}>
          {src.ref} · Rév. {src.updated}
        </div>
        {src.note && <div style={{ fontSize:tk.font.xs, color:T.warning, marginTop:2, fontWeight:600 }}>⚠️ {src.note}</div>}
      </div>
    </div>
  );
}
