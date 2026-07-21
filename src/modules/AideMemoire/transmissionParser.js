/**
 * transmissionParser.js — Aide-Mémoire
 *
 * Fonctions PURES (aucun accès disque/réseau/DOM) pour transformer le texte
 * brut reconnu par l'OCR d'une feuille de transmission en une liste de
 * candidats patients : { room, name, age, reason }.
 *
 * Principe non négociable : un champ non détecté reste `null`.
 * On ne devine JAMAIS une valeur absente — l'écran de revue (côté UI)
 * est le seul endroit où l'utilisateur complète ce que l'OCR a manqué.
 *
 * Le layout des feuilles de transmission varie énormément d'un service à
 * l'autre : c'est pourquoi ce parseur reste volontairement simple
 * (regex + heuristiques) plutôt que de chercher l'exhaustivité — il ne fait
 * que proposer une première extraction, jamais une vérité.
 */

const ROOM_LABEL_RE   = /\b(?:chambre|chb|salle|lit|box|room|bed|ch)\.?\s*n?°?\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-]{0,5})\b/i;
const ROOM_ONLY_RE     = /^(?:ch\.?|chb\.?|n°|no?\.?)?\s*(\d{1,4}[a-zA-Z]?)\s*[:\-]?$/i;

const NAME_LABEL_RE   = /^(?:nom|patient|pt|nom\s*\/\s*pr[eé]nom)\s*[:\-]\s*(.+)$/i;
const AGE_LABEL_RE    = /^(?:age|âge)\s*[:\-]\s*(\d{1,3})/i;
const REASON_LABEL_RE = /^(?:motif|diagnostic|dx|raison|entr[eé]e\s*pour)\s*[:\-]\s*(.+)$/i;

const AGE_INLINE_RE     = /(\d{1,3})\s*(?:ans?\b|a\b)/i;
const REASON_KEYWORD_RE = /(?:motif|diagnostic|dx|raison|pour|suite\s*à)\s*[:\-]?\s*(.+)$/i;

/**
 * Détecte un marqueur de chambre en tête de ligne et renvoie sa valeur ainsi
 * que le reste de la ligne (souvent le nom/âge/motif tiennent sur la même
 * ligne que la chambre) — ce reste est remis dans le flux pour être traité
 * comme une ligne libre normale, jamais perdu.
 */
function matchRoomMarker(line) {
  const labelMatch = line.match(ROOM_LABEL_RE);
  if (labelMatch) {
    const room = labelMatch[1].trim();
    const remainder = (line.slice(0, labelMatch.index) + line.slice(labelMatch.index + labelMatch[0].length))
      .replace(/^[\s:,\-–]+/, '')
      .trim();
    return { room, remainder };
  }
  const onlyMatch = line.match(ROOM_ONLY_RE);
  if (onlyMatch) return { room: onlyMatch[1].trim(), remainder: '' };
  return null;
}

/**
 * Découpe le texte brut en blocs — un bloc = un patient.
 * Ancrage : le numéro de chambre, seul champ garanti présent sur toute
 * feuille de transmission quel que soit le layout.
 */
function splitIntoBlocks(lines) {
  const blocks = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const marker = matchRoomMarker(line);
    if (marker) {
      current = { room: marker.room, lines: [] };
      blocks.push(current);
      if (marker.remainder) current.lines.push(marker.remainder);
      continue;
    }
    if (!current) {
      // Aucune chambre encore détectée : on ouvre un bloc "sans chambre"
      // pour ne perdre aucune information (chambre restera null).
      current = { room: null, lines: [] };
      blocks.push(current);
    }
    current.lines.push(line);
  }
  return blocks;
}

/**
 * Heuristique "champs combinés sur une même ligne" :
 * ex. "DUPONT Jean, 45 ans, fracture du fémur"
 * N'écrase jamais un champ déjà trouvé via un libellé explicite.
 */
function extractFromFreeLine(line, found) {
  let rest = line;

  if (found.age === null) {
    const ageMatch = rest.match(AGE_INLINE_RE);
    if (ageMatch) {
      found.age = Number(ageMatch[1]);
      rest = (rest.slice(0, ageMatch.index) + rest.slice(ageMatch.index + ageMatch[0].length)).trim();
    }
  }

  if (found.reason === null) {
    const reasonMatch = rest.match(REASON_KEYWORD_RE);
    if (reasonMatch && reasonMatch[1].trim()) {
      found.reason = reasonMatch[1].trim();
      rest = rest.slice(0, reasonMatch.index).trim();
    }
  }

  // Segments restants (séparateurs courants) : premier = nom probable,
  // dernier = motif probable si aucun mot-clé n'a permis de le repérer.
  const segments = rest.split(/\s*[,;]\s*|\s+[-–]\s+/).map(s => s.trim()).filter(Boolean);

  if (segments.length > 0) {
    if (found.name === null) {
      found.name = segments[0];
      segments.shift();
    }
    if (found.reason === null && segments.length > 0) {
      found.reason = segments[segments.length - 1];
    }
  }
}

/**
 * Parse le texte brut OCR d'une feuille de transmission.
 * @param {string} rawText
 * @returns {Array<{ room: string|null, name: string|null, age: number|null, reason: string|null }>}
 */
export function parseTransmissionSheet(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines  = rawText.split(/\r?\n/);
  const blocks = splitIntoBlocks(lines);

  return blocks.map(block => {
    const found = { room: block.room, name: null, age: null, reason: null };
    const freeLines = [];

    for (const line of block.lines) {
      const nameM = line.match(NAME_LABEL_RE);
      if (nameM) { found.name = nameM[1].trim(); continue; }

      const ageM = line.match(AGE_LABEL_RE);
      if (ageM) { found.age = Number(ageM[1]); continue; }

      const reasonM = line.match(REASON_LABEL_RE);
      if (reasonM) { found.reason = reasonM[1].trim(); continue; }

      freeLines.push(line);
    }

    for (const line of freeLines) extractFromFreeLine(line, found);

    return found;
  }).filter(entry => entry.room !== null || entry.name !== null || entry.age !== null || entry.reason !== null);
}

/**
 * Dérive des initiales pseudonymisées à partir d'un nom complet détecté par
 * l'OCR. Le nom complet lui-même n'est JAMAIS persisté (cf. politique de
 * pseudonymisation de l'app) — seules ces initiales sont proposées comme
 * valeur par défaut, modifiable par l'utilisateur en écran de revue.
 * @param {string|null} fullName
 * @returns {string}
 */
export function nameToInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return `${tokens[0][0].toUpperCase()}.`;
  const first = tokens[0][0].toUpperCase();
  const last  = tokens[tokens.length - 1][0].toUpperCase();
  return `${first}.${last}`;
}
