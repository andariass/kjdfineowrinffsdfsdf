import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StandalonePage } from '../components/layout/StandalonePage';
import {
  ALLOWED_TENURES,
  AllowedTenure,
  TENURE_RATES,
  calculateAnnuity,
  formatMYR,
  MIN_LOAN_AMOUNT,
  MAX_LOAN_AMOUNT,
  DEFAULT_LOAN_AMOUNT,
  DEFAULT_TENURE,
} from '../config/loan';
import {
  Calculator,
  Percent,
  Calendar,
  Building2,
  AlertCircle,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { SelectField, SelectOption } from '../components/common/SelectBottomSheet';

export const ApplyLoanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserData, isKycComplete, isBankComplete } = useAuth();

  useEffect(() => {
    if (user && !isKycComplete()) {
      navigate('/kyc', { replace: true });
      return;
    }
    if (user && !isBankComplete()) {
      navigate('/bank/complete', { replace: true });
      return;
    }
  }, [user, isKycComplete, isBankComplete, navigate]);

  const isReapply = user?.loan_status === 'Rejected';

  // Rule: Reapply: previous amount & tenure become defaults, user can change both
  const initialAmount = (isReapply ? user?.loan_applied_amount || user?.loan_amount : null) || DEFAULT_LOAN_AMOUNT;
  const initialTenure = (isReapply ? user?.loan_tenure_months : null) || DEFAULT_TENURE;

  const [amount, setAmount] = useState<number>(initialAmount);
  const [tenure, setTenure] = useState<AllowedTenure>(
    (ALLOWED_TENURES.includes(initialTenure as any) ? initialTenure : DEFAULT_TENURE) as AllowedTenure
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Centralized Annuity Calculation
  const calculation = useMemo(() => {
    return calculateAnnuity(amount, tenure);
  }, [amount, tenure]);

  const PRESET_AMOUNTS = [5000, 10000, 20000, 35000, 50000, 80000, 100000];

  const loanAmountOptions: SelectOption[] = useMemo(() => {
    const defaultAmounts = [
      5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 60000, 75000, 80000, 90000, 100000,
    ];
    const uniqueSorted = Array.from(new Set([...defaultAmounts, amount])).sort((a, b) => a - b);
    return uniqueSorted.map((amt) => ({
      value: String(amt),
      label: formatMYR(amt),
      description: amt >= 50000 ? 'Pembiayaan tunai eksklusif' : 'Pembiayaan peribadi fleksibel',
    }));
  }, [amount]);

  const tenureOptions: SelectOption[] = useMemo(() => {
    return ALLOWED_TENURES.map((t) => ({
      value: String(t),
      label: `${t} Bulan (${t < 12 ? '0.5 Tahun' : t % 12 === 0 ? `${t / 12} Tahun` : `${(t / 12).toFixed(1)} Tahun`})`,
      description: `Kadar faedah tetap: ${TENURE_RATES[t]}% setahun`,
    }));
  }, []);

  const handleSubmit = async () => {
    if (amount < MIN_LOAN_AMOUNT || amount > MAX_LOAN_AMOUNT) {
      setError(`Jumlah pinjaman mestilah antara ${formatMYR(MIN_LOAN_AMOUNT)} dan ${formatMYR(MAX_LOAN_AMOUNT)}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Save Application -> loan_status = "Under Review"
    const payload = {
      loan_status: 'Under Review' as const,
      loan_amount: amount,
      loan_applied_amount: amount,
      loan_approved_amount: 0,
      loan_tenure_months: tenure,
      loan_monthly_installment: calculation.monthlyInstallment,
      loan_interest: calculation.totalInterest,
      loan_interest_rate: calculation.annualRate,
      loan_total_interest: calculation.totalInterest,
      loan_total_payable: calculation.totalPayable,
      loan_approved: false,
      loan_is_active: false,
    };

    const res = await updateUserData(payload);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/loan', { replace: true });
    } else {
      setError(res.error || 'Gagal menghantar permohonan. Sila cuba lagi.');
    }
  };

  return (
    <StandalonePage
      title={isReapply ? 'Mohon Semula Pinjaman' : 'Permohonan Pinjaman'}
      subtitle="Kadar faedah tetap dengan formula anuiti telus"
      fallbackBackUrl="/loan"
      bottomAction={
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[#686B73] font-medium">Ansuran Bulanan:</span>
            <span className="text-base font-extrabold text-[#E31B23]">
              {formatMYR(calculation.monthlyInstallment)}
              <span className="text-xs font-normal text-[#686B73]"> /bln</span>
            </span>
          </div>
          <button
            type="button"
            id="btn-submit-loan-app"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menghantar Permohonan...</span>
              </span>
            ) : (
              <>
                <span>Hantar Permohonan Pinjaman</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {isReapply && (
          <div className="p-3 bg-[#F7F7F8] border border-[#B86E00]/30 rounded-[12px] text-xs text-[#B86E00] flex items-start space-x-2">
            <Info className="w-4 h-4 text-[#B86E00] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Permohonan Baru:</span>
              <span className="text-[#686B73]">Jumlah dan tempoh sebelum ini telah dimuatkan. Anda boleh mengubah kedua-duanya sebelum menghantar semula.</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#FDEBEC] border border-[#D92D20]/30 rounded-[12px] flex items-start space-x-2 text-[#D92D20] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Amount Selector */}
        <div className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Jumlah Pinjaman (MYR)
            </label>
            <span className="text-xl font-black text-[#E31B23]">
              {formatMYR(amount)}
            </span>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[5000, 10000, 20000, 35000, 50000, 80000, 100000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-2.5 py-1 text-[11px] rounded-full font-bold border transition-all ${
                  amount === preset
                    ? 'bg-[#E31B23] text-white border-[#E31B23] shadow-2xs'
                    : 'bg-[#F7F7F8] text-[#17181B] border-[#E4E5E8] hover:bg-slate-100'
                }`}
              >
                {preset >= 1000 ? `RM${preset / 1000}k` : formatMYR(preset)}
              </button>
            ))}
          </div>

          <input
            type="range"
            id="loan-amount-slider"
            min={MIN_LOAN_AMOUNT}
            max={MAX_LOAN_AMOUNT}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-[#E31B23] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-[#686B73] font-semibold">
            <span>{formatMYR(MIN_LOAN_AMOUNT)}</span>
            <span>{formatMYR(MAX_LOAN_AMOUNT / 2)}</span>
            <span>{formatMYR(MAX_LOAN_AMOUNT)}</span>
          </div>

          <SelectField
            id="select-loan-amount"
            value={String(amount)}
            onChange={(val) => setAmount(Number(val))}
            options={loanAmountOptions}
            title="Pilih Jumlah Pinjaman"
            subtitle="Pilih jumlah pembiayaan peribadi yang diperlukan"
          />
        </div>

        {/* Tenure Selector & Rates */}
        <div className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Tempoh Bayaran
            </label>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FDEBEC] text-[#E31B23]">
              Kadar: {TENURE_RATES[tenure]}% p.a.
            </span>
          </div>

          {/* Tenure Cards Grid */}
          <div className="grid grid-cols-4 gap-2">
            {ALLOWED_TENURES.map((t) => {
              const isSelected = tenure === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenure(t)}
                  className={`p-2 rounded-[12px] border text-center transition-all ${
                    isSelected
                      ? 'border-[#E31B23] bg-[#FDEBEC] text-[#E31B23] font-bold ring-1 ring-[#E31B23]'
                      : 'border-[#E4E5E8] bg-[#F7F7F8] text-[#17181B] hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block">{t} Bulan</span>
                  <span className="text-[10px] text-[#686B73] block">{TENURE_RATES[t]}% p.a.</span>
                </button>
              );
            })}
          </div>

          <SelectField
            id="select-loan-tenure"
            value={String(tenure)}
            onChange={(val) => setTenure(Number(val) as AllowedTenure)}
            options={tenureOptions}
            title="Pilih Tempoh Bayaran"
            subtitle="Kadar faedah tahunan dikira automatik mengikut pilihan tempoh"
          />
        </div>

        {/* Annuity Calculation Breakdown */}
        <div className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-2.5 text-xs">
          <div className="flex items-center space-x-1.5 pb-2 border-b border-[#E4E5E8]">
            <Calculator className="w-4 h-4 text-[#E31B23]" />
            <h4 className="font-bold text-[#17181B] uppercase tracking-wider text-[11px]">
              Ringkasan Formula Anuiti
            </h4>
          </div>

          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span className="text-[#686B73]">Jumlah Pokok (Principal):</span>
            <span className="font-semibold text-[#17181B]">{formatMYR(calculation.amount)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span className="text-[#686B73]">Tempoh Bayaran:</span>
            <span className="font-semibold text-[#17181B]">{calculation.tenureMonths} Bulan ({calculation.tenureMonths / 12} Tahun)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span className="text-[#686B73]">Kadar Faedah Tahunan:</span>
            <span className="font-semibold text-[#16834B]">{calculation.annualRate}% setahun</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span className="text-[#686B73]">Jumlah Faedah Anggaran:</span>
            <span className="font-semibold text-[#17181B]">{formatMYR(calculation.totalInterest)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#E4E5E8]/60">
            <span className="text-[#686B73]">Jumlah Bayaran Keseluruhan:</span>
            <span className="font-bold text-[#17181B]">{formatMYR(calculation.totalPayable)}</span>
          </div>

          <div className="flex justify-between pt-1 text-sm bg-[#FDEBEC]/60 p-3 rounded-[12px] border border-[#E31B23]/20">
            <span className="font-bold text-[#17181B]">Ansuran Bulanan:</span>
            <span className="font-black text-[#E31B23]">{formatMYR(calculation.monthlyInstallment)}</span>
          </div>
        </div>

        {/* Crediting Bank Account Review */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-[16px] border border-[#E4E5E8] shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[12px] bg-[#FDEBEC] flex items-center justify-center text-[#E31B23]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#686B73] font-semibold uppercase block">Akaun Pengkreditan</span>
              <span className="font-bold text-[#17181B]">{user?.bank_name}</span>
              <span className="text-[#686B73] block text-[11px]">{user?.bank_account_number} ({user?.bank_account_name})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/bank/complete')}
            className="text-[#E31B23] font-bold text-[11px] hover:underline"
          >
            Tukar
          </button>
        </div>
      </div>
    </StandalonePage>
  );
};
