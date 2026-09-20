import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StandalonePage } from '../components/layout/StandalonePage';
import { SUPPORTED_BANKS } from '../config/loan';
import { Building2, User, CreditCard, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SelectField } from '../components/common/SelectBottomSheet';

export const CompleteBankPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserData, isKycComplete } = useAuth();

  React.useEffect(() => {
    if (user && !isKycComplete()) {
      navigate('/kyc', { replace: true });
    }
  }, [user, isKycComplete, navigate]);

  const [bankName, setBankName] = useState(user?.bank_name || 'CIMB Bank Berhad');
  const [customBank, setCustomBank] = useState('');
  const [accountName, setAccountName] = useState(user?.bank_account_name || user?.name || '');
  const [accountNumber, setAccountNumber] = useState(user?.bank_account_number || '');

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBank = bankName === 'Lain-lain (Nyatakan)' ? customBank.trim() : bankName;

  const handleValidateAndPromptConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) {
      setError('Sila pilih atau nyatakan nama bank anda');
      return;
    }
    if (!accountName.trim()) {
      setError('Sila masukkan nama pemegang akaun bank');
      return;
    }
    if (!accountNumber.trim() || accountNumber.trim().length < 6) {
      setError('Sila masukkan nombor akaun bank yang sah');
      return;
    }

    setError(null);
    setShowConfirmation(true);
  };

  const handleFinalSave = async () => {
    setIsSubmitting(true);
    setError(null);

    const res = await updateUserData({
      bank_name: selectedBank,
      bank_account_name: accountName.trim(),
      bank_account_number: accountNumber.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      // Prompt flow: "Save -> Confirmation -> Apply Loan"
      navigate('/loan/apply', { replace: true });
    } else {
      setShowConfirmation(false);
      setError(res.error || 'Gagal menyimpan maklumat bank. Sila cuba lagi.');
    }
  };

  return (
    <StandalonePage
      title="Maklumat Akaun Bank"
      subtitle="Wajib sebelum permohonan pinjaman"
      fallbackBackUrl="/loan"
      bottomAction={
        <button
          type="button"
          onClick={handleValidateAndPromptConfirm}
          className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>Sahkan & Teruskan ke Permohonan</span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-[12px] flex items-start space-x-2.5 text-blue-900 text-xs">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Wang pembiayaan yang diluluskan akan dikreditkan terus ke akaun bank simpanan / semasa yang didaftarkan di sini.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FDEBEC] border border-red-200 rounded-[12px] flex items-start space-x-2 text-[#D92D20] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleValidateAndPromptConfirm} className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-4">
          <SelectField
            id="bank-name-select"
            label="Nama Bank"
            required
            value={bankName}
            onChange={(val) => setBankName(val)}
            options={[...SUPPORTED_BANKS, 'Lain-lain (Nyatakan)']}
            title="Pilih Bank Penerima"
            subtitle="Pilih bank berlesen di Malaysia untuk pengkreditan pinjaman"
            searchable
            searchPlaceholder="Cari nama bank (cth: CIMB, Maybank)..."
          />

          {bankName === 'Lain-lain (Nyatakan)' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17181B] mb-1.5">
                Nyatakan Nama Bank
              </label>
              <input
                type="text"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="Contoh: Agrobank"
                className="w-full h-[50px] px-3.5 bg-[#F7F7F8] border border-[#E4E5E8] rounded-[12px] text-sm text-[#17181B] focus:bg-white focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23] focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17181B] mb-1.5">
              Nama Pemegang Akaun (seperti dalam buku/penyata bank) *
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#686B73]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="bank-account-name-input"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Contoh: Muhammad Ali"
                className="w-full h-[50px] pl-10 pr-3.5 bg-[#F7F7F8] border border-[#E4E5E8] rounded-[12px] text-sm text-[#17181B] focus:bg-white focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#17181B] mb-1.5">
              Nombor Akaun Bank *
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#686B73]">
                <CreditCard className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="bank-account-number-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 7012345678"
                className="w-full h-[50px] pl-10 pr-3.5 bg-[#F7F7F8] border border-[#E4E5E8] rounded-[12px] text-sm text-[#17181B] focus:bg-white focus:ring-2 focus:ring-[#E31B23]/20 focus:border-[#E31B23] focus:outline-none"
                required
              />
            </div>
            <p className="text-[11px] text-[#686B73] mt-1.5">
              Hanya nombor digit tanpa sengkang (-).
            </p>
          </div>
        </form>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] rounded-[20px] w-full max-w-sm p-5 shadow-2xl border border-[#E4E5E8]">
              <div className="w-10 h-10 rounded-full bg-[#FDEBEC] flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5 text-[#E31B23]" />
              </div>
              <h3 className="text-base font-bold text-[#17181B]">
                Sahkan Butiran Bank Anda
              </h3>
              <p className="text-xs text-[#686B73] mt-1 mb-4 leading-relaxed">
                Sila pastikan maklumat di bawah adalah kepunyaan anda dan masih aktif:
              </p>

              <div className="bg-[#F7F7F8] rounded-[12px] p-3.5 space-y-2 border border-[#E4E5E8] text-xs mb-5">
                <div>
                  <span className="text-[#686B73] block">Bank:</span>
                  <span className="font-bold text-[#17181B]">{selectedBank}</span>
                </div>
                <div>
                  <span className="text-[#686B73] block">Nama Pemegang:</span>
                  <span className="font-bold text-[#17181B]">{accountName}</span>
                </div>
                <div>
                  <span className="text-[#686B73] block">Nombor Akaun:</span>
                  <span className="font-bold text-[#17181B] tracking-wider">{accountNumber}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-confirm-bank-save"
                  onClick={handleFinalSave}
                  disabled={isSubmitting}
                  className="w-full h-[48px] bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold rounded-[12px] text-xs shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <span>Ya, Maklumat Tepat & Teruskan</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                  className="w-full h-[44px] bg-[#F7F7F8] hover:bg-slate-200 text-[#17181B] font-semibold rounded-[12px] text-xs"
                >
                  Semak Semula
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandalonePage>
  );
};
