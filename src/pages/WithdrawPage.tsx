import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cimbApi, extractUserWithdrawals } from '../api/cimbApi';
import { formatMYR } from '../config/loan';
import { Withdrawal, WithdrawalStatus } from '../types';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  ArrowRight,
  History,
  AlertTriangle,
  RotateCcw,
  Check,
  XCircle,
  Wallet,
  Sparkles,
  ChevronRight,
  Delete,
} from 'lucide-react';

type Step =
  | 'checking_pin'
  | 'set_pin'
  | 'confirm_pin'
  | 'pin_created_success'
  | 'input_amount'
  | 'review'
  | 'verify_pin'
  | 'success_pending';

export const WithdrawPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, refreshUser, isBankComplete } = useAuth();

  // State machine
  const [currentStep, setCurrentStep] = useState<Step>('checking_pin');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // PIN states
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmedPin, setConfirmedPin] = useState('');
  const [verifyPin, setVerifyPin] = useState('');

  // Amount state
  const [amount, setAmount] = useState<number>(1000);
  const [customAmountText, setCustomAmountText] = useState('1000');

  // Async states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedWithdrawal, setLastCreatedWithdrawal] = useState<Withdrawal | null>(null);

  // Available balance (Schema-driven using available user data only)
  const availableBalance = useMemo(() => {
    if (!user) return 0;
    if (typeof user.balance === 'number') return user.balance;
    if (typeof user.loan_approved_amount === 'number') {
      return user.loan_approved_amount;
    }
    if (typeof user.loan_amount === 'number') {
      return user.loan_amount;
    }
    return 0;
  }, [user]);

  // Withdrawals history
  const withdrawalsList = useMemo(() => {
    return extractUserWithdrawals(user);
  }, [user]);

  // Initial check: "Sebelum withdrawal, backend mengecek apakah user sudah memiliki PIN."
  useEffect(() => {
    let isMounted = true;
    const checkUserPin = async () => {
      if (!session) return;
      setCurrentStep('checking_pin');
      setErrorMessage(null);

      try {
        const res = await cimbApi.checkPin({
          phone: session.phone,
          password: session.password,
        });

        if (!isMounted) return;

        if (res.success && res.has_pin) {
          // Rule: "Jika PIN sudah ada → langsung lanjut ke withdrawal (Input Nominal)"
          setCurrentStep('input_amount');
        } else {
          // Rule: "Jika pin belum ada → tampilkan Set PIN terlebih dahulu."
          setCurrentStep('set_pin');
        }
      } catch {
        if (!isMounted) return;
        // Fallback: Check local user object
        if (user?.has_pin) {
          setCurrentStep('input_amount');
        } else {
          setCurrentStep('set_pin');
        }
      }
    };

    void checkUserPin();
    return () => {
      isMounted = false;
    };
  }, [session?.phone]);

  // Handle Numeric Keypad
  const handleKeypadPress = (digit: string, target: 'set' | 'confirm' | 'verify') => {
    setErrorMessage(null);
    if (target === 'set') {
      if (enteredPin.length < 6) {
        const next = enteredPin + digit;
        setEnteredPin(next);
        if (next.length === 6) {
          // Rule: User membuat PIN 6 digit -> lanjut konfirmasi PIN
          setTimeout(() => {
            setCurrentStep('confirm_pin');
          }, 250);
        }
      }
    } else if (target === 'confirm') {
      if (confirmedPin.length < 6) {
        const next = confirmedPin + digit;
        setConfirmedPin(next);
        if (next.length === 6) {
          // Verify match with enteredPin
          if (next === enteredPin) {
            void handleSaveNewPin(next);
          } else {
            setErrorMessage('PIN tidak sepadan. Sila masukkan semula.');
            setTimeout(() => {
              setConfirmedPin('');
              setEnteredPin('');
              setCurrentStep('set_pin');
            }, 1000);
          }
        }
      }
    } else if (target === 'verify') {
      if (verifyPin.length < 6) {
        const next = verifyPin + digit;
        setVerifyPin(next);
        if (next.length === 6) {
          // Rule: Input PIN → Backend Verify PIN
          void handleVerifyAndSubmitWithdrawal(next);
        }
      }
    }
  };

  const handleKeypadBackspace = (target: 'set' | 'confirm' | 'verify') => {
    setErrorMessage(null);
    if (target === 'set') setEnteredPin((prev) => prev.slice(0, -1));
    else if (target === 'confirm') setConfirmedPin((prev) => prev.slice(0, -1));
    else if (target === 'verify') setVerifyPin((prev) => prev.slice(0, -1));
  };

  // Set PIN handler: "User membuat PIN 6 digit dan melakukan konfirmasi PIN. Withdrawal tidak dapat dilanjutkan sebelum PIN berhasil dibuat."
  const handleSaveNewPin = async (finalPin: string) => {
    if (!session) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await cimbApi.setPin({
      phone: session.phone,
      password: session.password,
      pin: finalPin,
      confirm_pin: finalPin,
    });

    setIsSubmitting(false);

    if (res.success) {
      setCurrentStep('pin_created_success');
      await refreshUser();
    } else {
      setErrorMessage(res.error || 'Gagal menyimpan PIN keselamatan.');
      setConfirmedPin('');
      setEnteredPin('');
      setCurrentStep('set_pin');
    }
  };

  // Withdraw submit handler: "Backend Verify PIN. PIN salah -> withdrawal tidak dibuat. PIN benar -> withdrawal dibuat dengan status pending."
  const handleVerifyAndSubmitWithdrawal = async (pinToVerify: string) => {
    if (!session || !user) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await cimbApi.withdraw({
      phone: session.phone,
      password: session.password,
      amount,
      pin: pinToVerify,
    });

    setIsSubmitting(false);

    if (res.success) {
      // Created with status pending!
      const wd: Withdrawal = {
        id: (res.data as any)?.id || `WD-${Date.now()}`,
        type: 'withdrawal',
        amount,
        status: 'pending',
        bank_name: user.bank_name || '-',
        bank_account_number: user.bank_account_number || '-',
        bank_account_name: user.bank_account_name || user.name || '-',
        created_at: new Date().toISOString(),
      };
      setLastCreatedWithdrawal(wd);
      setCurrentStep('success_pending');
      await refreshUser();
    } else {
      // PIN Salah → Withdrawal tidak dibuat!
      setErrorMessage(res.error || 'PIN keselamatan tidak tepat. Sila cuba lagi.');
      setVerifyPin('');
    }
  };

  const handleSelectQuickAmount = (val: number) => {
    setAmount(val);
    setCustomAmountText(String(val));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmountText(raw);
    const num = Number(raw);
    if (!isNaN(num)) setAmount(num);
  };

  // Render keypad helper
  const renderKeypad = (target: 'set' | 'confirm' | 'verify') => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return (
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mt-6">
        {keys.map((k, idx) => {
          if (k === '') {
            return <div key={idx} className="h-14" />;
          }
          if (k === 'del') {
            return (
              <button
                key={idx}
                type="button"
                id={`btn-keypad-del-${target}`}
                onClick={() => handleKeypadBackspace(target)}
                disabled={isSubmitting}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold flex items-center justify-center transition-all disabled:opacity-50"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              type="button"
              id={`btn-keypad-${k}-${target}`}
              onClick={() => handleKeypadPress(k, target)}
              disabled={isSubmitting}
              className="h-14 rounded-2xl bg-white border border-slate-200 hover:border-[#E31B23] hover:bg-red-50/50 active:scale-95 text-xl font-bold text-slate-900 flex items-center justify-center shadow-2xs transition-all disabled:opacity-50"
            >
              {k}
            </button>
          );
        })}
      </div>
    );
  };

  // Render PIN dots
  const renderPinDots = (val: string) => {
    return (
      <div className="flex items-center justify-center gap-3.5 my-4">
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const filled = idx < val.length;
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                filled
                  ? 'bg-[#E31B23] scale-110 shadow-xs'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-withdraw-back"
            onClick={() => {
              if (currentStep === 'confirm_pin') {
                setCurrentStep('set_pin');
                setConfirmedPin('');
              } else if (currentStep === 'review') {
                setCurrentStep('input_amount');
              } else if (currentStep === 'verify_pin') {
                setCurrentStep('review');
                setVerifyPin('');
              } else {
                navigate(-1);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">Pengeluaran Tunai</h1>
            <span className="text-[10px] text-slate-500 font-medium">Withdrawal Flow V1.3</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btn-tab-form"
            onClick={() => setActiveTab('form')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'form'
                ? 'bg-[#FDEBEC] text-[#E31B23]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Permohonan
          </button>
          <button
            type="button"
            id="btn-tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
              activeTab === 'history'
                ? 'bg-[#FDEBEC] text-[#E31B23]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3 h-3" />
            <span>Sejarah</span>
            {withdrawalsList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#E31B23] text-white text-[9px] flex items-center justify-center font-bold">
                {withdrawalsList.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-shake shadow-2xs">
            <AlertCircle className="w-4 h-4 text-[#E31B23] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* TAB 1: FORM WIZARD */}
        {activeTab === 'form' && (
          <>
            {/* 1. CHECKING PIN */}
            {currentStep === 'checking_pin' && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 mt-6">
                <div className="w-12 h-12 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto animate-pulse">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Menyemak Keselamatan Akaun...</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Sistem sedang menyemak status PIN keselamatan 6-digit anda sebelum memproses pengeluaran.
                </p>
              </div>
            )}

            {/* 2A. SET PIN */}
            {currentStep === 'set_pin' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                  Langkah 1: Tetapkan PIN
                </span>
                <h2 className="text-base font-extrabold text-slate-900">Cipta PIN 6-Digit Anda</h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  PIN ini digunakan untuk mengesahkan setiap pengeluaran dana ke akaun bank anda.
                </p>

                {renderPinDots(enteredPin)}
                {renderKeypad('set')}
              </div>
            )}

            {/* 2B. CONFIRM PIN */}
            {currentStep === 'confirm_pin' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto mb-1">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                  Langkah 2: Sahkan PIN
                </span>
                <h2 className="text-base font-extrabold text-slate-900">Sahkan Semula PIN</h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Sila masukkan semula 6 digit PIN yang sama untuk melengkapkan pengesahan.
                </p>

                {renderPinDots(confirmedPin)}
                {renderKeypad('confirm')}
              </div>
            )}

            {/* 2C. PIN CREATED SUCCESS */}
            {currentStep === 'pin_created_success' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs text-center space-y-4 mt-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">PIN Berjaya Dicipta!</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Akaun anda kini dilindungi. Anda boleh meneruskan proses permohonan pengeluaran wang.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-continue-to-withdraw"
                  onClick={() => setCurrentStep('input_amount')}
                  className="w-full h-12 bg-[#E31B23] hover:bg-[#c9151c] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Pengeluaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3. INPUT NOMINAL */}
            {currentStep === 'input_amount' && (
              <div className="space-y-4">
                {/* Available Balance Header Card */}
                <div className="bg-gradient-to-br from-[#17181B] to-[#2B2D33] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Baki Pembiayaan Tersedia
                    </span>
                    <div className="text-2xl font-black mt-1 text-white tracking-tight">
                      {formatMYR(availableBalance)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sedia untuk dikeluarkan terus ke akaun bank anda</span>
                    </div>
                  </div>
                </div>

                {/* Input Nominal Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Jumlah Pengeluaran (RM) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-black text-lg text-slate-400 pointer-events-none">
                        RM
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="input-withdraw-amount"
                        value={customAmountText}
                        onChange={handleCustomAmountChange}
                        className="w-full h-14 pl-14 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black text-slate-900 focus:bg-white focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] focus:outline-none transition-all"
                        placeholder="1,000"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Minimum pengeluaran: RM 50.00
                    </span>
                  </div>

                  {/* Quick Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Pilihan Pantas:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          id={`btn-quick-amount-${val}`}
                          onClick={() => handleSelectQuickAmount(val)}
                          className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
                            amount === val
                              ? 'bg-[#FDEBEC] border-[#E31B23] text-[#E31B23]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          RM {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    id="btn-proceed-review"
                    onClick={() => {
                      if (!amount || amount < 50) {
                        setErrorMessage('Minimum pengeluaran adalah RM 50.00.');
                        return;
                      }
                      setErrorMessage(null);
                      setCurrentStep('review');
                    }}
                    className="w-full h-12 bg-[#E31B23] hover:bg-[#c9151c] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Seterusnya: Semak Maklumat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 4. REVIEW & DATA BANK DARI CIMB_USERS */}
            {currentStep === 'review' && (
              <div className="space-y-4">
                {/* Bank Account Verification Notice */}
                {!isBankComplete() && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">Maklumat Akaun Bank Belum Lengkap</span>
                      <p className="text-[11px] text-amber-800">
                        Sila kemaskini nombor akaun dan nama bank anda terlebih dahulu untuk menerima pengkreditan.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/bank/complete')}
                        className="text-[11px] font-bold text-[#E31B23] underline pt-0.5 inline-block"
                      >
                        Kemaskini Maklumat Bank Sekarang →
                      </button>
                    </div>
                  </div>
                )}

                {/* Bank Card (Data Bank dari cimb_users) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#E31B23]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Akaun Bank Penerima
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Disahkan
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Nama Bank:</span>
                      <span className="font-black text-slate-900">{user?.bank_name || 'CIMB Bank Berhad'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Nombor Akaun:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {user?.bank_account_number || '7012345678'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Pemegang Akaun:</span>
                      <span className="font-bold text-slate-900">{user?.bank_account_name || user?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
                    Ringkasan Transaksi
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Jumlah Dimohon:</span>
                      <span className="font-black text-slate-900">{formatMYR(amount)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Yuran Pemprosesan:</span>
                      <span className="font-semibold text-emerald-600">RM 0.00 (Percuma)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Anggaran Tempoh Kelulusan:</span>
                      <span className="font-semibold text-slate-700">1 - 24 Jam</span>
                    </div>
                    <div className="flex justify-between py-1.5 pt-2">
                      <span className="font-bold text-slate-800">Jumlah Dikreditkan:</span>
                      <span className="font-black text-lg text-[#E31B23]">{formatMYR(amount)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800 block">Peraturan Pengeluaran:</span>
                    <p>
                      Permohonan akan berstatus <strong>Pending</strong> untuk semakan pihak pentadbir.
                      Selepas diluluskan, sistem akan menjana bil ansuran (Unpaid) secara automatik.
                    </p>
                  </div>

                  {/* Proceed to PIN */}
                  <button
                    type="button"
                    id="btn-proceed-verify-pin"
                    onClick={() => {
                      setErrorMessage(null);
                      setVerifyPin('');
                      setCurrentStep('verify_pin');
                    }}
                    className="w-full h-12 bg-[#E31B23] hover:bg-[#c9151c] active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Sahkan & Masukkan PIN</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. INPUT PIN & BACKEND VERIFY PIN */}
            {currentStep === 'verify_pin' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center mx-auto mb-1">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#E31B23]">
                  Pengesahan Akhir
                </span>
                <h2 className="text-base font-extrabold text-slate-900">Masukkan PIN Keselamatan</h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Sahkan pengeluaran tunai sebanyak <strong className="text-slate-900">{formatMYR(amount)}</strong> ke akaun bank anda.
                </p>

                {renderPinDots(verifyPin)}
                {isSubmitting ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <div className="w-7 h-7 border-3 border-[#E31B23]/20 border-t-[#E31B23] rounded-full animate-spin" />
                    <span className="text-xs font-bold text-slate-700">Memverifikasi PIN & Memproses...</span>
                  </div>
                ) : (
                  renderKeypad('verify')
                )}
              </div>
            )}

            {/* 6. SUCCESS PENDING SCREEN */}
            {currentStep === 'success_pending' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs text-center space-y-4 mt-2">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-bounce">
                  <Clock className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
                    Status: Menunggu Kelulusan (Pending)
                  </span>
                  <h2 className="text-lg font-black text-slate-900">Permohonan Pengeluaran Dihantar</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Permohonan anda telah direkodkan dan sedang disemak oleh pihak pentadbir.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID Pengeluaran:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {lastCreatedWithdrawal?.id || 'WD-' + Date.now()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jumlah Dimohon:</span>
                    <span className="font-black text-[#E31B23] text-sm">{formatMYR(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Akaun Bank:</span>
                    <span className="font-medium text-slate-800">
                      {user?.bank_name} ({user?.bank_account_number})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Masa Dihantar:</span>
                    <span className="text-slate-700">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    id="btn-view-history"
                    onClick={() => setActiveTab('history')}
                    className="w-full h-12 bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    <span>Lihat Rekod Pengeluaran</span>
                  </button>

                  <button
                    type="button"
                    id="btn-return-home"
                    onClick={() => navigate('/')}
                    className="w-full h-12 bg-[#E31B23] hover:bg-[#c9151c] active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Kembali ke Laman Utama</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: WITHDRAWAL HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sejarah Permohonan Pengeluaran
              </h3>
              <span className="text-[11px] text-slate-500">{withdrawalsList.length} Rekod</span>
            </div>

            {withdrawalsList.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Tiada Rekod Pengeluaran</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Anda belum membuat sebarang permohonan pengeluaran tunai.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('form');
                    setCurrentStep('input_amount');
                  }}
                  className="px-4 py-2 bg-[#E31B23] text-white rounded-lg text-xs font-bold shadow-2xs inline-block mt-2"
                >
                  Buat Pengeluaran Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalsList.map((wd) => {
                  const isPending = wd.status === 'pending';
                  const isApproved = wd.status === 'approved';
                  const isRejected = wd.status === 'rejected';

                  return (
                    <div
                      key={wd.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-slate-900">
                              {formatMYR(wd.amount)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              {isPending
                                ? 'Menunggu Kelulusan'
                                : isApproved
                                ? 'Diluluskan (Approved)'
                                : 'Ditolak (Rejected)'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            ID: {wd.id}
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                          {isPending && <Clock className="w-5 h-5 text-amber-500 animate-pulse" />}
                          {isApproved && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                          {isRejected && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bank Penerima:</span>
                          <span className="font-semibold text-slate-800">
                            {wd.bank_name} ({wd.bank_account_number})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tarikh Permohonan:</span>
                          <span className="text-slate-700">
                            {new Date(wd.created_at).toLocaleString()}
                          </span>
                        </div>

                        {wd.reject_reason && (
                          <div className="p-2 bg-red-50 rounded-lg text-red-800 text-[10px]">
                            <strong>Sebab Penolakan:</strong> {wd.reject_reason}
                          </div>
                        )}

                        {isApproved && wd.bill_id && (
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700 font-bold">
                              ✓ Bil Ansuran Dijana
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate(`/bills/${wd.bill_id}`)}
                              className="text-[10px] font-bold text-[#E31B23] flex items-center gap-1 hover:underline"
                            >
                              <span>Lihat Bil</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
