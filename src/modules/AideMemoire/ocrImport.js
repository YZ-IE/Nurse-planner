/**
 * ocrImport.js — Aide-Mémoire
 * Reconnaissance de texte 100% locale (Tesseract.js + wasm + données de langue
 * embarquées dans public/tesseract). Aucune requête réseau, aucune photo ne
 * quitte l'appareil.
 *
 * L'écriture manuscrite reste peu fiable pour un OCR généraliste : ceci sert
 * de PRÉ-REMPLISSAGE à vérifier, jamais de lecture automatique de confiance.
 *
 * Approche validée sur une vraie feuille de transmission photographiée :
 * une passe "page entière" ne repère quasiment aucun n° de lit de façon
 * fiable (numéros petits, fond parasite autour de la feuille). En revanche,
 * une passe CIBLÉE sur la seule colonne "N° de lit" (chiffres uniquement,
 * segmentation "texte épars") les retrouve correctement dans la grande
 * majorité des cas. La stratégie retenue part donc des n° de lit détectés
 * par cette passe ciblée, et rattache le contexte (âge, mots-clés) trouvé
 * à proximité verticale dans la passe page entière — plutôt que l'inverse.
 */

import { createWorker } from 'tesseract.js';

const WORKER_OPTIONS = {
  workerPath: 'tesseract/worker.min.js',
  corePath: 'tesseract/core/tesseract-core-simd-lstm.wasm.js',
  langPath: 'tesseract/lang-data',
  gzip: true,
};

// Fraction de la largeur de l'image occupée par la colonne "N° de lit" —
// généreuse pour tolérer un cadrage plus ou moins serré de la photo.
const BED_COLUMN_WIDTH_RATIO = 0.18;
const BED_COLUMN_MIN_CONF = 55;

// ─── Worker réutilisable ──────────────────────────────────────────────────────

export async function createOcrWorker(onProgress) {
  return createWorker('fra', 1, { ...WORKER_OPTIONS, logger: onProgress || (() => {}) });
}

export async function recognizePage(worker, dataUrl) {
  const { data } = await worker.recognize(dataUrl, {}, { text: true, tsv: true });
  return { text: data.text || '', words: parseTsvWords(data.tsv || '') };
}

function loadImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Relit uniquement la colonne "N° de lit" (chiffres seuls, texte épars) —
 * bien plus fiable qu'une lecture alphanumérique pleine page pour ces
 * numéros imprimés. Retourne les lits triés de haut en bas.
 */
export async function detectBedNumberColumn(worker, dataUrl) {
  const { width, height } = await loadImageSize(dataUrl);
  await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '11' });
  try {
    const { data } = await worker.recognize(
      dataUrl,
      { rectangle: { left: 0, top: 0, width: Math.round(width * BED_COLUMN_WIDTH_RATIO), height } },
      { text: true, tsv: true },
    );
    return parseTsvWords(data.tsv || '')
      .filter(w => w.conf >= BED_COLUMN_MIN_CONF && /^\d{2,4}$/.test(w.text))
      .map(w => ({ bedNumber: w.text, top: (w.y0 + w.y1) / 2 }))
      .sort((a, b) => a.top - b.top);
  } finally {
    await worker.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' });
  }
}

function parseTsvWords(tsv) {
  const words = [];
  for (const line of tsv.split('\n')) {
    const cols = line.split('\t');
    if (cols.length < 12) continue;
    if (Number(cols[0]) !== 5) continue; // niveau 5 = mot
    const left = Number(cols[6]), top = Number(cols[7]), width = Number(cols[8]), height = Number(cols[9]);
    const conf = Number(cols[10]);
    const text = cols.slice(11).join('\t').trim();
    if (!text || Number.isNaN(left)) continue;
    words.push({ text, conf, x0: left, y0: top, x1: left + width, y1: top + height });
  }
  return words;
}

// ─── Lexique métier + correction floue ───────────────────────────────────────
// Mots isolés, suffisamment distinctifs pour qu'une correction approximative
// ne produise pas de faux positifs sur un mot français courant.

const VOCAB_WORDS = [
  'HBPM', 'Autonome', 'Partielle', 'Totale', 'Zimmer', 'Contact', 'Gouttelettes',
  'Protecteur', 'Sondage', 'Incontinent', 'Continent', 'Allergie', 'Isolement',
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Remplace les mots proches (distance d'édition ≤ 2, ≤1 si mot court) par leur forme du lexique. */
function correctVocab(text) {
  return text.split(/(\s+)/).map(tok => {
    const clean = tok.trim();
    if (clean.length < 4) return tok;
    let best = null, bestDist = Infinity;
    for (const ref of VOCAB_WORDS) {
      const dist = levenshtein(clean.toLowerCase(), ref.toLowerCase());
      if (dist < bestDist) { bestDist = dist; best = ref; }
    }
    const threshold = best && best.length <= 6 ? 1 : 2;
    return best && bestDist > 0 && bestDist <= threshold ? tok.replace(clean, best) : tok;
  }).join('');
}

function extractKeywords(rawText) {
  const text = correctVocab(rawText);
  const patch = {};
  if (/hbpm/i.test(text)) patch.hbpm = true;
  if (/palier\s*3.{0,6}lp|p3\s*lp/i.test(text)) patch.douleur = 'Palier 3 LP';
  else if (/palier\s*3/i.test(text)) patch.douleur = 'Palier 3 sb';
  else if (/palier\s*2/i.test(text)) patch.douleur = 'Palier 2';
  else if (/palier\s*1/i.test(text)) patch.douleur = 'Palier 1';
  if (/autonome/i.test(text)) patch.avq = 'Autonome';
  else if (/aide\s*partielle/i.test(text)) patch.avq = 'Aide partielle';
  else if (/aide\s*totale/i.test(text)) patch.avq = 'Aide totale';
  if (/appui.{0,10}total|total.{0,10}appui/i.test(text)) patch.appui = 'Total';
  else if (/pas\s*d.?appui|non\s*autoris/i.test(text)) patch.appui = 'Non autorisé';
  else if (/partiel/i.test(text)) patch.appui = 'Partiel';
  const jMatch = text.match(/\bJ\s?(\d{1,3})\b/);
  if (jMatch) patch.jPostop = jMatch[1];
  if (/allerg/i.test(text)) patch.allergieFlag = true;
  return { patch, correctedText: text };
}

const DEFAULT_HALF_ROW = 150; // px, utilisé en haut/bas de tableau où il n'y a pas de voisin
const MAX_HALF_ROW = 260; // px — plafond : mieux vaut un contexte incomplet qu'une ligne voisine happée

/**
 * Associe à chaque n° de lit détecté (passe ciblée) le contexte trouvé à
 * proximité verticale dans la passe page entière : âge (nombre isolé le
 * plus proche), mots-clés métier, texte brut de la ligne. La fenêtre de
 * chaque ligne s'arrête à mi-chemin du lit détecté précédent/suivant (et
 * non à une hauteur de ligne moyenne) pour ne pas déborder sur la ligne
 * voisine quand un lit intermédiaire n'a pas été détecté ; elle est en
 * plus plafonnée (MAX_HALF_ROW) pour qu'un grand écart dû à un lit manqué
 * ne fasse pas remonter les données d'un tout autre patient.
 */
export function attachRowContext(bedNumbers, pageWords) {
  if (bedNumbers.length === 0) return [];
  const goodWords = pageWords.filter(w => w.conf >= 35 && w.text.trim());

  return bedNumbers.map(({ bedNumber, top }, i) => {
    const upHalf   = Math.min(MAX_HALF_ROW, i > 0 ? (top - bedNumbers[i - 1].top) / 2 : DEFAULT_HALF_ROW);
    const downHalf = Math.min(MAX_HALF_ROW, i < bedNumbers.length - 1 ? (bedNumbers[i + 1].top - top) / 2 : DEFAULT_HALF_ROW);
    const nearby = goodWords.filter(w => {
      const yc = (w.y0 + w.y1) / 2;
      return yc >= top - upHalf && yc <= top + downHalf;
    });
    const ageCand = nearby.find(w => /^\d{1,3}$/.test(w.text) && w.text !== bedNumber);
    const lineText = nearby.map(w => w.text).join(' ');
    const { patch, correctedText } = extractKeywords(lineText);
    return { bedNumber, age: ageCand ? ageCand.text : '', rawText: correctedText, ...patch };
  });
}
