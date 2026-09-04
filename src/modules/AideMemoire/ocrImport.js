/**
 * ocrImport.js — Aide-Mémoire
 * Reconnaissance de texte 100% locale (Tesseract.js + wasm + données de langue
 * embarquées dans public/tesseract). Aucune requête réseau, aucune photo ne
 * quitte l'appareil.
 *
 * L'écriture manuscrite reste peu fiable pour un OCR généraliste : ceci sert
 * de PRÉ-REMPLISSAGE à vérifier, jamais de lecture automatique de confiance.
 * Deux renforts sans données d'entraînement :
 *   - relecture ciblée en "chiffres seuls" des colonnes n° de lit / âge
 *   - correction floue des mots-clés métier contre un lexique connu
 */

import { createWorker } from 'tesseract.js';

const NUMERIC_RE = /^\d{2,4}$/;

const WORKER_OPTIONS = {
  workerPath: 'tesseract/worker.min.js',
  corePath: 'tesseract/core/tesseract-core-simd-lstm.wasm.js',
  langPath: 'tesseract/lang-data',
  gzip: true,
};

// ─── Worker réutilisable (une passe page entière + passes ciblées chiffres) ──

export async function createOcrWorker(onProgress) {
  return createWorker('fra', 1, { ...WORKER_OPTIONS, logger: onProgress || (() => {}) });
}

export async function recognizePage(worker, dataUrl) {
  const { data } = await worker.recognize(dataUrl, {}, { text: true, tsv: true });
  return { text: data.text || '', words: parseTsvWords(data.tsv || '') };
}

/**
 * Relit une zone rectangulaire de l'image en forçant un jeu de caractères
 * "chiffres uniquement" — bien plus fiable que la passe pleine page pour les
 * colonnes qu'on sait numériques (n° de lit, âge).
 */
export async function recognizeDigits(worker, dataUrl, rect) {
  await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
  try {
    const { data } = await worker.recognize(dataUrl, { rectangle: rect }, { text: true });
    return (data.text || '').replace(/\D/g, '');
  } finally {
    await worker.setParameters({ tessedit_char_whitelist: '' });
  }
}

// Conservé pour compatibilité (une passe = un worker jetable)
export async function runOcr(dataUrl, onProgress) {
  const worker = await createOcrWorker(onProgress);
  try {
    return await recognizePage(worker, dataUrl);
  } finally {
    await worker.terminate();
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

// ─── Détection des lignes "lit" ──────────────────────────────────────────────

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Regroupe les mots reconnus en lignes (par proximité verticale), repère la
 * colonne "N° de lit" (colonne numérique la plus à gauche, répétée sur
 * plusieurs lignes) et la colonne "Age" (colonne numérique suivante), puis
 * relève quelques mots-clés par ligne. Heuristique — à vérifier ligne par
 * ligne, pas une lecture fiable du tableau. Chaque ligne renvoie aussi la
 * bbox des tokens n° de lit / âge pour une relecture ciblée en chiffres.
 */
export function detectBedRows(words) {
  const goodWords = words.filter(w => w.conf >= 35 && w.text.trim());
  if (goodWords.length === 0) return [];

  const binWidth = 40; // px — échelle de la photo compressée (~1600px de large)
  const numericBins = new Map();
  for (const w of goodWords) {
    if (!NUMERIC_RE.test(w.text)) continue;
    const key = Math.round(w.x0 / binWidth);
    if (!numericBins.has(key)) numericBins.set(key, []);
    numericBins.get(key).push(w);
  }
  const candidateBins = [...numericBins.entries()]
    .filter(([, ws]) => ws.length >= 3)
    .sort((a, b) => median(a[1].map(w => w.x0)) - median(b[1].map(w => w.x0)));

  const bedX = candidateBins[0] ? median(candidateBins[0][1].map(w => w.x0)) : null;
  const ageX = candidateBins[1] ? median(candidateBins[1][1].map(w => w.x0)) : null;
  if (bedX === null) return []; // pas de colonne numérique répétée détectée

  const sorted = [...goodWords].sort((a, b) => a.y0 - b.y0);
  const heights = sorted.map(w => w.y1 - w.y0).filter(h => h > 0);
  const medHeight = heights.length ? median(heights) : 20;

  const bands = [];
  let current = null;
  for (const w of sorted) {
    const yc = (w.y0 + w.y1) / 2;
    if (!current || yc - current.yc > medHeight * 1.4) {
      current = { yc, words: [] };
      bands.push(current);
    }
    current.words.push(w);
    current.yc = (current.yc * (current.words.length - 1) + yc) / current.words.length;
  }

  const rows = [];
  for (const band of bands) {
    const bedCand = band.words.find(w => NUMERIC_RE.test(w.text) && Math.abs(w.x0 - bedX) < binWidth * 1.5);
    if (!bedCand) continue;
    const ageCand = ageX !== null
      ? band.words.find(w => NUMERIC_RE.test(w.text) && Math.abs(w.x0 - ageX) < binWidth * 1.5)
      : null;
    const lineText = band.words.map(w => w.text).join(' ');
    const { patch, correctedText } = extractKeywords(lineText);
    rows.push({
      bedNumber: bedCand.text, age: ageCand ? ageCand.text : '', rawText: correctedText,
      bedBox: { left: bedCand.x0, top: bedCand.y0, width: bedCand.x1 - bedCand.x0, height: bedCand.y1 - bedCand.y0 },
      ageBox: ageCand ? { left: ageCand.x0, top: ageCand.y0, width: ageCand.x1 - ageCand.x0, height: ageCand.y1 - ageCand.y0 } : null,
      ...patch,
    });
  }
  return rows;
}
