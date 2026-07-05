import { useState } from 'react';
import { isFav, toggleFav } from '../../favorites.js';
import { loadDarkPref } from '../../theme.js';

export default function StarButton({ mod, toolId, label, icon, color, onFavChange }) {
  const [fav, setFav] = useState(() => isFav(mod, toolId));

  function handleToggle(e) {
    e.stopPropagation();
    toggleFav({ mod, toolId, label, icon, color });
    setFav(f => !f);
    if (onFavChange) onFavChange();
  }

  const dark = loadDarkPref();
  const inactiveColor = dark ? '#2E3D55' : '#C8D3E5';

  return (
    <button
      onClick={handleToggle}
      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{
        background: 'none', border: 'none',
        color: fav ? '#FBBF24' : inactiveColor,
        fontSize: 19, cursor: 'pointer',
        width: 44, height: 44, margin: '-12px -10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'color 0.15s, transform 0.15s',
        transform: fav ? 'scale(1.1)' : 'scale(1)',
        WebkitTapHighlightColor: 'transparent',
      }}
      title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {fav ? '⭐' : '☆'}
    </button>
  );
}
