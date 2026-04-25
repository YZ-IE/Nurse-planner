/**
 * favorites.js — Gestion des favoris sous-menus
 * Format : [{ mod, toolId, label, icon, color }]
 */

const KEY = 'fav_tools';

export function loadFavs() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    // Valider la structure — évite les crashes si le format a changé
    if (!Array.isArray(data)) return [];
    return data.filter(f =>
      f && typeof f === 'object' &&
      typeof f.mod    === 'string' &&
      typeof f.toolId === 'string' &&
      typeof f.label  === 'string' &&
      typeof f.icon   === 'string' &&
      typeof f.color  === 'string'
    );
  } catch { return []; }
}

export function saveFavs(favs) {
  localStorage.setItem(KEY, JSON.stringify(favs));
}

export function isFav(mod, toolId) {
  return loadFavs().some(f => f.mod === mod && f.toolId === toolId);
}

export function toggleFav({ mod, toolId, label, icon, color }) {
  const favs = loadFavs();
  const idx  = favs.findIndex(f => f.mod === mod && f.toolId === toolId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ mod, toolId, label, icon, color });
  }
  saveFavs(favs);
  return [...favs];
}
