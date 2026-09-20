import React, { useState, useEffect } from 'react';
import { Download, Bell, X, Sparkles, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getPushPermissionStatus } from '../../lib/pushNotifications';
import { PWAPushSettingsModal } from './PWAPushSettingsModal';

export const PWABanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('cimb_pwa_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('cimb_pwa_banner_dismissed', 'true');
  };

  // If already installed and push is granted or dismissed, hide
  const pushStatus = getPushPermissionStatus();
  if (dismissed || (isInstalled && pushStatus === 'granted')) {
    return <PWAPushSettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />;
  }

  // Show banner if installable, or iOS, or push not yet granted
  return (
    <>
      <div
        id="pwa-floating-banner"
        className="mx-4 mt-3 mb-2 rounded-2xl bg-gradient-to-r from-[#7F1416] via-[#B8141B] to-[#E31B23] p-3 text-white shadow-lg border border-red-700/50 flex items-center justify-between gap-3 animate-fade-in"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
            {isInstallable || isIOS ? (
              <Download className="w-4 h-4 text-white" />
            ) : (
              <Bell className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold truncate">Pasang CIMB Cash Plus</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-[10px] font-semibold rounded-full shrink-0">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-white/85 truncate">
              Akses pantas & notifikasi kelulusan pinjaman masa nyata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-open-pwa-modal"
            type="button"
            onClick={() => {
              if (isInstallable || isIOS) {
                window.dispatchEvent(new CustomEvent('cimb-open-pwa-first-prompt'));
              } else {
                setModalOpen(true);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-[#7F1416] hover:bg-gray-100 active:scale-95 transition shadow-sm"
          >
            {isInstallable || isIOS ? 'Pasang' : 'Tetapan'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-white/70 hover:text-white rounded-lg"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PWAPushSettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
