import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Kandungan baru sedia ada. Mengemas kini aplikasi...');
  },
  onOfflineReady() {
    console.log('[PWA] Aplikasi sedia berfungsi di luar talian (Offline Ready).');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
