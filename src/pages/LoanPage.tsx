import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMYR } from '../config/loan';
import { BillCard } from '../components/bill/BillCard';
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  WalletCards,
} from 'lucide-react';

export const LoanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isKycComplete, isBankComplete } = useAuth();
  const [billTab, setBillTab] = useState<'active' | 'inactive' | 'paid'>('active');

  const handleApplyClick = () => {
    // Flow: LoanPage -> Bank incomplete -> Complete Bank -> Save -> Confirmation -> Apply Loan
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

  const loanStatus = user?.loan_status;
  const isLoanActive = Boolean(loanStatus === 'Approved' && user?.loan_is_active);

  const bills = user?.bills || [];
  // Active Bills: unpaid + is_active = true (or pending confirmation)
  const activeBills = bills.filter((b) => (b.status === 'unpaid' || b.status === 'pending') && b.is_active);
  // Inactive Bills: unpaid + is_active = false
  const inactiveBills = bills.filter((b) => b.status === 'unpaid' && !b.is_active);
  // Paid Bills: status = paid and is_active = true
  const paidBills = bills.filter((b) => b.status === 'paid');

  return (
    <div className="p-4 space-y-4">
      {/* 1. NEVER APPLIED FOR LOAN */}
      {!loanStatus && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] p-6 rounded-[16px] border border-[#E4E5E8] text-center space-y-3 shadow-2xs">
            <div className="w-14 h-14 rounded-[16px] bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto">
              <Banknote className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#17181B]">
              Tiada Permohonan Pinjaman Aktif
            </h3>
            <p className="text-xs text-[#686B73] max-w-xs mx-auto leading-relaxed">
              Anda belum membuat sebarang permohonan pembiayaan peribadi CIMB Cash Plus. Mohon sekarang untuk kelulusan pantas.
            </p>
            <div className="pt-2">
              <button
                type="button"
                id="btn-loan-page-apply"
                onClick={handleApplyClick}
                className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <span>Mohon Pinjaman Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. UNDER REVIEW */}
      {loanStatus === 'Under Review' && (
        <div className="space-y-4">
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

            {/* OCTO Timeline Tracker */}
            <div className="p-3 bg-amber-50/70 rounded-[12px] border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#17181B] px-1">
                <div className="flex items-center space-x-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dihantar</span>
                </div>
                <div className="h-0.5 flex-1 bg-amber-300 mx-2" />
                <div className="flex items-center space-x-1.5 text-[#B86E00]">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Semakan Kredit</span>
                </div>
                <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
                <div className="flex items-center space-x-1.5 text-[#686B73]">
                  <span className="w-3.5 h-3.5 rounded-full border border-[#686B73] flex items-center justify-center text-[9px]">3</span>
                  <span>Kelulusan</span>
                </div>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed px-1">
                Permohonan pembiayaan anda telah diterima dan sedang dinilai oleh pegawai kredit CIMB. Keputusan rasmi akan dikemaskini dalam talian.
              </p>
            </div>

            <div className="bg-[#F7F7F8] p-3.5 rounded-[12px] border border-[#E4E5E8] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                <span className="text-[#686B73]">Jumlah Dipohon:</span>
                <span className="font-bold text-[#17181B]">{formatMYR(user?.loan_applied_amount || user?.loan_amount || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                <span className="text-[#686B73]">Tempoh Dipohon:</span>
                <span className="font-bold text-[#17181B]">{user?.loan_tenure_months || 0} Bulan</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                <span className="text-[#686B73]">Anggaran Ansuran:</span>
                <span className="font-bold text-[#E31B23]">{formatMYR(user?.loan_monthly_installment || 0)} /bln</span>
              </div>
              {user?.loan_total_payable ? (
                <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                  <span className="text-[#686B73]">Anggaran Jumlah Bayaran:</span>
                  <span className="font-bold text-[#17181B]">{formatMYR(user.loan_total_payable)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-1">
                <span className="text-[#686B73]">Akaun Bank:</span>
                <span className="font-medium text-[#17181B]">{user?.bank_name} ({user?.bank_account_number})</span>
              </div>
              {user?.updated_at && (
                <div className="flex justify-between pt-1 border-t border-[#E4E5E8]/60 text-[11px] text-[#686B73]">
                  <span>Tarikh Kemaskini:</span>
                  <span>{new Date(user.updated_at).toLocaleDateString('ms-MY')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. REJECTED */}
      {loanStatus === 'Rejected' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-red-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-[#D92D20] shrink-0" />
              <h3 className="text-sm font-bold text-[#D92D20]">
                Permohonan Pinjaman Ditolak
              </h3>
            </div>

            <div className="p-3.5 bg-[#FDEBEC] rounded-[12px] border border-red-200 text-xs space-y-1">
              <span className="font-bold text-[#D92D20] block">Status Permohonan: Ditolak (Rejected)</span>
              <p className="text-red-800 leading-relaxed">
                Permohonan pembiayaan terdahulu anda tidak berjaya diluluskan. Anda boleh membuat permohonan semula dengan mengubah jumlah atau tempoh pinjaman di bawah.
              </p>
            </div>

            <div className="bg-[#F7F7F8] p-3 rounded-[12px] border border-[#E4E5E8] text-xs space-y-1.5 text-[#686B73]">
              <div className="flex justify-between">
                <span>Permohonan Terdahulu:</span>
                <span className="font-semibold text-[#17181B]">{formatMYR(user?.loan_applied_amount || user?.loan_amount || 0)} ({user?.loan_tenure_months} Bulan)</span>
              </div>
              <p className="text-[11px] text-[#686B73] pt-1">
                Anda boleh melaraskan jumlah atau tempoh pinjaman dan membuat permohonan semula pada bila-bila masa.
              </p>
            </div>

            {/* Reapply Button Requirement */}
            <button
              type="button"
              id="btn-reapply-loan"
              onClick={() => navigate('/loan/apply')}
              className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Mohon Semula Pinjaman</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. APPROVED BUT NOT ACTIVE */}
      {loanStatus === 'Approved' && !user?.loan_is_active && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-blue-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-[#16834B] shrink-0" />
              <h3 className="text-sm font-bold text-[#17181B]">
                Permohonan Pinjaman Diluluskan
              </h3>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-[12px] border border-blue-200 text-xs text-blue-900 space-y-1">
              <span className="font-bold block">Menunggu Pengaktifan Akaun:</span>
              <p className="text-blue-800 leading-relaxed">
                Tahniah! Permohonan anda telah diluluskan. Pentadbir CIMB sedang memproses pengaktifan pinjaman dan jadual pembayaran bil ansuran anda.
              </p>
            </div>

            <div className="bg-[#F7F7F8] p-3.5 rounded-[12px] border border-[#E4E5E8] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                <span className="text-[#686B73]">Jumlah Diluluskan:</span>
                <span className="font-bold text-[#17181B]">{formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4E5E8]">
                <span className="text-[#686B73]">Tempoh Bayaran:</span>
                <span className="font-bold text-[#17181B]">{user?.loan_tenure_months || 0} Bulan</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#686B73]">Ansuran Bulanan:</span>
                <span className="font-black text-[#E31B23]">{formatMYR(user?.loan_monthly_installment || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. APPROVED & ACTIVE LOAN */}
      {isLoanActive && (
        <div className="space-y-4">
          {/* Loan Details & Activation Status */}
          <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#16834B] animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
                  Status Pengaktifan: <span className="text-[#16834B]">Aktif</span>
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#16834B] border border-emerald-200">
                Akaun Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E4E5E8]">
              <div className="bg-[#F7F7F8] p-3 rounded-[12px]">
                <span className="text-[10px] text-[#686B73] uppercase font-semibold block">Jumlah Pinjaman</span>
                <span className="text-base font-black text-[#17181B]">
                  {formatMYR(user?.loan_approved_amount || user?.loan_amount || 0)}
                </span>
              </div>
              <div className="bg-[#FDEBEC] p-3 rounded-[12px] border border-red-100">
                <span className="text-[10px] text-[#B5121B] uppercase font-semibold block">Ansuran Bulanan</span>
                <span className="text-base font-black text-[#E31B23]">
                  {formatMYR(user?.loan_monthly_installment || 0)}
                </span>
              </div>
            </div>

            <div className="bg-[#F7F7F8] p-3 rounded-[12px] border border-[#E4E5E8] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#686B73]">Tempoh Bayaran:</span>
                <span className="font-semibold text-[#17181B]">{user?.loan_tenure_months} Bulan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#686B73]">Kadar Faedah:</span>
                <span className="font-semibold text-[#16834B]">{user?.loan_interest_rate || 6.00}% setahun</span>
              </div>
              {user?.loan_total_interest ? (
                <div className="flex justify-between">
                  <span className="text-[#686B73]">Jumlah Faedah:</span>
                  <span className="font-semibold text-[#17181B]">{formatMYR(user.loan_total_interest)}</span>
                </div>
              ) : null}
              {user?.loan_total_payable ? (
                <div className="flex justify-between">
                  <span className="text-[#686B73]">Jumlah Perlu Dibayar:</span>
                  <span className="font-bold text-[#E31B23]">{formatMYR(user.loan_total_payable)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-0.5 border-t border-[#E4E5E8]/60">
                <span className="text-[#686B73]">Akaun Bank:</span>
                <span className="font-semibold text-[#17181B]">{user?.bank_name} ({user?.bank_account_number})</span>
              </div>
              {user?.updated_at && (
                <div className="flex justify-between text-[11px] text-[#686B73]">
                  <span>Tarikh Kemaskini:</span>
                  <span>{new Date(user.updated_at).toLocaleDateString('ms-MY')}</span>
                </div>
              )}
            </div>

            {/* Quick Withdrawal CTA */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-loan-withdraw-cta"
                onClick={() => navigate('/withdraw')}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-[#E31B23] hover:from-red-700 hover:to-[#CF171E] active:scale-[0.99] text-white font-bold rounded-[12px] text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <WalletCards className="w-4 h-4 text-amber-300" />
                <span>Ajukan Pengeluaran Tunai (Withdrawal)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BILLS SECTION */}
          {/* Rule: If loan_is_active = true AND tidak ada bill: tampilkan "Bill sedang diproses" */}
          {bills.length === 0 ? (
            <div className="p-6 bg-[#FFFFFF] rounded-[16px] border border-dashed border-[#E4E5E8] text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-[#B86E00] flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-[#17181B]">
                Bill sedang diproses
              </h4>
              <p className="text-xs text-[#686B73] max-w-xs mx-auto leading-relaxed">
                Jadual bil ansuran bulanan anda sedang dijana oleh sistem CIMB. Tiada tindakan diperlukan buat masa ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Category Tabs: Active Bills, Inactive Bills, Paid Bills */}
              <div className="flex rounded-[12px] bg-[#E4E5E8]/60 p-1 text-xs font-bold">
                <button
                  type="button"
                  id="tab-active-bills"
                  onClick={() => setBillTab('active')}
                  className={`flex-1 py-2 rounded-[10px] transition-all flex items-center justify-center space-x-1.5 ${
                    billTab === 'active'
                      ? 'bg-[#FFFFFF] text-[#E31B23] shadow-xs'
                      : 'text-[#686B73] hover:text-[#17181B]'
                  }`}
                >
                  <span>Active</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billTab === 'active' ? 'bg-[#FDEBEC] text-[#E31B23]' : 'bg-slate-200 text-[#686B73]'}`}>
                    {activeBills.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-inactive-bills"
                  onClick={() => setBillTab('inactive')}
                  className={`flex-1 py-2 rounded-[10px] transition-all flex items-center justify-center space-x-1.5 ${
                    billTab === 'inactive'
                      ? 'bg-[#FFFFFF] text-[#17181B] shadow-xs'
                      : 'text-[#686B73] hover:text-[#17181B]'
                  }`}
                >
                  <span>Inactive</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-[#686B73]">
                    {inactiveBills.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-paid-bills"
                  onClick={() => setBillTab('paid')}
                  className={`flex-1 py-2 rounded-[10px] transition-all flex items-center justify-center space-x-1.5 ${
                    billTab === 'paid'
                      ? 'bg-[#FFFFFF] text-[#16834B] shadow-xs'
                      : 'text-[#686B73] hover:text-[#17181B]'
                  }`}
                >
                  <span>Paid</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billTab === 'paid' ? 'bg-emerald-100 text-[#16834B]' : 'bg-slate-200 text-[#686B73]'}`}>
                    {paidBills.length}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              {billTab === 'active' && (
                <div className="space-y-2.5">
                  {activeBills.length > 0 ? (
                    activeBills.map((b) => <BillCard key={b.id} bill={b} canPay={true} />)
                  ) : (
                    <div className="p-5 bg-[#FFFFFF] rounded-[16px] text-center text-xs text-[#686B73] border border-[#E4E5E8]">
                      Tiada bil aktif yang menunggu bayaran.
                    </div>
                  )}
                </div>
              )}

              {billTab === 'inactive' && (
                <div className="space-y-2.5">
                  {inactiveBills.length > 0 ? (
                    inactiveBills.map((b) => <BillCard key={b.id} bill={b} canPay={false} />)
                  ) : (
                    <div className="p-5 bg-[#FFFFFF] rounded-[16px] text-center text-xs text-[#686B73] border border-[#E4E5E8]">
                      Tiada bil tidak aktif.
                    </div>
                  )}
                </div>
              )}

              {billTab === 'paid' && (
                <div className="space-y-2.5">
                  {paidBills.length > 0 ? (
                    paidBills.map((b) => <BillCard key={b.id} bill={b} canPay={false} />)
                  ) : (
                    <div className="p-5 bg-[#FFFFFF] rounded-[16px] text-center text-xs text-[#686B73] border border-[#E4E5E8]">
                      Belum ada bil yang telah selesai dibayar.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
