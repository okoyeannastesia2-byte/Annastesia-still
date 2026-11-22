import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { hydrateMeta } from './state/store';
import { migrateOldProgress, requestPersistence } from './storage/db';
import './styles/theme.css';

registerSW({ immediate: true });
requestPersistence();

// Stop iPad Safari's own page pinch-zoom; the canvas handles zoom itself.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

Promise.all([hydrateMeta(), migrateOldProgress()]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
