// ─── Thème global N-Planr — Dual Mode avec Proxy ─────────────────────────────
// T et s sont des Proxy → chaque accès lit le mode courant dans localStorage.
// Tous les sous-composants (RCP, AVC, Pansements…) se mettent à jour
// automatiquement sans aucune modification.

const LIGHT = {
  bg:'#F0F3F8', surface:'#FFFFFF', surface2:'#F8FAFD',
  border:'#E4E9F2', border2:'#C8D3E5',
  text:'#0D1117', muted:'#8D97A8',
  iatr:'#F43F5E', urg:'#FF5A35', score:'#7C6FF7',
  soins:'#0099E6', orga:'#1DB96A', form:'#F59E0B', ia:'#38BDF8',
  iatrDim:'#FFF1F4', urgDim:'#FFF2EE', scoreDim:'#F3F2FF',
  soinsDim:'#EAF6FF', orgaDim:'#EDFAF4', formDim:'#FFFBEA', iaDim:'#EAF7FF',
  // Tokens sémantiques de statut — SEULE source pour les états patient/action
  danger:'#DC2626',  dangerDim:'#FDECEC',
  warning:'#EA580C', warningDim:'#FFF0E6',
  success:'#16A34A', successDim:'#E7F7EE',
  info:'#2563EB',    infoDim:'#EBF1FF',
};

const DARK = {
  bg:'#0D1117', surface:'#161C26', surface2:'#1C2333',
  border:'#232D3F', border2:'#2E3D55',
  text:'#F0F4FA', muted:'#7A8FA8',
  iatr:'#F43F5E', urg:'#FF6B47', score:'#8B7FF8',
  soins:'#38B6FF', orga:'#2DD47A', form:'#FBBF24', ia:'#38BDF8',
  iatrDim:'#1F0A10', urgDim:'#1F0E08', scoreDim:'#12102A',
  soinsDim:'#08182A', orgaDim:'#071A10', formDim:'#1C1404', iaDim:'#081824',
  // Tokens sémantiques de statut (variantes claires pour fond sombre)
  danger:'#F87171',  dangerDim:'#2A1215',
  warning:'#FB923C', warningDim:'#2A1708',
  success:'#4ADE80', successDim:'#0B2414',
  info:'#60A5FA',    infoDim:'#0E1B33',
};

// Remplissages pleins (texte blanc lisible dans les deux modes)
export const SOLID = { danger:'#DC2626', warning:'#EA580C', success:'#16A34A', info:'#2563EB' };

// Tokens statiques indépendants du mode
export const tk = {
  font:   { xs:12, sm:13, base:15, md:16, lg:18, xl:20, xxl:22 },
  weight: { reg:400, med:500, semi:600, bold:700, black:800 },
  space:  { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32 },
  radius: { sm:8, md:12, lg:16, xl:20, pill:999 },
  touch:  { min:48, primary:52, input:48, compact:40 }, // compact = exception documentée (lignes denses)
};

export function loadDarkPref() {
  try {
    const stored = localStorage.getItem('nplanr_dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch { return false; }
}
export function saveDarkPref(val) {
  try { localStorage.setItem('nplanr_dark', val ? 'true' : 'false'); } catch {}
}
export function getTheme(dark) { return dark ? DARK : LIGHT; }

// Proxy dynamique — chaque accès lit le mode courant
export const T = new Proxy({}, {
  get(_, key) { return getTheme(loadDarkPref())[key]; },
  set() { return false; },
});

export function makeStyles(dark) {
  const TH = getTheme(dark);
  return {
    card: {
      background:TH.surface, border:`1px solid ${TH.border}`,
      borderRadius:16, padding:'14px', marginBottom:10,
      boxShadow: dark ? 'none' : '0 2px 14px rgba(0,0,0,0.05)',
    },
    label: {
      display:'block', color:TH.muted, fontSize:11,
      fontFamily:'monospace', letterSpacing:1.2,
      marginBottom:5, textTransform:'uppercase',
    },
    input: {
      width:'100%', background:TH.bg, border:`1px solid ${TH.border}`,
      borderRadius:12, padding:'9px 12px', color:TH.text,
      fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit',
    },
    result: (color) => ({
      background:color+'18', border:`1px solid ${color}35`,
      borderRadius:12, padding:'12px 16px', marginTop:12,
    }),
    tag: (color) => ({
      background:color+'20', border:`1px solid ${color}35`, color,
      padding:'3px 10px', borderRadius:20, fontSize:11, fontFamily:'monospace',
    }),
    btn: (color) => ({
      background:color, border:'none', color:'#FFFFFF',
      borderRadius:10, padding:'8px 14px', fontSize:13,
      fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
    }),
  };
}

export const s = new Proxy({}, {
  get(_, key) { return makeStyles(loadDarkPref())[key]; },
  set() { return false; },
});
