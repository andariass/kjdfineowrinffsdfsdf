import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLiveChat } from '../context/LiveChatContext';
import { formatMYR } from '../config/loan';
import { BillCard } from '../components/bill/BillCard';
import { isLoanActive } from '../utils/businessRules';
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
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isKycComplete, isBankComplete } = useAuth();
  const { openLiveChat, unreadCount } = useLiveChat();

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
            <div className="w-10 h-10 rounded-full bg-[#FDEBEC] text-[#E31B23] font-black text-sm flex items-center justify-center border border-red-100 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
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

      {/* CASE 1: Tidak ada active loan */}
      {!hasActiveLoan ? (
        <div className="space-y-4">
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
                  className="w-full h-[52px] px-4 bg-white hover:bg-[#FDEBEC] active:scale-[0.99] text-[#E31B23] font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
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

          {/* Quick 3-Step Process */}
          <div className="bg-[#FFFFFF] rounded-[16px] p-4 border border-[#E4E5E8] shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Langkah Permohonan Mudah
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center space-x-3 p-2.5 rounded-[12px] bg-[#F7F7F8]">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div className="text-xs">
                  <span className="font-bold text-[#17181B] block">Pilih Jumlah & Tempoh</span>
                  <span className="text-[11px] text-[#686B73]">Gunakan kalkulator pinjaman anuiti interaktif</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-[12px] bg-[#F7F7F8]">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div className="text-xs">
                  <span className="font-bold text-[#17181B] block">Sahkan Identiti (KYC) & Bank</span>
                  <span className="text-[11px] text-[#686B73]">Lengkapkan MyKad dan akaun bank pengkreditan</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-[12px] bg-[#F7F7F8]">
                <div className="w-6 h-6 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="text-xs">
                  <span className="font-bold text-[#17181B] block">Kelulusan & Pengkreditan Tunai</span>
                  <span className="text-[11px] text-[#686B73]">Dana disalurkan terus ke akaun bank anda</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 2 & 3: Active loan */
        <div className="space-y-5">
          {/* Active Loan Summary Card */}
          <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-4">
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
              <div>
                <span className="text-[11px] text-[#686B73] uppercase font-semibold block">
                  Jumlah Pinjaman
                </span>
                <span className="text-lg font-black text-[#17181B]">
                  {formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#686B73] uppercase font-semibold block">
                  Ansuran Bulanan
                </span>
                <span className="text-lg font-black text-[#E31B23]">
                  {formatMYR(user?.loan_monthly_installment || 0)}
                </span>
              </div>
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
              className="px-3.5 py-2.5 bg-white hover:bg-red-50 active:scale-95 text-[#E31B23] font-bold text-xs rounded-[10px] shadow-sm shrink-0 flex items-center gap-1 transition-all"
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
    </div>
  );
};
