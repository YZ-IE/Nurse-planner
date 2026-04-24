import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ── Bouton retour Android — enregistrement précoce ─────────────────────────
// Enregistré AVANT React pour que hasListeners() soit true dès le départ.
// L'action réelle est déléguée à window.__backHandler (mis à jour par App.jsx)
window.__backHandler = null;

(async () => {
  try {
    const { App: CapApp } = await import('@capacitor/app');
    await CapApp.addListener('backButton', () => {
      if (typeof window.__backHandler === 'function') {
        window.__backHandler();
      }
    });
  } catch {}
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
