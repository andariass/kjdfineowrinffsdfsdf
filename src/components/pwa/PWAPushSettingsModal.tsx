import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Download,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Wifi,
  WifiOff,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  enablePushNotifications,
  unsubscribePushNotifications,
  getPushPermissionStatus,
  sendTestNotification,
  getExistingPushSubscription,
  isPushSupported,
} from '../../lib/pushNotifications';

interface PWAPushSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAPushSettingsModal: React.FC<PWAPushSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkPushState();
    }
  }, [isOpen]);

  const checkPushState = async () => {
    const status = getPushPermissionStatus();
    setPermission(status);
    const sub = await getExistingPushSubscription();
    setHasSubscription(!!sub);
  };

  if (!isOpen) return null;

  const handleTogglePush = async () => {
    setLoading(true);
    setErrorMsg(null);
    setTestStatus(null);
    try {
      if (hasSubscription || permission === 'granted') {
        // Unsubscribe or prompt
        const unsubscribed = await unsubscribePushNotifications();
        if (unsubscribed) {
          setHasSubscription(false);
          setTestStatus('Langganan notifikasi telah dimatikan.');
        } else {
          // Attempt enable
          await enablePushNotifications();
          setHasSubscription(true);
          setPermission('granted');
          setTestStatus('Notifikasi push diaktifkan semula!');
        }
      } else {
        await enablePushNotifications();
        setHasSubscription(true);
        setPermission('granted');
        setTestStatus('Notifikasi push berjaya diaktifkan!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengaktifkan notifikasi push.');
    } finally {
      setLoading(false);
      checkPushState();
    }
  };

  const handleSendTestPush = async () => {
    setLoading(true);
    setErrorMsg(null);
    setTestStatus(null);
    try {
      await sendTestNotification();
      setTestStatus('Notifikasi ujian berjaya dihantar ke peranti anda!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghantar notifikasi ujian. Sila pastikan kebenaran diberikan.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallApp = async () => {
    setLoading(true);
    try {
      await install();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="pwa-push-settings-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="pwa-push-settings-modal"
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-[#E31B23]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Tetapan PWA & Push</h3>
              <p className="text-xs text-gray-500">CIMB Cash Plus Mobile & Web App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {testStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{testStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status Indicators */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70 flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-gray-800">{isOnline ? 'Dalam Talian' : 'Luar Talian'}</p>
              <p className="text-[10px] text-gray-500">Rangkaian Internet</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#E31B23] shrink-0" />
            <div>
              <p className="font-bold text-gray-800">
                {isInstalled ? 'Aplikasi Terpasang' : 'Pelayar Web'}
              </p>
              <p className="text-[10px] text-gray-500">Mod Paparan PWA</p>
            </div>
          </div>
        </div>

        {/* Section 1: Push Notifications */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-600" />
              <span className="text-sm font-bold text-gray-900">Notifikasi Push Masa Nyata</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                permission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : permission === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {permission === 'granted'
                ? 'Aktif'
                : permission === 'denied'
                ? 'Disekat'
                : 'Belum Aktif'}
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Terima makluman serta-merta pada telefon pintar anda apabila permohonan pinjaman diluluskan, pembayaran bil berjaya, atau ejen membalas mesej Live Chat.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              id="btn-toggle-push-permission"
              type="button"
              onClick={handleTogglePush}
              disabled={loading || permission === 'unsupported'}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
                permission === 'granted'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200'
                  : 'bg-[#E31B23] hover:bg-[#C41219] text-white shadow-red-200'
              }`}
            >
              {permission === 'granted' ? (
                <>
                  <BellOff className="w-4 h-4 text-gray-600" />
                  <span>Nyahlanggan / Matikan Push</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  <span>Aktifkan Notifikasi Push</span>
                </>
              )}
            </button>

            {permission === 'granted' && (
              <button
                id="btn-test-push-notification"
                type="button"
                onClick={handleSendTestPush}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-[#E31B23] border border-red-200 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Hantar Notifikasi Ujian Sekarang</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Install PWA to Home Screen */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-red-600" />
              <span className="text-sm font-bold text-gray-900">Pemasangan Aplikasi (PWA)</span>
            </div>
            {isInstalled && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> Terpasang
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Pasang CIMB Cash Plus terus ke skrin utama telefon untuk akses pantas tanpa perlu memuat turun daripada App Store / Play Store.
          </p>

          {!isInstalled && isInstallable && (
            <button
              id="btn-install-pwa-modal"
              type="button"
              onClick={handleInstallApp}
              disabled={loading}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#7F1416] via-[#E31B23] to-[#B8141B] text-white shadow-md hover:shadow-lg transition"
            >
              <Download className="w-4 h-4" />
              <span>Pasang ke Skrin Utama Peranti</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
              <p className="font-semibold mb-1">Pengguna iPhone / Safari:</p>
              <p className="text-[11px] leading-relaxed">
                Ketik ikon <strong>Kongsi (Share)</strong> di bar Safari, kemudian pilih <strong>Tambah ke Skrin Utama (Add to Home Screen)</strong>.
              </p>
            </div>
          )}

          {isInstalled && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Aplikasi sedang beroperasi dalam mod natif standalone.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>PWA Service Worker v3.1</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
