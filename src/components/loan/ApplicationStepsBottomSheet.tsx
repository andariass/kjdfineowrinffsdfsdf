import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  ChevronRight,
  Calculator,
  ShieldCheck,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  HelpCircle,
  FileText,
  BadgeCheck,
} from 'lucide-react';

export interface ApplicationStepsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  userKycComplete: boolean;
  userBankComplete: boolean;
  initialStep?: number;
}

export const ApplicationStepsBottomSheet: React.FC<ApplicationStepsBottomSheetProps> = ({
  isOpen,
  onClose,
  onApply,
  userKycComplete,
  userBankComplete,
  initialStep = 1,
}) => {
  const [activeTab, setActiveTab] = useState<number>(initialStep);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialStep);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialStep]);

  if (typeof document === 'undefined') return null;

  const stepsData = [
    {
      step: 1,
      title: 'Pilih Jumlah & Tempoh',
      icon: <Calculator className="w-5 h-5 text-[#E31B23]" />,
      summary: 'Kalkulator pinjaman anuiti interaktif dengan ansuran telus',
      details: [
        'Tetapkan jumlah pembiayaan dari serendah RM1,000 sehingga RM100,000.',
        'Pilih tempoh bayaran balik fleksibel antara 12 sehingga 84 bulan mengikut keselesaan anda.',
        'Kadar faedah kompetitif bermula 4.66% - 8.56% setahun dengan pengiraan anuiti tepat tanpa caj tersembunyi.',
      ],
      tip: 'Gunakan simulasi ansuran di halaman kalkulator untuk melihat jadual bayaran bulanan sebelum memohon.',
    },
    {
      step: 2,
      title: 'Sahkan Identiti & Bank',
      icon: <ShieldCheck className="w-5 h-5 text-[#E31B23]" />,
      summary: 'Pengesahan digital MyKad & nombor akaun bank pengkreditan',
      details: [
        'Muat naik gambar MyKad depan dan belakang yang terang serta jelas.',
        'Lakukan swafoto ringkas (biometrik liveness) untuk keselamatan akaun anda.',
        'Masukkan maklumat akaun bank tempatan (CIMB, Maybank, RHB, dll.) atas nama sendiri untuk penerimaan wang tunai.',
      ],
      tip: 'Pastikan nama pada akaun bank adalah sepadan dengan nama pada MyKad untuk mengelakkan penolakan automatik.',
    },
    {
      step: 3,
      title: 'Kelulusan & Pengeluaran',
      icon: <Banknote className="w-5 h-5 text-[#E31B23]" />,
      summary: 'Pemprosesan pantas dan dana dikreditkan terus',
      details: [
        'Permohonan dinilai serta-merta oleh sistem pemarkahan pintar kami.',
        'Setelah lulus, baki pembiayaan anda akan dipaparkan secara langsung di papan pemuka aplikasi.',
        'Tetapkan PIN 6-digit dan lakukan Pengeluaran Tunai (Withdrawal) ke akaun bank anda pada bila-bila masa.',
      ],
      tip: 'Simpan PIN keselamatan 6-digit anda secara rahsia untuk melindungi transaksi pengeluaran anda.',
    },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          id="application-steps-bottom-sheet-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto m-0 p-0 bottom-0"
        >
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer m-0"
            aria-hidden="true"
          />

          {/* Bottom Sheet Frame */}
          <motion.div
            key="sheet-frame"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[520px] max-h-[90vh] bg-[#FFFFFF] rounded-t-[22px] shadow-2xl flex flex-col z-10 overflow-hidden m-0 mb-0 bottom-0"
          >
            {/* Grabber Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-[#E4E5E8] rounded-full" />
            </div>

            {/* Header with Steps 1, 2, 3 */}
            <div className="px-5 pt-2 pb-3.5 border-b border-[#E4E5E8] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FDEBEC] text-[#E31B23] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#17181B] tracking-tight">
                      Langkah Permohonan Mudah
                    </h3>
                    <p className="text-[11px] text-[#686B73]">
                      Panduan 3 langkah pantas pembiayaan tunai CIMB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-close-steps-sheet"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[#F7F7F8] hover:bg-[#E4E5E8] text-[#686B73] hover:text-[#17181B] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps Progress Header: 1 Langkah 1, 2 Langkah 2, 3 Langkah 3 */}
              <div className="relative flex items-center justify-between px-3 pt-1">
                {/* Connecting track line behind step circles */}
                <div className="absolute left-8 right-8 top-4 -translate-y-1/2 h-[2px] bg-[#E4E5E8] z-0">
                  <div
                    className="h-full bg-[#E31B23] transition-all duration-300"
                    style={{
                      width: activeTab === 1 ? '0%' : activeTab === 2 ? '50%' : '100%',
                    }}
                  />
                </div>

                {stepsData.map((item) => {
                  const isActive = activeTab === item.step;
                  const isCompleted = activeTab > item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setActiveTab(item.step)}
                      className="relative z-10 flex flex-col items-center gap-1 focus:outline-none group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                          isActive
                            ? 'bg-[#E31B23] text-white ring-4 ring-red-100 shadow-xs scale-105'
                            : isCompleted
                            ? 'bg-[#E31B23] text-white'
                            : 'bg-white text-[#686B73] border-2 border-[#E4E5E8] group-hover:border-[#686B73]'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          item.step
                        )}
                      </div>
                      <span
                        className={`text-[11px] transition-colors whitespace-nowrap ${
                          isActive
                            ? 'font-bold text-[#E31B23]'
                            : isCompleted
                            ? 'font-medium text-[#17181B]'
                            : 'font-normal text-[#686B73]'
                        }`}
                      >
                        Langkah {item.step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[#17181B]">
              {/* Active Step Details Card */}
              {(() => {
                const current = stepsData.find((s) => s.step === activeTab) || stepsData[0];
                return (
                  <div className="bg-[#FAFAFB] border border-[#E4E5E8] rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E5E8] shadow-2xs flex items-center justify-center shrink-0">
                        {current.icon}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-[#E31B23] uppercase tracking-wider block">
                          Langkah {current.step} daripada 3
                        </span>
                        <h4 className="text-sm font-bold text-[#17181B] leading-tight">
                          {current.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-[#51535A] leading-relaxed">
                      {current.summary}
                    </p>

                    <div className="space-y-2 pt-1">
                      {current.details.map((desc, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-[#16834B] shrink-0 mt-0.5" />
                          <span className="text-[#36383E] leading-relaxed">{desc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tip box */}
                    <div className="p-3 bg-[#FDEBEC]/60 rounded-xl border border-red-100 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#E31B23] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#B5121B] leading-relaxed">
                        <strong className="font-bold">Tip:</strong> {current.tip}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* User Live Readiness Checklist */}
              <div className="bg-white border border-[#E4E5E8] rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#686B73]">
                  Status Kelayakan Anda
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F7F7F8] border border-[#E4E5E8] flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-[11px] text-[#686B73] block">Status KYC</span>
                      <span className="font-bold text-[#17181B]">
                        {userKycComplete ? 'Disahkan' : 'Belum Lengkap'}
                      </span>
                    </div>
                    {userKycComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16834B]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F7F7F8] border border-[#E4E5E8] flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-[11px] text-[#686B73] block">Akaun Bank</span>
                      <span className="font-bold text-[#17181B]">
                        {userBankComplete ? 'Telah Ditetapkan' : 'Belum Lengkap'}
                      </span>
                    </div>
                    {userBankComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16834B]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Key Highlights */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#F7F7F8] border border-[#E4E5E8]">
                  <Clock className="w-4 h-4 text-[#E31B23] mx-auto mb-1" />
                  <span className="font-bold block text-[11px]">10 Minit</span>
                  <span className="text-[10px] text-[#686B73]">Proses Pantas</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F7F7F8] border border-[#E4E5E8]">
                  <BadgeCheck className="w-4 h-4 text-[#E31B23] mx-auto mb-1" />
                  <span className="font-bold block text-[11px]">Tanpa Cagaran</span>
                  <span className="text-[10px] text-[#686B73]">Tiada Penjamin</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F7F7F8] border border-[#E4E5E8]">
                  <FileText className="w-4 h-4 text-[#E31B23] mx-auto mb-1" />
                  <span className="font-bold block text-[11px]">100% Online</span>
                  <span className="text-[10px] text-[#686B73]">Tanpa Borang Fizikal</span>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-[#E4E5E8] bg-white flex items-center gap-2.5">
              {activeTab > 1 ? (
                <button
                  type="button"
                  id="btn-sheet-prev-action"
                  onClick={() => setActiveTab((prev) => Math.max(prev - 1, 1))}
                  className="flex-1 h-[46px] rounded-xl bg-[#F7F7F8] hover:bg-[#E4E5E8] text-[#17181B] font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  Kembali
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-sheet-close-action"
                  onClick={onClose}
                  className="flex-1 h-[46px] rounded-xl bg-[#F7F7F8] hover:bg-[#E4E5E8] text-[#17181B] font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  Tutup
                </button>
              )}

              {activeTab < 3 ? (
                <button
                  type="button"
                  id="btn-sheet-next-action"
                  onClick={() => setActiveTab((prev) => Math.min(prev + 1, 3))}
                  className="flex-[2] h-[46px] rounded-xl bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-sheet-apply-action"
                  onClick={() => {
                    onClose();
                    onApply();
                  }}
                  className="flex-[2] h-[46px] rounded-xl bg-[#E31B23] hover:bg-[#B5121B] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <span>Mula Permohonan Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
