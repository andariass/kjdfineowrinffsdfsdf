import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Zap,
  Bell,
  WifiOff,
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const STORAGE_KEY = 'cimb_pwa_first_open_dismissed_v1';

interface PWAFirstOpenModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PWAFirstOpenModal: React.FC<PWAFirstOpenModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // If explicitly forced open via prop, open immediately
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if already installed as standalone app
    if (isInstalled) {
      return;
    }

    // Check if previously dismissed
    const hasDismissed = localStorage.getItem(STORAGE_KEY);
    if (hasDismissed === 'true') {
      return;
    }

    // Auto-prompt on first open with a small delay for smooth page entry
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [forceOpen, isInstalled]);

  // Listen for custom event to re-open modal on demand
  useEffect(() => {
    const handleOpenPrompt = () => {
      setIsOpen(true);
    };

    window.addEventListener('cimb-open-pwa-first-prompt', handleOpenPrompt);
    return () => {
      window.removeEventListener('cimb-open-pwa-first-prompt', handleOpenPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    if (onClose) onClose();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        localStorage.setItem(STORAGE_KEY, 'true');
        setTimeout(() => {
          setIsOpen(false);
          if (onClose) onClose();
        }, 1800);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen || isInstalled) {
    return null;
  }

  return (
    <div
      id="pwa-first-open-overlay"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-labelledby="pwa-first-open-title"
    >
      <div
        id="pwa-first-open-card"
        className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
      >
        {/* Modal Top Accent Header */}
        <div className="relative bg-gradient-to-r from-[#7F1416] via-[#B5121B] to-[#E31B23] p-5 text-white">
          <button
            type="button"
            id="btn-pwa-first-open-close"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-full bg-black/10 hover:bg-black/25 active:bg-black/40 transition"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0 border-2 border-white/30">
              <span className="font-extrabold text-[#E31B23] text-sm tracking-tighter">CIMB</span>
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
                  Aplikasi Rasmi PWA
                </span>
              </div>
              <h2
                id="pwa-first-open-title"
                className="text-lg font-bold tracking-tight text-white mt-0.5 truncate"
              >
                CIMB Cash Plus
              </h2>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-white/90 leading-relaxed">
            Pasang aplikasi terus pada skrin utama telefon anda untuk akses pantas tanpa pelayar web.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {installedSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Pemasangan Berjaya!
              </h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                Aplikasi CIMB Cash Plus kini sedia pada skrin utama peranti anda.
              </p>
            </div>
          ) : (
            <>
              {/* Feature Benefits List */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F7F8] border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-bold text-gray-900">
                      Akses 1-Sentuhan Pantas
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-normal">
                      Buka serta-merta dari skrin telefon tanpa perlu menaip alamat URL pada pelayar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F7F8] border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-bold text-gray-900">
                      Notifikasi Masa Nyata
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-normal">
                      Terima notifikasi segera mengenai kelulusan pinjaman, pengeluaran & tarikh akhir bayaran.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F7F8] border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-bold text-gray-900">
                      Sedia Luar Talian (Offline Ready)
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-normal">
                      Kekal boleh melihat maklumat penting akaun walaupun sambungan internet terputus.
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform Specific Guidance (iOS vs Android/Desktop) */}
              {isIOS ? (
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 space-y-2.5">
                  <div className="flex items-center space-x-2 text-blue-900">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold">Panduan Pasang di iPhone / iPad:</span>
                  </div>
                  <ol className="text-xs text-blue-900 space-y-1.5 pl-1">
                    <li className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <span>Ketik butang <strong>Kongsi (Share)</strong> <Share2 className="inline w-3.5 h-3.5 text-blue-600 mx-0.5" /> pada bar Safari.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <span>Pilih <strong>Tambah ke Skrin Utama</strong> <PlusSquare className="inline w-3.5 h-3.5 text-gray-700 mx-0.5" />.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                      <span>Ketik <strong>Tambah (Add)</strong> di penjuru atas kanan.</span>
                    </li>
                  </ol>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pemasangan percuma, selamat & tidak memakan storan telefon.</span>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions */}
        {!installedSuccess && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row-reverse gap-2.5">
            {isInstallable ? (
              <button
                type="button"
                id="btn-pwa-first-open-install"
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-[#7F1416] via-[#E31B23] to-[#B8141B] text-white font-bold text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Memproses Pemasangan...' : 'Pasang Sekarang'}</span>
              </button>
            ) : isIOS ? (
              <button
                type="button"
                id="btn-pwa-first-open-ios-done"
                onClick={handleDismiss}
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-[#E31B23] text-white font-bold text-xs shadow-md hover:bg-[#B5121B] active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Saya Faham, Tambah Nanti</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-pwa-first-open-ready-install"
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-[#7F1416] via-[#E31B23] to-[#B8141B] text-white font-bold text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Memasang...' : 'Pasang Aplikasi'}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-pwa-first-open-later"
              onClick={handleDismiss}
              className="w-full sm:w-auto h-11 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-200 transition flex items-center justify-center"
            >
              Nanti Dulu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
