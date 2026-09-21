import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLiveChat } from '../context/LiveChatContext';
import { formatMYR } from '../config/loan';
import { BillCard } from '../components/bill/BillCard';
import { isLoanActive } from '../utils/businessRules';
import { extractUserWithdrawals } from '../api/cimbApi';
import { GamificationDashboard } from '../components/gamification/GamificationDashboard';
import { ApplicationStepsBottomSheet } from '../components/loan/ApplicationStepsBottomSheet';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Banknote,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Percent,
  QrCode,
  FileCheck,
  TrendingUp,
  WalletCards,
  Building2,
  Headphones,
  XCircle,
  RefreshCw,
  History,
  ChevronRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isKycComplete, isBankComplete } = useAuth();
  const { openLiveChat, unreadCount } = useLiveChat();
  const [isStepsBottomSheetOpen, setIsStepsBottomSheetOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(1);

  const handleApplyLoanClick = () => {
    if (!isKycComplete()) {
      navigate('/kyc');
      return;
    }
    if (!isBankComplete()) {
      navigate('/bank/complete');
      return;
    }
    navigate('/loan/apply');
  };

  const hasActiveLoan = isLoanActive(user);
  const loanStatus = user?.loan_status;
  const withdrawalsList = extractUserWithdrawals(user);
  const latestWithdrawal = withdrawalsList.length > 0 ? withdrawalsList[0] : null;

  // Filter bills for active loan:
  // "Semua active + unpaid bills. Paid bills tidak ditampilkan di HomePage."
  const bills = user?.bills || [];
  const activeUnpaidBills = bills.filter(
    (b) => (b.status === 'unpaid' || b.status === 'pending') && b.is_active
  );

  return (
    <div className="p-4 space-y-4">
      {/* Account Overview & Balance Bar (Schema-Driven: balance, kyc_status, bank_name) */}
      <div className="bg-white rounded-[18px] p-4 border border-[#E4E5E8] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Avatar'}
                className="w-10 h-10 rounded-full object-cover border border-[#E4E5E8] shadow-2xs shrink-0 bg-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#FDEBEC] text-[#E31B23] font-black text-sm flex items-center justify-center border border-red-100 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] text-[#686B73] block leading-none">Selamat Datang</span>
              <h3 className="text-sm font-bold text-[#17181B] truncate max-w-[170px] leading-tight mt-0.5">
                {user?.name || 'Pengguna CIMB'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate(isKycComplete() ? '/loan' : '/kyc')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all ${
                isKycComplete()
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{isKycComplete() ? 'KYC Sah' : 'KYC Belum Lengkap'}</span>
            </button>
          </div>
        </div>

        {/* Balance & Quick Action */}
        <div className="bg-[#F7F7F8] rounded-[14px] p-3.5 border border-[#E4E5E8] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#686B73] block">
              Baki Akaun CashPlus
            </span>
            <div className="text-xl font-black text-[#17181B] tracking-tight mt-0.5">
              {formatMYR(user?.balance || 0)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-home-quick-withdraw"
              onClick={() => navigate('/withdraw')}
              className="px-3.5 py-2 bg-[#E31B23] hover:bg-[#B5121B] active:scale-95 text-white text-xs font-bold rounded-[10px] shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <WalletCards className="w-3.5 h-3.5" />
              <span>Tarik Tunai</span>
            </button>
          </div>
        </div>

        {/* Bank & Profile Quick Status Bar */}
        <div className="flex items-center justify-between text-[11px] text-[#686B73] pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-[#686B73] shrink-0" />
            <span className="truncate">
              {user?.bank_name ? `${user.bank_name} •••${user.bank_account_number?.slice(-4) || ''}` : 'Akaun Bank: Belum Diisi'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="text-[#E31B23] font-bold shrink-0 hover:underline flex items-center gap-0.5 text-[11px]"
          >
            <span>Profil</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Gamification Quick Snapshot (Skor Disiplin, Streak & Kemajuan Bebas Hutang) */}
      <div
        className="cursor-pointer"
        onClick={() => navigate('/loan')}
        title="Lihat Butiran Gamifikasi & Ansuran"
      >
        <GamificationDashboard user={user} compact={true} />
      </div>

      {/* CASE 1: Tidak ada active loan */}
      {!hasActiveLoan ? (
        <div className="space-y-4">
          {/* Subcase 1A: Under Review */}
          {loanStatus === 'Under Review' ? (
            <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-amber-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B86E00]">
                    Permohonan Sedang Disemak
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B86E00] border border-amber-200">
                  Under Review
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-[12px] border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#17181B]">
                  <div className="flex items-center space-x-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dihantar</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-amber-300 mx-2" />
                  <div className="flex items-center space-x-1 text-[#B86E00]">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Semakan Kredit</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
                  <div className="flex items-center space-x-1 text-[#686B73]">
                    <span className="w-3.5 h-3.5 rounded-full border border-[#686B73] flex items-center justify-center text-[9px]">3</span>
                    <span>Kelulusan</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed pt-1">
                  Permohonan pembiayaan peribadi anda sedang disemak oleh pegawai kredit CIMB.
                </p>
              </div>

              <div className="bg-[#F7F7F8] p-3.5 rounded-[12px] border border-[#E4E5E8] space-y-2 text-xs">
                <div className="flex justify-between py-0.5 border-b border-[#E4E5E8]">
                  <span className="text-[#686B73]">Jumlah Dipohon:</span>
                  <span className="font-bold text-[#17181B]">{formatMYR(user?.loan_applied_amount || user?.loan_amount || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#E4E5E8]">
                  <span className="text-[#686B73]">Tempoh:</span>
                  <span className="font-bold text-[#17181B]">{user?.loan_tenure_months || 0} Bulan</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-[#686B73]">Anggaran Ansuran:</span>
                  <span className="font-bold text-[#E31B23]">{formatMYR(user?.loan_monthly_installment || 0)} /bln</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/loan')}
                className="w-full h-11 bg-white hover:bg-amber-50 text-[#B86E00] border border-amber-300 font-bold rounded-[12px] text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Lihat Butiran Permohonan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : loanStatus === 'Approved' && !user?.loan_is_active ? (
            /* Subcase 1B: Approved but pending activation */
            <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-blue-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16834B]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#16834B]">
                    Permohonan Diluluskan
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Menunggu Pengaktifan
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-[12px] border border-blue-200 text-xs text-blue-900 leading-relaxed">
                Tahniah! Pembiayaan anda telah diluluskan sebanyak <strong>{formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}</strong>. Pentadbir sedang menyiapkan pengaktifan akaun dan jadual ansuran anda.
              </div>

              <button
                type="button"
                onClick={() => navigate('/loan')}
                className="w-full h-11 bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold rounded-[12px] text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Buka Status Pinjaman</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : loanStatus === 'Rejected' ? (
            /* Subcase 1C: Rejected */
            <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-red-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#D92D20]">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Permohonan Ditolak
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#D92D20] border border-red-200">
                  Rejected
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Permohonan pembiayaan terdahulu anda tidak berjaya diluluskan. Anda boleh membuat permohonan semula pada bila-bila masa.
              </p>

              <button
                type="button"
                onClick={() => navigate('/loan/apply')}
                className="w-full h-11 bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold rounded-[12px] text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Mohon Semula Pinjaman</span>
              </button>
            </div>
          ) : (
            /* Subcase 1D: Never applied */
            <>
              {/* Hero Apply Loan Banner */}
              <div className="bg-gradient-to-br from-[#E31B23] via-[#CF171E] to-[#A31017] rounded-[20px] p-5 text-white shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute right-12 top-2 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                      <Sparkles className="w-3 h-3 mr-1 text-amber-200" />
                      CIMB Cash Plus Personal
                    </span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight leading-tight">
                    Dapatkan Tunai Pantas Sehingga RM100,000
                  </h2>
                  <p className="text-white/90 text-xs mt-2 leading-relaxed">
                    Pembiayaan peribadi fleksibel tanpa cagaran dengan kelulusan segera & kadar faedah tetap bermula 4.66% setahun.
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      id="btn-home-apply-loan-cta"
                      onClick={handleApplyLoanClick}
                      className="w-full h-[52px] px-4 bg-white hover:bg-[#FDEBEC] active:scale-[0.99] text-[#E31B23] font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Mohon Pinjaman Sekarang</span>
                      <ArrowRight className="w-4 h-4 text-[#E31B23]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Value Propositions / Key Features */}
              <div className="bg-[#FFFFFF] rounded-[16px] p-4 border border-[#E4E5E8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
                    Kelebihan CIMB Cash Plus
                  </h3>
                  <span className="text-[10px] font-bold text-[#E31B23] bg-[#FDEBEC] px-2 py-0.5 rounded-full">
                    Kadar Tetap
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-[12px] bg-[#F7F7F8] border border-[#E4E5E8] flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#17181B] block">4.66% - 8.56%</span>
                      <span className="text-[11px] text-[#686B73]">Kadar Faedah p.a.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[#F7F7F8] border border-[#E4E5E8] flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#17181B] block">12 - 84 Bulan</span>
                      <span className="text-[11px] text-[#686B73]">Tempoh Ansuran</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[#F7F7F8] border border-[#E4E5E8] flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#17181B] block">DuitNow QR</span>
                      <span className="text-[11px] text-[#686B73]">Bayaran Pantas</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[#F7F7F8] border border-[#E4E5E8] flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#17181B] block">Pantas & Sah</span>
                      <span className="text-[11px] text-[#686B73]">Formula Anuiti</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick 3-Step Process - dilengkapi tombol action untuk membuka BottomSheet */}
              <div
                id="card-application-steps"
                className="bg-[#FFFFFF] rounded-[16px] p-4 border border-[#E4E5E8] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
                    Langkah Permohonan Mudah
                  </h3>
                  <button
                    id="btn-header-open-steps-sheet"
                    type="button"
                    onClick={() => {
                      setSelectedStepIndex(1);
                      setIsStepsBottomSheetOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#E31B23] hover:text-[#B5121B] flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50 active:scale-95 cursor-pointer"
                    title="Buka Panduan Langkah Permohonan"
                  >
                    <span>Lihat Panduan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div
                    id="step-item-1"
                    onClick={() => {
                      setSelectedStepIndex(1);
                      setIsStepsBottomSheetOpen(true);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#F7F7F8] hover:bg-red-50/40 hover:border-red-200 border border-transparent transition-all cursor-pointer group"
                    title="Klik untuk lihat perincian Langkah 1"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        1
                      </div>
                      <div className="text-xs min-w-0">
                        <span className="font-bold text-[#17181B] group-hover:text-[#E31B23] transition-colors block">
                          Pilih Jumlah & Tempoh
                        </span>
                        <span className="text-[11px] text-[#686B73]">
                          Gunakan kalkulator pinjaman anuiti interaktif
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#686B73] group-hover:text-[#E31B23] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>

                  <div
                    id="step-item-2"
                    onClick={() => {
                      setSelectedStepIndex(2);
                      setIsStepsBottomSheetOpen(true);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#F7F7F8] hover:bg-red-50/40 hover:border-red-200 border border-transparent transition-all cursor-pointer group"
                    title="Klik untuk lihat perincian Langkah 2"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        2
                      </div>
                      <div className="text-xs min-w-0">
                        <span className="font-bold text-[#17181B] group-hover:text-[#E31B23] transition-colors block">
                          Sahkan Identiti (KYC) & Bank
                        </span>
                        <span className="text-[11px] text-[#686B73]">
                          Lengkapkan MyKad dan akaun bank pengkreditan
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#686B73] group-hover:text-[#E31B23] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>

                  <div
                    id="step-item-3"
                    onClick={() => {
                      setSelectedStepIndex(3);
                      setIsStepsBottomSheetOpen(true);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#F7F7F8] hover:bg-red-50/40 hover:border-red-200 border border-transparent transition-all cursor-pointer group"
                    title="Klik untuk lihat perincian Langkah 3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        3
                      </div>
                      <div className="text-xs min-w-0">
                        <span className="font-bold text-[#17181B] group-hover:text-[#E31B23] transition-colors block">
                          Kelulusan & Pengkreditan Tunai
                        </span>
                        <span className="text-[11px] text-[#686B73]">
                          Dana disalurkan terus ke akaun bank anda
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#686B73] group-hover:text-[#E31B23] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </div>
                </div>

                {/* Tombol Action Utama Membuka BottomSheet */}
                <button
                  id="btn-open-application-steps-sheet"
                  type="button"
                  onClick={() => {
                    setSelectedStepIndex(1);
                    setIsStepsBottomSheetOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-[#F7F7F8] hover:bg-[#FDEBEC]/60 hover:border-red-200 active:scale-[0.99] border border-[#E4E5E8] rounded-[12px] flex items-center justify-center gap-2 text-xs font-bold text-[#17181B] hover:text-[#E31B23] transition-all cursor-pointer group shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E31B23]" />
                  <span>Panduan Langkah Permohonan Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#686B73] group-hover:text-[#E31B23] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* CASE 2: Active loan */
        <div className="space-y-4">
          {/* Active Loan Summary Card - Enriched with available loan fields */}
          <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16834B] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#16834B]">
                  Pembiayaan Aktif
                </span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F7F7F8] text-[#17181B] border border-[#E4E5E8]">
                {user?.loan_tenure_months || 0} Bulan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E4E5E8]">
              <div className="bg-[#F7F7F8] p-3 rounded-[12px]">
                <span className="text-[10px] text-[#686B73] uppercase font-semibold block">
                  Jumlah Pinjaman
                </span>
                <span className="text-base font-black text-[#17181B]">
                  {formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}
                </span>
              </div>
              <div className="bg-[#FDEBEC] p-3 rounded-[12px] border border-red-100">
                <span className="text-[10px] text-[#B5121B] uppercase font-semibold block">
                  Ansuran Bulanan
                </span>
                <span className="text-base font-black text-[#E31B23]">
                  {formatMYR(user?.loan_monthly_installment || 0)}
                </span>
              </div>
            </div>

            {/* Enriched loan details from available user schema */}
            <div className="bg-[#F7F7F8] p-3 rounded-[12px] border border-[#E4E5E8] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#686B73]">Kadar Faedah:</span>
                <span className="font-semibold text-[#16834B]">
                  {user?.loan_interest_rate || 6.0}% setahun
                </span>
              </div>
              {user?.loan_total_payable ? (
                <div className="flex justify-between">
                  <span className="text-[#686B73]">Jumlah Perlu Dibayar:</span>
                  <span className="font-bold text-[#E31B23]">{formatMYR(user.loan_total_payable)}</span>
                </div>
              ) : null}
              {user?.bank_name && (
                <div className="flex justify-between pt-0.5 border-t border-[#E4E5E8]/60">
                  <span className="text-[#686B73]">Akaun Bank:</span>
                  <span className="font-semibold text-[#17181B] truncate max-w-[180px]">
                    {user.bank_name} {user.bank_account_number ? `(•••${user.bank_account_number.slice(-4)})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ajukan Withdrawal CTA Banner */}
          <div className="bg-gradient-to-r from-red-600 to-[#E31B23] rounded-[16px] p-4 text-white shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <WalletCards className="w-4 h-4 text-amber-300" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                  Pengeluaran Tunai
                </span>
              </div>
              <h4 className="text-sm font-bold truncate">Tarik Dana ke Akaun Bank Anda</h4>
              <p className="text-[11px] text-white/80">Proses pantas dilindungi 6-digit PIN keselamatan.</p>
            </div>
            <button
              type="button"
              id="btn-home-withdraw-cta"
              onClick={() => navigate('/withdraw')}
              className="px-3.5 py-2.5 bg-white hover:bg-red-50 active:scale-95 text-[#E31B23] font-bold text-xs rounded-[10px] shadow-sm shrink-0 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Keluarkan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Bills Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
                Tagihan Ansuran Aktif
              </h3>
              <span className="text-[11px] text-[#686B73] font-medium">
                {activeUnpaidBills.length} Bil Perlu Dibayar
              </span>
            </div>

            {activeUnpaidBills.length > 0 ? (
              <div className="space-y-3">
                {activeUnpaidBills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            ) : (
              /* If active loan but no bill available */
              <div className="p-6 bg-[#FFFFFF] rounded-[16px] border border-dashed border-[#E4E5E8] text-center space-y-2 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-[#17181B]">
                  Bill sedang diproses
                </h4>
                <p className="text-xs text-[#686B73] max-w-xs mx-auto">
                  Pentadbir sedang menyediakan invois tagihan ansuran anda. Bil akan dipaparkan secara automatik di sini apabila sedia.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Latest Withdrawal Status Card - Enriched from available user.withdrawals data */}
      {latestWithdrawal && (
        <div className="bg-white rounded-[16px] p-4 border border-[#E4E5E8] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-[#686B73]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
                Status Pengeluaran Terkini
              </h4>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                latestWithdrawal.status === 'pending'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : latestWithdrawal.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {latestWithdrawal.status === 'pending'
                ? 'Menunggu Kelulusan'
                : latestWithdrawal.status === 'approved'
                ? 'Diluluskan'
                : 'Ditolak'}
            </span>
          </div>

          <div className="p-3 bg-[#F7F7F8] rounded-[12px] flex items-center justify-between text-xs">
            <div>
              <span className="text-sm font-black text-[#17181B] block">
                {formatMYR(latestWithdrawal.amount)}
              </span>
              <span className="text-[11px] text-[#686B73]">
                {latestWithdrawal.bank_name} ({latestWithdrawal.bank_account_number})
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/withdraw')}
              className="text-[#E31B23] font-bold text-xs hover:underline flex items-center gap-0.5"
            >
              <span>Semua Rekod</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Live Chat Support Card (Realtime cimb_livechat & cimb_messages) */}
      <div className="bg-white rounded-[16px] p-4 border border-[#E4E5E8] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-[#17181B] truncate">Khidmat Pelanggan Live Chat</h4>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                Realtime
              </span>
            </div>
            <p className="text-[11px] text-[#686B73] truncate mt-0.5">Tanya soalan tentang pinjaman, baki atau bayaran bil.</p>
          </div>
        </div>

        <button
          type="button"
          id="btn-home-open-livechat"
          onClick={openLiveChat}
          className="px-3 py-2 bg-[#E31B23] hover:bg-[#B5121B] active:scale-95 text-white font-bold text-xs rounded-[10px] shadow-2xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Chat</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white text-[#E31B23] text-[9px] font-black animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Bottom Sheet Panduan Langkah Permohonan */}
      <ApplicationStepsBottomSheet
        isOpen={isStepsBottomSheetOpen}
        onClose={() => setIsStepsBottomSheetOpen(false)}
        onApply={handleApplyLoanClick}
        userKycComplete={isKycComplete()}
        userBankComplete={isBankComplete()}
        initialStep={selectedStepIndex}
      />
    </div>
  );
};
