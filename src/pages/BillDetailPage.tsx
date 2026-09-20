import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StandalonePage } from '../components/layout/StandalonePage';
import { formatMYR } from '../config/loan';
import { PaymentMethodType, Bill, PaymentConfirmation } from '../types';
import {
  FileText,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export const BillDetailPage: React.FC = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { user, updateUserData } = useAuth();

  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const bills = user?.bills || [];
  const bill = bills.find((b) => b.id === billId);

  // Available payment methods with is_active = true and complete requirements
  const isDuitNowActive = Boolean(bill?.duitnow_qr?.is_active && bill?.duitnow_qr?.qr_image_url);
  const isBankTransferActive = Boolean(
    bill?.transfer_bank?.is_active &&
    bill?.transfer_bank?.bank_image_url &&
    bill?.transfer_bank?.bank_name &&
    bill?.transfer_bank?.account_name &&
    bill?.transfer_bank?.account_number
  );

  // Default selected payment method to first active
  const initialMethod: PaymentMethodType = isDuitNowActive ? 'duitnow_qr' : 'transfer_bank';
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(initialMethod);

  if (!bill) {
    return (
      <StandalonePage title="Butiran Bil" fallbackBackUrl="/loan">
        <div className="p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#D92D20] mx-auto" />
          <h3 className="text-base font-bold text-[#17181B]">Bil Tidak Ditemui</h3>
          <p className="text-xs text-[#686B73]">Bil yang diminta tidak wujud atau telah dipadamkan.</p>
          <button
            type="button"
            onClick={() => navigate('/loan')}
            className="h-[44px] px-5 bg-[#E31B23] hover:bg-[#B5121B] text-white rounded-[12px] text-xs font-bold"
          >
            Kembali ke Senarai Pinjaman
          </button>
        </div>
      </StandalonePage>
    );
  }

  const isPaid = bill.status === 'paid';
  const isInactive = !bill.is_active;
  const confirmation = bill.confirmation;
  const isPending = bill.status === 'pending' || confirmation?.status === 'pending';
  const isRejected = confirmation?.status === 'rejected';

  // Rule: Can submit payment confirmation only if:
  // - Bill is NOT paid
  // - Bill is ACTIVE (Inactive Unpaid Bill TIDAK DAPAT membuat Payment Confirmation)
  const canMakeConfirmation = !isPaid && bill.is_active;

  // Pending rule:
  // User tidak boleh submit ulang dengan payment method yang sama.
  // User boleh submit ulang hanya dengan mengganti payment method.
  const isSameMethodAsPending = isPending && confirmation?.payment_method === selectedMethod;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSubmitConfirmation = async () => {
    if (!canMakeConfirmation) return;

    // Rule: Pending: User tidak boleh submit ulang dengan payment method yang sama.
    if (isPending && isSameMethodAsPending) {
      setError('Anda telah menghantar pengesahan menggunakan kaedah ini. Anda hanya boleh menghantar semula jika menukar ke kaedah pembayaran yang lain.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    // New confirmation payload
    const newConfirmation: PaymentConfirmation = {
      bill_id: bill.id,
      phone: user!.phone,
      payment_method: selectedMethod,
      amount: bill.amount,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };

    // Update the bill in user's bills array:
    // old confirmation (if cancelled or rejected) is replaced by new active confirmation
    const updatedBills = bills.map((b) => {
      if (b.id === bill.id) {
        return {
          ...b,
          status: 'pending' as const,
          confirmation: newConfirmation,
        };
      }
      return b;
    });

    const res = await updateUserData({ bills: updatedBills });
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Pengesahan pembayaran berjaya dihantar dan kini dalam status pending semakan pentadbir.');
    } else {
      setError(res.error || 'Gagal menghantar pengesahan pembayaran. Sila cuba lagi.');
    }
  };

  return (
    <StandalonePage
      title={bill.bill_name || 'Butiran Bil'}
      subtitle={`No. Bil: ${bill.id}`}
      fallbackBackUrl="/loan"
      bottomAction={
        canMakeConfirmation ? (
          <div className="space-y-2">
            {isPending && isSameMethodAsPending ? (
              <div className="p-2.5 bg-amber-50 rounded-[10px] text-[#B86E00] text-[11px] text-center font-medium border border-amber-200">
                Pengesahan menggunakan {selectedMethod === 'duitnow_qr' ? 'DuitNow QR' : 'Pindahan Bank'} sedang disemak. Tukar kaedah di atas jika ingin menghantar semula.
              </div>
            ) : null}

            <button
              type="button"
              id="btn-submit-payment-confirmation"
              onClick={handleSubmitConfirmation}
              disabled={isSubmitting || (isPending && isSameMethodAsPending)}
              className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Menghantar Pengesahan...</span>
              ) : isPending ? (
                <span>Tukar Kaedah & Hantar Semula Pengesahan</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Sahkan Saya Telah Buat Pembayaran</span>
                </>
              )}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4 pb-3">
        {/* Alerts & Messages */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-[12px] text-emerald-900 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#16834B] shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-[#FDEBEC] border border-red-200 rounded-[12px] text-[#D92D20] text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* INACTIVE NOTICE */}
        {isInactive && !isPaid && (
          <div className="p-3.5 bg-[#F7F7F8] border border-[#E4E5E8] rounded-[12px] text-xs text-[#686B73] space-y-1">
            <div className="flex items-center space-x-2 font-bold text-[#17181B]">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Bil Tidak Aktif (Inactive Bill)</span>
            </div>
            <p className="text-[#686B73] leading-relaxed">
              Bil ini ditandakan sebagai tidak aktif oleh pentadbir. Anda boleh melihat butiran bil, namun pengesahan pembayaran tidak boleh dibuat.
            </p>
          </div>
        )}

        {/* REJECTED CONFIRMATION NOTICE */}
        {isRejected && (
          <div className="p-3.5 bg-[#FDEBEC] border border-red-200 rounded-[12px] text-xs text-[#D92D20] space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-red-800">
              <XCircle className="w-4 h-4 text-[#D92D20]" />
              <span>Pengesahan Terdahulu Ditolak oleh Pentadbir</span>
            </div>
            <p className="text-[#686B73] text-[11px]">
              Sila pastikan bayaran dibuat dengan betul dan hantar pengesahan pembayaran yang baharu.
            </p>
          </div>
        )}

        {/* PENDING CONFIRMATION NOTICE */}
        {isPending && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[12px] text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-amber-800">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Pengesahan Pembayaran Sedang Disemak (Pending)</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              Resit / maklumat pembayaran melalui{' '}
              <span className="font-bold">
                {confirmation?.payment_method === 'duitnow_qr' ? 'DuitNow QR' : 'Pindahan Bank'}
              </span>{' '}
              telah dihantar pada {confirmation?.submitted_at ? new Date(confirmation.submitted_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : ''}. Pentadbir akan meluluskannya tidak lama lagi.
            </p>
          </div>
        )}

        {/* Bill Summary Card */}
        <div className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4E5E8]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#686B73] block tracking-wider">
                Jumlah Tagihan
              </span>
              <span className="text-2xl font-black text-[#E31B23]">
                {formatMYR(bill.amount)}
              </span>
            </div>

            <div className="text-right">
              {isPaid ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#16834B]">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Selesai Dibayar
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-[#B86E00]">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Menunggu Kelulusan
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#FDEBEC] text-[#E31B23]">
                  Belum Dibayar
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-[#686B73]">
            <div className="flex justify-between">
              <span className="text-[#686B73]">Nama Bil:</span>
              <span className="font-bold text-[#17181B]">{bill.bill_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#686B73]">ID Bil:</span>
              <span className="font-mono text-[#17181B]">{bill.id}</span>
            </div>
            {isPaid && bill.paid_at && (
              <div className="flex justify-between text-[#16834B] font-medium">
                <span>Tarikh Bayaran:</span>
                <span>{new Date(bill.paid_at).toLocaleString('ms-MY')}</span>
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT METHOD SELECTION & INSTRUCTIONS */}
        {/* Only shown if not paid, or displays method details */}
        {!isPaid && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Kaedah Pembayaran Diterima
            </h3>

            {/* Payment Method Switcher Tabs (only active methods displayed) */}
            <div className="grid grid-cols-2 gap-2">
              {isDuitNowActive && (
                <button
                  type="button"
                  id="method-duitnow-btn"
                  onClick={() => setSelectedMethod('duitnow_qr')}
                  className={`p-3 rounded-[12px] border text-left transition-all flex items-center space-x-2.5 ${
                    selectedMethod === 'duitnow_qr'
                      ? 'border-[#E31B23] bg-[#FDEBEC] shadow-2xs'
                      : 'border-[#E4E5E8] bg-[#FFFFFF] hover:bg-[#F7F7F8]'
                  }`}
                >
                  <div className={`p-2 rounded-[8px] ${selectedMethod === 'duitnow_qr' ? 'bg-[#E31B23] text-white' : 'bg-[#F7F7F8] text-[#686B73]'}`}>
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-[#17181B]">DuitNow QR</span>
                    <span className="text-[10px] text-[#686B73]">Imbas & Bayar</span>
                  </div>
                </button>
              )}

              {isBankTransferActive && (
                <button
                  type="button"
                  id="method-bank-transfer-btn"
                  onClick={() => setSelectedMethod('transfer_bank')}
                  className={`p-3 rounded-[12px] border text-left transition-all flex items-center space-x-2.5 ${
                    selectedMethod === 'transfer_bank'
                      ? 'border-[#E31B23] bg-[#FDEBEC] shadow-2xs'
                      : 'border-[#E4E5E8] bg-[#FFFFFF] hover:bg-[#F7F7F8]'
                  }`}
                >
                  <div className={`p-2 rounded-[8px] ${selectedMethod === 'transfer_bank' ? 'bg-[#E31B23] text-white' : 'bg-[#F7F7F8] text-[#686B73]'}`}>
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-[#17181B]">Pindahan Bank</span>
                    <span className="text-[10px] text-[#686B73]">Manual Transfer</span>
                  </div>
                </button>
              )}
            </div>

            {/* Selected Method Details */}
            {selectedMethod === 'duitnow_qr' && isDuitNowActive && (
              <div className="bg-[#FFFFFF] p-5 rounded-[16px] border border-[#E4E5E8] shadow-2xs text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#E31B23] block">
                    DuitNow QR Kebangsaan
                  </span>
                  <p className="text-xs text-[#686B73]">
                    Buka sebarang aplikasi perbankan (CIMB OCTO, Maybank, Touch 'n Go eWallet, dsb.) dan imbas kod di bawah:
                  </p>
                </div>

                {/* QR Display */}
                <div className="p-3 bg-white border border-[#E4E5E8] rounded-[16px] inline-block shadow-2xs mx-auto">
                  <img
                    src={
                      bill.duitnow_qr?.qr_image_url ||
                      `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=cimb-cashplus-${bill.id}-${bill.amount}`
                    }
                    alt="DuitNow QR Code"
                    className="w-48 h-48 mx-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-2.5 bg-[#F7F7F8] rounded-[10px] text-[11px] text-[#686B73] border border-[#E4E5E8]">
                  Jumlah tepat: <span className="font-black text-[#17181B]">{formatMYR(bill.amount)}</span>
                </div>
              </div>
            )}

            {selectedMethod === 'transfer_bank' && isBankTransferActive && (
              <div className="bg-[#FFFFFF] p-4 rounded-[16px] border border-[#E4E5E8] shadow-2xs space-y-3 text-xs">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[#17181B]">Maklumat Akaun Penerima CIMB</h4>
                  <p className="text-[#686B73] text-[11px]">
                    Sila lakukan pindahan segera (Instant Transfer) ke butiran akaun di bawah:
                  </p>
                </div>

                <div className="p-3 bg-[#F7F7F8] rounded-[12px] border border-[#E4E5E8] space-y-2.5">
                  {bill.transfer_bank?.bank_image_url && (
                    <div className="pb-2 border-b border-[#E4E5E8]">
                      <span className="text-[#686B73] text-[10px] uppercase font-bold block mb-1.5">Imej Maklumat Akaun Bank</span>
                      <img
                        src={bill.transfer_bank.bank_image_url}
                        alt="Maklumat Bank Penerima"
                        className="w-full max-h-48 object-contain rounded-[8px] border border-[#E4E5E8] bg-white mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-[#686B73] text-[10px] uppercase font-bold block">Nama Bank</span>
                    <span className="font-bold text-[#17181B] text-sm">{bill.transfer_bank?.bank_name || 'CIMB Bank Berhad'}</span>
                  </div>

                  <div>
                    <span className="text-[#686B73] text-[10px] uppercase font-bold block">Nama Akaun Penerima</span>
                    <span className="font-bold text-[#17181B]">{bill.transfer_bank?.account_name || 'CIMB Cash Plus Financing'}</span>
                  </div>

                  <div>
                    <span className="text-[#686B73] text-[10px] uppercase font-bold block">Nombor Akaun Penerima</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-base font-black text-[#E31B23] tracking-wider">
                        {bill.transfer_bank?.account_number || '7012345678'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(bill.transfer_bank?.account_number || '7012345678')}
                        className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E4E5E8] text-[#17181B] hover:bg-[#F7F7F8] active:scale-95 text-[11px] font-semibold flex items-center space-x-1"
                      >
                        {copiedAccount ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#16834B]" />
                            <span>Disalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#686B73] text-[10px] uppercase font-bold block">Jumlah Bayaran Tepat</span>
                    <span className="font-black text-[#17181B] text-sm">{formatMYR(bill.amount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paid Receipt View */}
        {isPaid && (
          <div className="bg-[#FFFFFF] p-5 rounded-[16px] border border-emerald-200 shadow-2xs space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#16834B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#17181B]">
              Resit Pembayaran Rasmi
            </h4>
            <p className="text-xs text-[#686B73] leading-relaxed max-w-xs mx-auto">
              Pembayaran sebanyak <span className="font-bold text-[#17181B]">{formatMYR(bill.amount)}</span> bagi bil ini telah disahkan dan direkodkan ke dalam akaun pinjaman anda.
            </p>
            <div className="p-3 bg-emerald-50/70 rounded-[12px] text-xs text-[#17181B] border border-emerald-200 text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-[#686B73]">Status Pembayaran:</span>
                <span className="font-bold text-[#16834B]">Selesai (Paid)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#686B73]">Masa Pengesahan:</span>
                <span>{bill.paid_at ? new Date(bill.paid_at).toLocaleString('ms-MY') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#686B73]">Kaedah:</span>
                <span>{bill.confirmation?.payment_method === 'duitnow_qr' ? 'DuitNow QR' : 'Pindahan Bank'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandalonePage>
  );
};
