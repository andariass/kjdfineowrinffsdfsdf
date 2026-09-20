import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLiveChat } from '../context/LiveChatContext';
import { cimbApi } from '../api/cimbApi';
import { formatMYR } from '../config/loan';
import {
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  LogOut,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Trash2,
  WalletCards,
  Lock,
  Calendar,
  User,
  CheckCircle2,
  Edit2,
  Save,
  X,
  MapPin,
  HeartHandshake,
  Clock,
  ArrowRight,
  Headphones,
  BellRing,
  Smartphone,
  Download,
} from 'lucide-react';
import { PWAPushSettingsModal } from '../components/pwa/PWAPushSettingsModal';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getPushPermissionStatus, sendTestNotification } from '../lib/pushNotifications';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, logout, updateUserData, isKycComplete, isBankComplete } = useAuth();
  const { openLiveChat, unreadCount } = useLiveChat();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Email editing state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  // PIN check state
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  // PWA & Push state
  const [showPwaModal, setShowPwaModal] = useState(false);
  const { isInstalled, isInstallable, isIOS } = usePWAInstall();
  const pushPermission = getPushPermissionStatus();

  useEffect(() => {
    if (user?.email !== undefined) {
      setEmailInput(user.email || '');
    }
  }, [user?.email]);

  useEffect(() => {
    let isMounted = true;
    if (session) {
      cimbApi.checkPin({ phone: session.phone, password: session.password }).then((res) => {
        if (isMounted && res.success) {
          setHasPin(Boolean(res.has_pin));
        }
      }).catch(() => {
        // ignore error silently
      });
    }
    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleSaveEmail = async () => {
    setIsSavingEmail(true);
    setEmailNotice(null);
    const trimmed = emailInput.trim();
    const res = await updateUserData({ email: trimmed || null });
    setIsSavingEmail(false);
    if (res.success) {
      setIsEditingEmail(false);
      setEmailNotice('Emel berjaya dikemaskini.');
      setTimeout(() => setEmailNotice(null), 3000);
    } else {
      setEmailNotice(res.error || 'Gagal mengemaskini emel.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (!session) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await cimbApi.delete({
        phone: session.phone,
        password: session.password,
      });
      if (res.success) {
        logout();
        navigate('/auth', { replace: true });
      } else {
        setDeleteError('error' in res ? res.error : 'Gagal memadam akaun.');
        setIsDeleting(false);
      }
    } catch {
      setDeleteError('Ralat sambungan semasa memadam akaun.');
      setIsDeleting(false);
    }
  };

  const kycDone = isKycComplete();
  const bankDone = isBankComplete();

  const formattedJoinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ms-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-4 space-y-4">
      {/* User Identity & Account Card (Schema: name, phone, email, role, created_at) */}
      <div className="bg-[#FFFFFF] p-5 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-3.5">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-[16px] bg-[#FDEBEC] border border-red-200 flex items-center justify-center text-[#E31B23] font-black text-xl shadow-2xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-[#17181B] tracking-tight truncate">
                {user?.name || 'Pengguna CIMB'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F7F8] text-[#686B73] border border-[#E4E5E8] shrink-0">
                {user?.role === 'admin' ? 'Admin' : 'Pelanggan'}
              </span>
            </div>
            <p className="text-xs text-[#686B73] flex items-center mt-0.5">
              <Phone className="w-3.5 h-3.5 mr-1 text-[#686B73] shrink-0" />
              <span className="font-mono">{user?.phone}</span>
            </p>
          </div>
        </div>

        {/* Email & Registration Date Fields */}
        <div className="pt-2.5 border-t border-[#E4E5E8] space-y-2 text-xs">
          {/* Email row with inline edit */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 text-[#686B73] shrink-0">
              <Mail className="w-3.5 h-3.5" />
              <span>Emel:</span>
            </div>
            {!isEditingEmail ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-[#17181B] truncate text-right">
                  {user?.email || <span className="text-slate-400 italic">Belum Ditetapkan</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  className="p-1 text-slate-400 hover:text-[#E31B23] transition-colors"
                  aria-label="Kemaskini emel"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 max-w-[210px]">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full h-7 px-2 text-xs bg-slate-50 border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#E31B23]"
                />
                <button
                  type="button"
                  disabled={isSavingEmail}
                  onClick={handleSaveEmail}
                  className="p-1.5 bg-[#E31B23] text-white rounded-[6px] hover:bg-[#B5121B] disabled:opacity-50"
                  aria-label="Simpan emel"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={isSavingEmail}
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmailInput(user?.email || '');
                  }}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-[6px] hover:bg-slate-200"
                  aria-label="Batal"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {emailNotice && (
            <p className="text-[11px] text-emerald-700 font-medium text-right">
              {emailNotice}
            </p>
          )}

          {formattedJoinedDate && (
            <div className="flex items-center justify-between text-[#686B73]">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Ahli Sejak:</span>
              </div>
              <span className="font-medium text-[#17181B]">{formattedJoinedDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial & Balance Summary Card (Schema: balance, loan_amount, loan_status, loan_approved_amount) */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WalletCards className="w-4 h-4 text-[#E31B23]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Ringkasan Kewangan & Baki
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEBEC] text-[#E31B23] border border-red-200">
            Akaun CIMB CashPlus
          </span>
        </div>

        <div className="p-3 bg-[#F7F7F8] rounded-[12px] border border-[#E4E5E8] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#686B73] block">
              Baki Tersedia
            </span>
            <span className="text-lg font-black text-[#17181B] tracking-tight mt-0.5 block">
              {formatMYR(user?.balance || 0)}
            </span>
          </div>
          <button
            type="button"
            id="btn-profile-withdraw"
            onClick={() => navigate('/withdraw')}
            className="px-3.5 py-2 bg-[#E31B23] hover:bg-[#B5121B] active:scale-95 text-white text-xs font-bold rounded-[10px] shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <span>Tarik Tunai</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs text-[#686B73] pt-0.5">
          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span>Status Pinjaman:</span>
            <span className="font-bold text-[#17181B]">
              {user?.loan_status || 'Tiada Permohonan'}
            </span>
          </div>
          {user?.loan_status === 'Approved' && (
            <>
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
                <span>Jumlah Pembiayaan Diluluskan:</span>
                <span className="font-bold text-emerald-700">
                  {formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Ansuran Bulanan:</span>
                <span className="font-bold text-[#E31B23]">
                  {formatMYR(user?.loan_monthly_installment || 0)} /bln ({user?.loan_tenure_months} Bulan)
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KYC Status & Details Section (Schema: 19 KYC columns) */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className={`w-4 h-4 ${kycDone ? 'text-[#16834B]' : 'text-[#B86E00]'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Pengesahan Identiti (KYC)
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              kycDone
                ? 'bg-emerald-100 text-[#16834B]'
                : user?.kyc_status === 'under_review' || user?.kyc_status === 'submitted'
                ? 'bg-amber-100 text-[#B86E00]'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {kycDone
              ? 'Lengkap & Sah'
              : user?.kyc_status === 'under_review'
              ? 'Dalam Semakan'
              : user?.kyc_status === 'submitted'
              ? 'Dihantar'
              : 'Belum Lengkap'}
          </span>
        </div>

        {/* Detailed KYC Information Display if data is present */}
        {user?.kyc_identity_mykad_number ? (
          <div className="space-y-2.5 text-xs">
            <div className="bg-[#F7F7F8] p-3 rounded-[12px] border border-[#E4E5E8] space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-[#686B73]">Nama Penuh MyKad:</span>
                <span className="font-bold text-[#17181B] text-right truncate">
                  {user.kyc_identity_full_name || user.name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#686B73]">No. Pengenalan ({user.kyc_identity_id_type || 'MyKad'}):</span>
                <span className="font-mono font-bold text-[#17181B]">
                  {user.kyc_identity_mykad_number}
                </span>
              </div>
              {(user.kyc_identity_gender || user.kyc_identity_date_of_birth) && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#686B73]">Jantina / Tarikh Lahir:</span>
                  <span className="font-medium text-[#17181B]">
                    {[user.kyc_identity_gender, user.kyc_identity_date_of_birth].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
              {user.kyc_identity_nationality && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#686B73]">Warganegara:</span>
                  <span className="font-medium text-[#17181B]">{user.kyc_identity_nationality}</span>
                </div>
              )}
            </div>

            {/* Address Line */}
            {user.kyc_address_line && (
              <div className="p-2.5 bg-slate-50 rounded-[10px] border border-[#E4E5E8] flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#686B73] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-[#17181B]">
                  <span className="text-[#686B73] block text-[10px] uppercase font-bold">Alamat Surat-Menyurat:</span>
                  {[user.kyc_address_line, user.kyc_postcode, user.kyc_city, user.kyc_state, user.kyc_country].filter(Boolean).join(', ')}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {user.kyc_emergency_contact_name && (
              <div className="p-2.5 bg-slate-50 rounded-[10px] border border-[#E4E5E8] flex items-start gap-2">
                <HeartHandshake className="w-3.5 h-3.5 text-[#686B73] shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-[#17181B] flex-1">
                  <span className="text-[#686B73] block text-[10px] uppercase font-bold">Kontak Kecemasan (Waris):</span>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{user.kyc_emergency_contact_name} ({user.kyc_emergency_contact_relationship || 'Waris'})</span>
                    <span className="font-mono text-[#686B73]">{user.kyc_emergency_contact_phone}</span>
                  </div>
                </div>
              </div>
            )}

            {user.kyc_verification_verified_at && (
              <div className="text-[10px] text-emerald-700 flex items-center gap-1 pt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Disahkan oleh Admin pada {new Date(user.kyc_verification_verified_at).toLocaleDateString('ms-MY')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#686B73] leading-relaxed">
            Sila lengkapkan maklumat kad pengenalan MyKad, swafoto, dan kontak kecemasan anda untuk pengesahan kredit.
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate('/kyc')}
          className="text-[11px] font-bold text-[#E31B23] hover:text-[#B5121B] flex items-center pt-1"
        >
          <span>{kycDone ? 'Kemaskini Maklumat KYC' : 'Lengkapkan KYC Sekarang'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* Bank Account Section (Schema: bank_name, bank_account_name, bank_account_number) */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className={`w-4 h-4 ${bankDone ? 'text-blue-600' : 'text-[#B86E00]'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Akaun Bank Pengkreditan
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              bankDone
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-[#B86E00]'
            }`}
          >
            {bankDone ? 'Telah Didaftarkan' : 'Wajib Diisi'}
          </span>
        </div>

        <p className="text-xs text-[#686B73] leading-relaxed">
          {bankDone
            ? `${user?.bank_name} • ${user?.bank_account_number} (${user?.bank_account_name})`
            : 'Akaun bank diperlukan supaya dana pinjaman atau pengeluaran dapat disalurkan terus.'}
        </p>

        <button
          type="button"
          onClick={() => navigate('/bank/complete')}
          className="text-[11px] font-bold text-[#E31B23] hover:text-[#B5121B] flex items-center pt-1"
        >
          <span>{bankDone ? 'Tukar / Kemaskini Akaun Bank' : 'Daftar Akaun Bank'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* Security & PIN Section (Schema: pin, sanitized) */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              PIN Keselamatan Transaksi
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasPin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {hasPin ? 'PIN Ditetapkan' : 'Belum Ditetapkan'}
          </span>
        </div>

        <p className="text-xs text-[#686B73] leading-relaxed">
          6-digit PIN keselamatan digunakan untuk mengesahkan setiap permohonan pengeluaran tunai ke akaun bank anda.
        </p>

        <button
          type="button"
          onClick={() => navigate('/withdraw')}
          className="text-[11px] font-bold text-[#E31B23] hover:text-[#B5121B] flex items-center pt-1"
        >
          <span>{hasPin ? 'Tukar / Tetapkan Semula PIN' : 'Cipta PIN 6-Digit'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* Admin Review Console Shortcut - ONLY visible if user.role === 'admin' */}
      {user?.role === 'admin' && (
        <div className="bg-[#17181B] text-white rounded-[16px] p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Konsol Pentadbir (Admin Review)
              </h3>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              Admin Sahaja
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Urus semakan permohonan pinjaman, aktifkan akaun, jana bil DuitNow/Pindahan Bank, dan semak pengesahan bayaran.
          </p>
          <button
            type="button"
            id="btn-profile-to-admin"
            onClick={() => navigate('/admin')}
            className="w-full h-[44px] px-3 bg-white/10 hover:bg-white/20 active:scale-[0.99] text-white text-xs font-bold rounded-[12px] border border-white/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Buka Konsol Pentadbir</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      )}

      {/* Khidmat Pelanggan & Live Chat Section */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Headphones className="w-4 h-4 text-[#E31B23]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Bantuan & Live Chat CIMB
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Pegawai Aktif (Realtime)
          </span>
        </div>

        <p className="text-xs text-[#686B73] leading-relaxed">
          Hubungi pegawai khidmat pelanggan kami secara langsung (Realtime WebSocket) untuk sebarang pertanyaan berkaitan pembiayaan peribadi, status permohonan, atau pengeluaran akaun anda.
        </p>

        <button
          type="button"
          id="btn-profile-open-livechat"
          onClick={openLiveChat}
          className="w-full h-[44px] px-3 bg-[#FDEBEC] hover:bg-[#F9D5D7] active:scale-[0.99] text-[#E31B23] border border-red-200 text-xs font-bold rounded-[12px] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
        >
          <Headphones className="w-4 h-4" />
          <span>Mulakan Live Chat Sekarang</span>
          {unreadCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#E31B23] text-white text-[10px] font-black animate-pulse">
              {unreadCount} baru
            </span>
          )}
        </button>
      </div>

      {/* PWA & Push Notifications Card */}
      <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E4E5E8] p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-[#E31B23]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Aplikasi (PWA) & Notifikasi Push
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isInstalled
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isInstalled ? 'Aplikasi Terpasang' : 'Pelayar Web'}
          </span>
        </div>

        <p className="text-xs text-[#686B73] leading-relaxed">
          Pasang aplikasi CIMB Cash Plus ke skrin utama anda untuk akses pantas dan terima notifikasi push secara masa nyata mengenai status pinjaman dan bayaran.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {!isInstalled && (
            <div className="space-y-2">
              <PWAInstallButton className="w-full" />
              <button
                type="button"
                id="btn-reopen-first-install-prompt"
                onClick={() => {
                  localStorage.removeItem('cimb_pwa_first_open_dismissed_v1');
                  window.dispatchEvent(new CustomEvent('cimb-open-pwa-first-prompt'));
                }}
                className="w-full h-[38px] px-3 bg-red-50/70 hover:bg-red-50 text-[#E31B23] border border-red-200 text-xs font-semibold rounded-[10px] transition flex items-center justify-center space-x-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Buka Dialog Pasang (Prompt Skrin Utama)</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-profile-pwa-settings"
              onClick={() => setShowPwaModal(true)}
              className="flex-1 h-[42px] px-3 bg-gray-50 hover:bg-gray-100 active:scale-[0.99] text-gray-800 border border-gray-200 text-xs font-bold rounded-[12px] transition flex items-center justify-center space-x-2"
            >
              <BellRing className="w-3.5 h-3.5 text-[#E31B23]" />
              <span>Tetapan Notifikasi Push</span>
            </button>

            <button
              type="button"
              id="btn-profile-test-push"
              onClick={() => {
                sendTestNotification().catch(() => setShowPwaModal(true));
              }}
              title="Hantar Notifikasi Ujian"
              className="h-[42px] px-3.5 bg-red-50 hover:bg-red-100 active:scale-[0.99] text-[#E31B23] border border-red-200 text-xs font-bold rounded-[12px] transition flex items-center justify-center"
            >
              <span>Uji Push</span>
            </button>
          </div>
        </div>
      </div>

      <PWAPushSettingsModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />

      {/* Logout Action */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          id="btn-logout"
          onClick={handleLogout}
          className="w-full h-[52px] px-4 bg-[#FFFFFF] hover:bg-[#FDEBEC] active:scale-[0.99] text-[#D92D20] font-bold rounded-[12px] text-xs border border-[#E4E5E8] hover:border-red-200 transition-all flex items-center justify-center space-x-2 shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Keluar dari Akaun</span>
        </button>

        <button
          type="button"
          id="btn-delete-account"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 px-4 text-slate-400 hover:text-[#D92D20] text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Padam Akaun Saya</span>
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#D92D20]">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm">Padam Akaun Anda?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Adakah anda pasti untuk memadam akaun CIMB CashPlus anda? Semua data profil, permohonan pinjaman, dan rekod bil anda akan dipadamkan secara kekal.
            </p>
            {deleteError && (
              <p className="text-[11px] text-[#D92D20] font-medium bg-red-50 p-2 rounded-lg">
                {deleteError}
              </p>
            )}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteAccount()}
                className="flex-1 py-2 px-3 bg-[#D92D20] hover:bg-[#B5121B] text-white font-bold rounded-xl text-xs disabled:opacity-50"
              >
                {isDeleting ? 'Memadam...' : 'Ya, Padam'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

