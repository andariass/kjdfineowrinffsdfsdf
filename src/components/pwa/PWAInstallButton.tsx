import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'compact' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Variant for top navigation bar or compact header
  if (variant === 'header') {
    if (!isInstallable && !isIOS) return null;

    return (
      <>
        <button
          id="btn-pwa-install-header"
          type="button"
          onClick={isIOS ? () => setShowIOSGuide(true) : handleInstallClick}
          disabled={installing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 active:bg-white/30 rounded-full transition-all border border-white/20 backdrop-blur-sm ${className}`}
          title="Pasang Aplikasi CIMB Cash Plus ke Skrin Utama"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Pasang App</span>
        </button>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Variant for compact button
  if (variant === 'compact') {
    if (!isInstallable && !isIOS) return null;

    return (
      <>
        <button
          id="btn-pwa-install-compact"
          type="button"
          onClick={isIOS ? () => setShowIOSGuide(true) : handleInstallClick}
          disabled={installing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-red-600" />
          <span>{installing ? 'Memasang...' : 'Pasang App'}</span>
        </button>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Primary banner/button
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install-primary"
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7F1416] via-[#E31B23] to-[#B8141B] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{installing ? 'Memproses Pemasangan...' : 'Pasang Aplikasi (PWA)'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 transition ${className}`}
        >
          <Smartphone className="w-4 h-4 text-red-600" />
          <span>Pasang di iPhone / iPad</span>
        </button>

        {showIOSGuide && (
          <IOSInstallGuideModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  return null;
};

const IOSInstallGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#E31B23]" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Pasang di iOS Safari</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 text-[#E31B23] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <p>
              Ketik butang <strong>Kongsi (Share)</strong> <Share2 className="inline w-3.5 h-3.5 text-blue-600 mx-0.5" /> di bahagian bar bawah Safari.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 text-[#E31B23] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <p>
              Tatal ke bawah dan pilih <strong>Tambah ke Skrin Utama (Add to Home Screen)</strong> <PlusSquare className="inline w-3.5 h-3.5 text-gray-700 mx-0.5" />.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 text-[#E31B23] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <p>
              Ketik <strong>Tambah (Add)</strong> di penjuru atas kanan. Aplikasi CIMB Cash Plus sedia digunakan seperti aplikasi natif!
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            Faham & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
