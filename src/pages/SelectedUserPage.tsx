import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cimbApi, extractUserWithdrawals } from '../api/cimbApi';
import { StandalonePage } from '../components/layout/StandalonePage';
import { AdminBottomNav } from '../components/layout/AdminBottomNav';
import { formatMYR } from '../config/loan';
import { Bill, CimbUser, Withdrawal } from '../types';
import { CheckCircle2, XCircle, Clock, PlusCircle, Eye, EyeOff, AlertTriangle, Check, Layers, Sparkles, ShieldAlert, Trash2, Building, QrCode, Loader2, WalletCards, Edit3, Headphones } from 'lucide-react';
import { isKycVerified } from '../utils/businessRules';

export const SelectedUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { phone } = useParams<{ phone: string }>();
  const { user, session } = useAuth();
  const [targetUser, setTargetUser] = useState<CimbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showNewBillForm, setShowNewBillForm] = useState(false);
  const [newBillName, setNewBillName] = useState('Ansuran Bulanan');
  const [newBillAmount, setNewBillAmount] = useState(500);
  const [showRejectLoanConfirm, setShowRejectLoanConfirm] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState('');
  const [editBillAmount, setEditBillAmount] = useState<number>(0);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, {
    duitnow_qr: { is_active: boolean; qr_image_url: string | null };
    transfer_bank: { is_active: boolean; bank_name: string; account_name: string; account_number: string; bank_image_url: string | null };
  }>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, { duitnow_qr?: string; transfer_bank?: string }>>({});
  const [uploadingField, setUploadingField] = useState<{ billId: string; field: 'duitnow_qr' | 'transfer_bank' } | null>(null);

  const handleDeleteTargetUser = async () => {
    if (!session || !targetUser) return;
    setIsProcessing(true);
    setNotice(null);
    const res = await cimbApi.delete({
      phone: session.phone,
      password: session.password,
      target_phone: targetUser.phone,
    });
    setIsProcessing(false);
    setShowDeleteUserConfirm(false);
    if (res.success) {
      navigate('/admin/users', { replace: true });
    } else {
      setNotice({ type: 'error', message: 'error' in res ? res.error : 'Gagal memadam pengguna.' });
    }
  };

  const loadUser = async () => {
    if (!session || !phone) return;
    setIsLoading(true);
    const res = await cimbApi.get({ phone: session.phone, password: session.password, all: true });
    if (res.success && Array.isArray(res.data)) {
      const found = res.data.find((item) => item.phone === decodeURIComponent(phone)) || null;
      setTargetUser(found);
      if (found) setNewBillAmount(found.loan_monthly_installment || 500);
      if (!found) setNotice({ type: 'error', message: 'Pengguna tidak ditemui.' });
    } else {
      setNotice({ type: 'error', message: 'error' in res ? res.error : 'Gagal memuatkan pengguna.' });
    }
    setIsLoading(false);
  };

  useEffect(() => { void loadUser(); }, [session?.phone, phone]);

  const updateTargetUser = async (data: Partial<Omit<CimbUser, 'phone' | 'created_at' | 'updated_at'>>) => {
    if (!session || !targetUser) return { success: false, error: 'Pengguna sasaran tidak dipilih.' };
    setIsProcessing(true);
    const res = await cimbApi.update({ phone: session.phone, password: session.password, target_phone: targetUser.phone, data });
    setIsProcessing(false);
    if (res.success && res.data) {
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setTargetUser(updated);
      return { success: true, user: updated };
    }
    return { success: false, error: 'error' in res ? res.error : 'Gagal mengemaskini pengguna.' };
  };

  const bills = targetUser?.bills || [];
  const pendingConfirmations = useMemo(() => bills.filter((b) => b.status === 'pending' || b.confirmation?.status === 'pending'), [bills]);
  const withdrawals = useMemo(() => extractUserWithdrawals(targetUser), [targetUser]);
  const pendingWithdrawals = useMemo(() => withdrawals.filter((w) => w.status === 'pending'), [withdrawals]);

  const handleReviewWithdrawal = async (withdrawalId: string, decision: 'approve' | 'reject') => {
    if (!session || !targetUser) return;
    setIsProcessing(true);
    setNotice(null);

    const res = await cimbApi.reviewWithdrawal({
      phone: session.phone,
      password: session.password,
      target_phone: targetUser.phone,
      withdrawal_id: withdrawalId,
      decision,
    });

    setIsProcessing(false);

    if (res.success) {
      setNotice({
        type: 'success',
        message:
          decision === 'approve'
            ? 'Permohonan pengeluaran BERJAYA DILULUSKAN (Approved). Bil ansuran baharu (Unpaid) telah dicipta secara automatik.'
            : 'Permohonan pengeluaran telah DITOLAK (Rejected). Tiada bil baharu dicipta.',
      });
      await loadUser();
    } else {
      setNotice({
        type: 'error',
        message: res.error || 'Gagal memproses semakan pengeluaran.',
      });
    }
  };

  useEffect(() => {
    const next: typeof paymentDrafts = {};
    bills.forEach((bill) => {
      next[bill.id] = {
        duitnow_qr: {
          is_active: Boolean(bill.duitnow_qr?.is_active && bill.duitnow_qr?.qr_image_url),
          qr_image_url: bill.duitnow_qr?.qr_image_url ?? null,
        },
        transfer_bank: {
          is_active: Boolean(
            bill.transfer_bank?.is_active &&
            bill.transfer_bank?.bank_name &&
            bill.transfer_bank?.account_name &&
            bill.transfer_bank?.account_number &&
            bill.transfer_bank?.bank_image_url
          ),
          bank_name: bill.transfer_bank?.bank_name ?? '',
          account_name: bill.transfer_bank?.account_name ?? '',
          account_number: bill.transfer_bank?.account_number ?? '',
          bank_image_url: bill.transfer_bank?.bank_image_url ?? null,
        },
      };
    });
    setPaymentDrafts(next);
  }, [targetUser?.phone, targetUser?.updated_at]);

  const handleApproveLoan = async () => {
    setNotice(null);
    const res = await updateTargetUser({ loan_status: 'Approved', loan_approved: true, loan_is_active: false, loan_approved_amount: targetUser?.loan_applied_amount || targetUser?.loan_amount || 10000 });
    setNotice(res.success ? { type: 'success', message: 'Permohonan pinjaman berjaya DILULUSKAN (Approved).' } : { type: 'error', message: res.error || 'Gagal meluluskan pinjaman.' });
  };

  const handleRejectLoanSubmit = async () => {
    setNotice(null);
    const res = await updateTargetUser({ loan_status: 'Rejected', loan_approved: false, loan_is_active: false });
    setShowRejectLoanConfirm(false);
    setNotice(res.success ? { type: 'success', message: 'Permohonan pinjaman telah DITOLAK (Rejected).' } : { type: 'error', message: res.error || 'Ralat menolak permohonan.' });
  };

  const createBill = async (activateLoan: boolean) => {
    if (!newBillName.trim()) return setNotice({ type: 'error', message: 'Nama bil diperlukan.' });
    if (newBillAmount <= 0) return setNotice({ type: 'error', message: 'Jumlah bil mestilah lebih daripada 0.' });
    setIsProcessing(true);
    setNotice(null);
    const billId = `bill_${Date.now()}`;
    const newBill: Bill = {
      id: billId,
      phone: targetUser!.phone,
      bill_name: newBillName.trim(),
      amount: Number(newBillAmount),
      status: 'unpaid',
      is_active: true,
      paid_at: null,
      duitnow_qr: { is_active: false, qr_image_url: null },
      transfer_bank: {
        is_active: false,
        bank_name: null,
        account_name: null,
        account_number: null,
        bank_image_url: null,
      },
      confirmation: null,
    };
    const res = await updateTargetUser({ ...(activateLoan ? { loan_is_active: true } : {}), bills: [...bills, newBill] });
    setIsProcessing(false);
    if (res.success) { setShowNewBillForm(false); setNotice({ type: 'success', message: activateLoan ? 'Pinjaman berjaya DIAKTIFKAN bersama bil ansuran pertama!' : `Bil baharu (${newBill.bill_name}) berjaya diterbitkan.` }); }
    else setNotice({ type: 'error', message: res.error || 'Gagal mencipta bil baharu.' });
  };

  const handleToggleBillVisibility = async (billId: string, currentActive: boolean) => {
    const bill = bills.find((b) => b.id === billId);
    if (bill?.status === 'paid') return setNotice({ type: 'error', message: 'Bil yang telah dibayar (Paid bill) TIDAK BOLEH dinonaktifkan oleh Admin.' });
    const res = await updateTargetUser({ bills: bills.map((b) => b.id === billId ? { ...b, is_active: !currentActive } : b) });
    if (res.success) setNotice({ type: 'success', message: `Keterlihatan bil dikemaskini kepada: ${!currentActive ? 'Aktif' : 'Tidak Aktif'}.` });
  };

  const updatePaymentDraft = (billId: string, section: 'duitnow_qr' | 'transfer_bank', field: string, value: boolean | string | null) => {
    setPaymentDrafts((current) => ({
      ...current,
      [billId]: {
        ...current[billId],
        [section]: { ...current[billId]?.[section], [field]: value },
      } as typeof current[string],
    }));
  };

  const toggleDuitNowActive = (billId: string) => {
    const draft = paymentDrafts[billId];
    if (!draft) return;
    const currentActive = draft.duitnow_qr.is_active;
    if (!currentActive) {
      if (!draft.duitnow_qr.qr_image_url) {
        setValidationErrors((prev) => ({
          ...prev,
          [billId]: {
            ...prev[billId],
            duitnow_qr: 'Imej QR belum dimuat naik. Sila muat naik imej kod QR sebelum mengaktifkan DuitNow QR.',
          },
        }));
        return;
      }
    }
    setValidationErrors((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], duitnow_qr: undefined },
    }));
    updatePaymentDraft(billId, 'duitnow_qr', 'is_active', !currentActive);
  };

  const toggleTransferBankActive = (billId: string) => {
    const draft = paymentDrafts[billId];
    if (!draft) return;
    const currentActive = draft.transfer_bank.is_active;
    if (!currentActive) {
      const missing: string[] = [];
      if (!draft.transfer_bank.bank_image_url) missing.push('imej maklumat bank');
      if (!draft.transfer_bank.bank_name?.trim()) missing.push('Nama Bank');
      if (!draft.transfer_bank.account_name?.trim()) missing.push('Nama Pemegang Akaun');
      if (!draft.transfer_bank.account_number?.trim()) missing.push('Nombor Akaun');

      if (missing.length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          [billId]: {
            ...prev[billId],
            transfer_bank: `Tidak boleh diaktifkan. Sila lengkapkan: ${missing.join(', ')}.`,
          },
        }));
        return;
      }
    }
    setValidationErrors((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], transfer_bank: undefined },
    }));
    updatePaymentDraft(billId, 'transfer_bank', 'is_active', !currentActive);
  };

  const handleSaveBillPaymentConfig = async (billId: string) => {
    const draft = paymentDrafts[billId];
    if (!draft) return;

    if (draft.duitnow_qr.is_active && !draft.duitnow_qr.qr_image_url) {
      setValidationErrors((prev) => ({
        ...prev,
        [billId]: {
          ...prev[billId],
          duitnow_qr: 'DuitNow QR tidak boleh aktif tanpa gambar kod QR.',
        },
      }));
      setNotice({ type: 'error', message: 'DuitNow QR tidak boleh diaktifkan tanpa gambar kod QR.' });
      return;
    }

    if (draft.transfer_bank.is_active) {
      const missing: string[] = [];
      if (!draft.transfer_bank.bank_image_url) missing.push('imej maklumat bank');
      if (!draft.transfer_bank.bank_name?.trim()) missing.push('Nama Bank');
      if (!draft.transfer_bank.account_name?.trim()) missing.push('Nama Pemegang Akaun');
      if (!draft.transfer_bank.account_number?.trim()) missing.push('Nombor Akaun');
      if (missing.length > 0) {
        setValidationErrors((prev) => ({
          ...prev,
          [billId]: {
            ...prev[billId],
            transfer_bank: `Pindahan Bank tidak boleh aktif tanpa: ${missing.join(', ')}.`,
          },
        }));
        setNotice({ type: 'error', message: `Pindahan Bank tidak boleh aktif tanpa: ${missing.join(', ')}.` });
        return;
      }
    }

    const updatedBills = bills.map((bill) => bill.id === billId ? {
      ...bill,
      duitnow_qr: {
        is_active: Boolean(draft.duitnow_qr.is_active && draft.duitnow_qr.qr_image_url),
        qr_image_url: draft.duitnow_qr.qr_image_url || null,
      },
      transfer_bank: {
        is_active: Boolean(
          draft.transfer_bank.is_active &&
          draft.transfer_bank.bank_image_url &&
          draft.transfer_bank.bank_name.trim() &&
          draft.transfer_bank.account_name.trim() &&
          draft.transfer_bank.account_number.trim()
        ),
        bank_name: draft.transfer_bank.bank_name.trim() || null,
        account_name: draft.transfer_bank.account_name.trim() || null,
        account_number: draft.transfer_bank.account_number.trim() || null,
        bank_image_url: draft.transfer_bank.bank_image_url || null,
      },
    } : bill);

    const res = await updateTargetUser({ bills: updatedBills });
    if (res.success) {
      setValidationErrors((prev) => ({ ...prev, [billId]: {} }));
      setNotice({ type: 'success', message: 'Konfigurasi pembayaran bil berjaya disimpan.' });
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal menyimpan konfigurasi pembayaran.' });
    }
  };

  const handleBillQrUpload = async (billId: string, billIndex: number, file: File | undefined) => {
    if (!file || !session || !targetUser) return;
    setUploadingField({ billId, field: 'duitnow_qr' });
    setNotice(null);
    let finalUrl: string | null = null;
    try {
      const res = await cimbApi.upload({
        phone: session.phone,
        password: session.password,
        target_phone: targetUser.phone,
        field: 'bill_qr',
        file,
        bill_index: billIndex,
      });
      if (res.success && res.data?.url) {
        finalUrl = res.data.url;
      }
    } catch {}

    if (!finalUrl) {
      finalUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    setUploadingField(null);
    if (finalUrl) {
      updatePaymentDraft(billId, 'duitnow_qr', 'qr_image_url', finalUrl);
      updatePaymentDraft(billId, 'duitnow_qr', 'is_active', true);
      setValidationErrors((prev) => ({
        ...prev,
        [billId]: { ...prev[billId], duitnow_qr: undefined },
      }));
      setNotice({ type: 'success', message: 'Imej DuitNow QR berjaya dimuat naik.' });
    } else {
      setNotice({ type: 'error', message: 'Gagal memuat naik DuitNow QR.' });
    }
  };

  const handleBillBankUpload = async (billId: string, billIndex: number, file: File | undefined) => {
    if (!file || !session || !targetUser) return;
    setUploadingField({ billId, field: 'transfer_bank' });
    setNotice(null);
    let finalUrl: string | null = null;
    try {
      const res = await cimbApi.upload({
        phone: session.phone,
        password: session.password,
        target_phone: targetUser.phone,
        field: 'bill_bank',
        file,
        bill_index: billIndex,
      });
      if (res.success && res.data?.url) {
        finalUrl = res.data.url;
      }
    } catch {}

    if (!finalUrl) {
      finalUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    setUploadingField(null);
    if (finalUrl) {
      updatePaymentDraft(billId, 'transfer_bank', 'bank_image_url', finalUrl);
      updatePaymentDraft(billId, 'transfer_bank', 'is_active', true);
      setValidationErrors((prev) => ({
        ...prev,
        [billId]: { ...prev[billId], transfer_bank: undefined },
      }));
      setNotice({ type: 'success', message: 'Imej maklumat akaun bank berjaya dimuat naik.' });
    } else {
      setNotice({ type: 'error', message: 'Gagal memuat naik imej maklumat bank.' });
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!targetUser) return;
    const updatedBills = bills.filter((b) => b.id !== billId);
    const res = await updateTargetUser({ bills: updatedBills });
    if (res.success) {
      setNotice({ type: 'success', message: 'Bil berjaya dipadam.' });
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal memadam bil.' });
    }
  };

  const handleUpdateBillDetails = async (billId: string) => {
    if (!targetUser || !editBillName.trim()) return;
    const updatedBills = bills.map((b) =>
      b.id === billId ? { ...b, bill_name: editBillName.trim(), amount: Number(editBillAmount) } : b
    );
    const res = await updateTargetUser({ bills: updatedBills });
    if (res.success) {
      setEditingBillId(null);
      setNotice({ type: 'success', message: 'Maklumat bil berjaya dikemaskini.' });
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal mengemaskini maklumat bil.' });
    }
  };

  const handleApprovePayment = async (billId: string) => {
    const now = new Date().toISOString();
    const updatedBills = bills.map((b) => b.id !== billId ? b : { ...b, status: 'paid' as const, paid_at: now, is_active: true, confirmation: b.confirmation ? { ...b.confirmation, status: 'approved' as const } : { bill_id: b.id, phone: targetUser!.phone, payment_method: 'duitnow_qr' as const, amount: b.amount, submitted_at: now, status: 'approved' as const } });
    const res = await updateTargetUser({ bills: updatedBills });
    setNotice(res.success ? { type: 'success', message: 'Pengesahan bayaran berjaya DISAHKAN (Status: Paid).' } : { type: 'error', message: res.error || 'Gagal meluluskan pembayaran.' });
  };

  const handleRejectPayment = async (billId: string) => {
    const updatedBills = bills.map((b) => b.id !== billId ? b : { ...b, status: 'unpaid' as const, paid_at: null, confirmation: b.confirmation ? { ...b.confirmation, status: 'rejected' as const } : null });
    const res = await updateTargetUser({ bills: updatedBills });
    setNotice(res.success ? { type: 'success', message: 'Pengesahan bayaran telah DITOLAK. Bil kembali ke status Belum Bayar.' } : { type: 'error', message: res.error || 'Gagal menolak pengesahan bayaran.' });
  };

  if (user?.role !== 'admin') return <StandalonePage title="Akses Dihadkan" fallbackBackUrl="/"><div className="p-6 text-center"><ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" /><h3 className="text-base font-bold">Akses Pentadbir Sahaja</h3></div></StandalonePage>;

  if (isLoading) return <StandalonePage title="Memuatkan Pengguna" fallbackBackUrl="/admin"><div className="p-6 text-center text-xs text-slate-500">Memuatkan maklumat pengguna...</div></StandalonePage>;
  if (!targetUser) return <StandalonePage title="Pengguna Tidak Ditemui" fallbackBackUrl="/admin"><div className="p-6 text-center space-y-3"><AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" /><p className="text-xs text-slate-600">{notice?.message || 'Pengguna tidak ditemui.'}</p><button type="button" onClick={() => navigate('/admin')} className="px-4 py-2 bg-[#E31B23] text-white rounded-lg text-xs font-bold">Kembali ke Senarai</button></div></StandalonePage>;

  return (
    <StandalonePage
      title={targetUser.name || 'Maklumat Pengguna'}
      subtitle={targetUser.phone}
      fallbackBackUrl="/admin"
      bottomNav={<AdminBottomNav />}
    >
      <div className="space-y-3 pb-6">
        {notice && <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>{notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}<span className="font-medium">{notice.message}</span></div>}

        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pengguna Semasa</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{targetUser.role}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FDEBEC] text-[#E31B23]">
                {formatMYR(targetUser.balance || 0)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3 text-xs">
            <span className="font-bold text-slate-900 text-sm truncate">{targetUser.name}</span>
            <span className="font-mono text-slate-600 shrink-0">{targetUser.phone}</span>
          </div>
          {targetUser.email && (
            <div className="text-[11px] text-slate-500 font-sans">
              Emel: <span className="font-medium text-slate-800">{targetUser.email}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Akaun Bank:</span>
              <span className="font-medium text-slate-800 text-right">
                {targetUser.bank_name ? `${targetUser.bank_name} (${targetUser.bank_account_number})` : 'Belum diisi'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Status KYC:</span>
              <span className={`font-semibold ${targetUser.kyc_is_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                {isKycVerified(targetUser) ? 'Disahkan (Verified)' : (targetUser.kyc_status || 'Belum Lengkap')}
              </span>
            </div>
            {targetUser.kyc_identity_mykad_number && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">MyKad / Nama:</span>
                <span className="font-medium text-slate-800 text-right">
                  {targetUser.kyc_identity_mykad_number} ({targetUser.kyc_identity_full_name || targetUser.name})
                </span>
              </div>
            )}
            {targetUser.kyc_address_line && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Alamat:</span>
                <span className="font-medium text-slate-800 text-right">
                  {[targetUser.kyc_address_line, targetUser.kyc_postcode, targetUser.kyc_city, targetUser.kyc_state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(`/admin/livechat?phone=${encodeURIComponent(targetUser.phone)}`)}
                className="w-full py-2 px-3 bg-[#FDEBEC] hover:bg-[#F9D5D7] active:scale-[0.99] text-[#E31B23] border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>Buka Live Chat (Realtime) dengan Pengguna Ini</span>
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#E31B23]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">1. Semakan KYC (19 Fields)</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
              {targetUser.kyc_status || 'unverified'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">Nama Penuh</span>
              <p className="font-semibold">{targetUser.kyc_identity_full_name || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">MyKad ({targetUser.kyc_identity_id_type || 'MyKad'})</span>
              <p className="font-semibold font-mono">{targetUser.kyc_identity_mykad_number || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Jantina & Tarikh Lahir</span>
              <p className="font-semibold">{[targetUser.kyc_identity_gender, targetUser.kyc_identity_date_of_birth].filter(Boolean).join(' • ') || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Kewarganegaraan</span>
              <p className="font-semibold">{targetUser.kyc_identity_nationality || targetUser.kyc_country || '—'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Alamat Lengkap</span>
              <p className="font-semibold">{[targetUser.kyc_address_line, targetUser.kyc_city, targetUser.kyc_state, targetUser.kyc_postcode, targetUser.kyc_country].filter(Boolean).join(', ') || '—'}</p>
            </div>
            {targetUser.kyc_emergency_contact_name && (
              <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Waris / Kontak Kecemasan</span>
                <p className="font-semibold text-slate-800">
                  {targetUser.kyc_emergency_contact_name} ({targetUser.kyc_emergency_contact_relationship || 'Waris'}) — {targetUser.kyc_emergency_contact_phone}
                </p>
              </div>
            )}
            {targetUser.kyc_verification_verified_at && (
              <div className="col-span-2 text-[10px] text-emerald-700 font-medium">
                Disahkan pada: {new Date(targetUser.kyc_verification_verified_at).toLocaleString('ms-MY')}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['ID / MyKad', targetUser.kyc_documents_id_image_url],
              ['Wajah', targetUser.kyc_documents_face_image_url],
              ['Selfie Bersama ID', targetUser.kyc_documents_selfie_image_url],
            ].map(([label, url]) => (
              <div key={String(label)} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 truncate">{label}</div>
                {url ? (
                  <img src={String(url)} alt={String(label)} className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Tiada</div>
                )}
              </div>
            ))}
          </div>

          {targetUser.kyc_status !== 'verified' && (
            <div className="grid grid-cols-3 gap-2">
              <button type="button" disabled={isProcessing} onClick={() => void updateTargetUser({ kyc_status: 'under_review', kyc_is_verified: false, kyc_verification_verified_at: null })} className="py-2.5 bg-slate-700 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">Semak</button>
              <button type="button" disabled={isProcessing || !targetUser.kyc_documents_id_image_url || !targetUser.kyc_documents_face_image_url || !targetUser.kyc_documents_selfie_image_url} onClick={() => void updateTargetUser({ kyc_status: 'verified', kyc_is_verified: true, kyc_verification_verified_at: new Date().toISOString() })} className="py-2.5 bg-emerald-700 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">Approve</button>
              <button type="button" disabled={isProcessing} onClick={() => void updateTargetUser({ kyc_status: 'rejected', kyc_is_verified: false, kyc_verification_verified_at: null })} className="py-2.5 bg-red-700 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">Reject</button>
            </div>
          )}
        </section>

        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100"><div className="flex items-center gap-2 min-w-0"><Layers className="w-4 h-4 text-[#E31B23] shrink-0" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">2. Semakan Pinjaman</h3></div><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 shrink-0">{targetUser.loan_status || 'Tiada'}</span></div>
          <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-xs">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Jumlah Dipohon:</span><span className="font-bold">{formatMYR(targetUser.loan_applied_amount || targetUser.loan_amount || 0)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Tempoh:</span><span className="font-bold">{targetUser.loan_tenure_months || 0} Bulan</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Ansuran:</span><span className="font-bold text-[#E31B23]">{formatMYR(targetUser.loan_monthly_installment || 0)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Kelulusan:</span><span className="font-semibold">{targetUser.loan_approved ? 'Approved' : 'Belum Diluluskan'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Pengaktifan:</span><span className={`font-semibold ${targetUser.loan_is_active ? 'text-emerald-700' : 'text-slate-600'}`}>{targetUser.loan_is_active ? 'Aktif' : 'Tidak Aktif'}</span></div>
          </div>
          {targetUser.loan_status === 'Under Review' && <div className="grid grid-cols-2 gap-2"><button type="button" disabled={isProcessing} onClick={handleApproveLoan} className="py-2.5 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Luluskan</button><button type="button" disabled={isProcessing} onClick={() => setShowRejectLoanConfirm(true)} className="py-2.5 px-3 bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"><XCircle className="w-3.5 h-3.5" /> Tolak</button></div>}
          {targetUser.loan_status === 'Approved' && !targetUser.loan_is_active && <button type="button" onClick={() => setShowNewBillForm(true)} className="w-full h-12 bg-[#E31B23] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 text-amber-300" /> Aktifkan Akaun & Jana Bil</button>}
        </section>

        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">2. Pembayaran</h3></div><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{pendingConfirmations.length} Menunggu</span></div>
          {pendingConfirmations.length === 0 ? <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">Tiada pengesahan pembayaran yang belum disemak.</div> : <div className="space-y-3">{pendingConfirmations.map((b) => <div key={b.id} className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5"><div className="flex justify-between items-start gap-3"><div className="min-w-0"><h4 className="text-xs font-bold truncate">{b.bill_name}</h4><span className="text-[10px] text-slate-500">ID: {b.id}</span></div><span className="text-xs font-black text-[#E31B23] shrink-0">{formatMYR(b.amount)}</span></div><div className="bg-white p-2.5 rounded-lg text-[11px] space-y-1"><div className="flex justify-between"><span className="text-slate-500">Kaedah:</span><span className="font-semibold uppercase">{b.confirmation?.payment_method === 'duitnow_qr' ? 'DuitNow QR' : 'Pindahan Bank'}</span></div><div className="flex justify-between"><span className="text-slate-500">Tarikh:</span><span>{b.confirmation?.submitted_at ? new Date(b.confirmation.submitted_at).toLocaleTimeString() : '-'}</span></div></div><div className="grid grid-cols-2 gap-2"><button type="button" disabled={isProcessing} onClick={() => handleApprovePayment(b.id)} className="py-2 px-3 bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Sahkan</button><button type="button" disabled={isProcessing} onClick={() => handleRejectPayment(b.id)} className="py-2 px-3 bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"><XCircle className="w-3.5 h-3.5" /> Tolak</button></div></div>)}</div>}
        </section>

        {/* 3. SEMAKAN PENGELUARAN (WITHDRAWAL REVIEW V1.3) */}
        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <WalletCards className="w-4 h-4 text-[#E31B23]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                3. Semakan Pengeluaran (Withdrawal)
              </h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pendingWithdrawals.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pendingWithdrawals.length} Menunggu Semakan
            </span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
              Pengguna belum membuat sebarang permohonan pengeluaran tunai.
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => {
                const isPending = w.status === 'pending';
                const isApproved = w.status === 'approved';
                const isRejected = w.status === 'rejected';

                return (
                  <div
                    key={w.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                      isPending
                        ? 'bg-amber-50/70 border-amber-200'
                        : isApproved
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Pengeluaran Tunai</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {w.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          ID: {w.id}
                        </span>
                      </div>
                      <span className="text-sm font-black text-[#E31B23]">
                        {formatMYR(w.amount)}
                      </span>
                    </div>

                    {/* Bank & Details */}
                    <div className="bg-white p-2.5 rounded-lg text-[11px] space-y-1 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bank Penerima:</span>
                        <span className="font-semibold text-slate-800">
                          {w.bank_name || targetUser?.bank_name} (
                          {w.bank_account_number || targetUser?.bank_account_number})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pemegang Akaun:</span>
                        <span className="font-medium text-slate-700">
                          {w.bank_account_name || targetUser?.bank_account_name || targetUser?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Masa Permohonan:</span>
                        <span className="text-slate-700">
                          {new Date(w.created_at).toLocaleString()}
                        </span>
                      </div>
                      {isApproved && w.bill_id && (
                        <div className="flex justify-between pt-1 border-t border-slate-100 text-emerald-700 font-bold">
                          <span>Status Bil:</span>
                          <span>Bil #{w.bill_id} telah dijana (Unpaid)</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Action Buttons */}
                    {isPending && (
                      <div className="pt-1 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id={`btn-approve-withdraw-${w.id}`}
                          disabled={isProcessing}
                          onClick={() => handleReviewWithdrawal(w.id, 'approve')}
                          className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Luluskan (Approve)</span>
                        </button>
                        <button
                          type="button"
                          id={`btn-reject-withdraw-${w.id}`}
                          disabled={isProcessing}
                          onClick={() => handleReviewWithdrawal(w.id, 'reject')}
                          className="py-2.5 px-3 bg-red-700 hover:bg-red-800 active:scale-95 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak (Reject)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">4. Pengurusan Bil</h3><button type="button" onClick={() => setShowNewBillForm(!showNewBillForm)} className="text-[11px] font-bold text-[#E31B23] flex items-center gap-1 shrink-0"><PlusCircle className="w-3.5 h-3.5" /> Jana Bil</button></div>
          {showNewBillForm && <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"><h4 className="font-bold text-slate-900">Konfigurasi Bil Baharu</h4><div><label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Bil *</label><input type="text" value={newBillName} onChange={(e) => setNewBillName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none" /></div><div><label className="block text-[11px] font-semibold text-slate-700 mb-1">Jumlah Bil *</label><input type="number" value={newBillAmount} onChange={(e) => setNewBillAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none" /></div><div className="p-3 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-500">Konfigurasi pembayaran boleh ditetapkan selepas bil diterbitkan.</div><div className="flex gap-2"><button type="button" disabled={isProcessing} onClick={() => void createBill(targetUser.loan_status === 'Approved' && !targetUser.loan_is_active)} className="flex-1 py-2.5 px-3 bg-[#E31B23] text-white font-bold rounded-lg text-xs disabled:opacity-50">{targetUser.loan_status === 'Approved' && !targetUser.loan_is_active ? 'Aktifkan & Jana Bil' : 'Terbitkan Bil'}</button><button type="button" onClick={() => setShowNewBillForm(false)} className="py-2.5 px-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-xs">Batal</button></div></div>}
          {bills.length === 0 ? <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">Belum ada sebarang bil dijana untuk akaun ini.</div> : <div className="space-y-3">{bills.map((b, index) => {
            const draft = paymentDrafts[b.id];
            return (
              <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate text-slate-900">{b.bill_name}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : b.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-[#FDEBEC] text-[#E31B23]'}`}>{b.status}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700">{formatMYR(b.amount)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.status === 'paid' ? (
                      <span className="text-[10px] text-slate-400 font-medium italic">Terkunci</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBillId(editingBillId === b.id ? null : b.id);
                            setEditBillName(b.bill_name);
                            setEditBillAmount(b.amount);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-0.5"
                          title="Ubah Nama/Jumlah Bil"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Ubah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleBillVisibility(b.id, b.is_active)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                        >
                          {b.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {b.is_active ? 'Aktif' : 'Tutup'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Adakah anda pasti mahu memadam bil "${b.bill_name}"?`)) {
                              void handleDeleteBill(b.id);
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                          title="Padam Bil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingBillId === b.id && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-slate-800 block text-[11px]">Ubah Nama & Jumlah Bil</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Bil</label>
                        <input
                          type="text"
                          value={editBillName}
                          onChange={(e) => setEditBillName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Jumlah (RM)</label>
                        <input
                          type="number"
                          value={editBillAmount}
                          onChange={(e) => setEditBillAmount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleUpdateBillDetails(b.id)}
                        className="py-1.5 px-3 bg-[#E31B23] text-white font-bold rounded-lg text-[11px]"
                      >
                        Simpan Perubahan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBillId(null)}
                        className="py-1.5 px-3 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {draft && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Konfigurasi Kaedah Pembayaran
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Berbeza Tiap Bil
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#FDEBEC] border border-red-200 rounded-lg text-[11px] text-[#E31B23] flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Kaedah Pembayaran Khusus Bil Ini (QR & Bank Berbeza Setiap Bil)</span>
                    </div>

                    {/* DuitNow QR */}
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-[#E31B23]" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">DuitNow QR</span>
                            <span className="text-[10px] text-slate-500">Kod QR khusus bagi bil ini</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDuitNowActive(b.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                            draft.duitnow_qr.is_active
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${draft.duitnow_qr.is_active ? 'bg-emerald-300' : 'bg-slate-400'}`} />
                          {draft.duitnow_qr.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </button>
                      </div>

                      {/* Validation Error */}
                      {validationErrors[b.id]?.duitnow_qr && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{validationErrors[b.id]?.duitnow_qr}</span>
                        </div>
                      )}

                      {/* [Upload Image] */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Muat Naik Imej QR
                        </label>
                        <input
                          id={`file-qr-${b.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingField?.billId === b.id}
                          onChange={(e) => void handleBillQrUpload(b.id, index, e.target.files?.[0])}
                          className="w-full text-[11px] file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#E31B23] file:text-white hover:file:bg-[#b5121b] file:cursor-pointer text-slate-600 border border-slate-200 rounded-lg bg-white p-1"
                        />
                        {uploadingField?.billId === b.id && uploadingField.field === 'duitnow_qr' && (
                          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Memuat naik imej DuitNow QR...
                          </span>
                        )}
                      </div>

                      {/* [Preview] */}
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                          Pratonton (Preview)
                        </span>
                        {draft.duitnow_qr.qr_image_url ? (
                          <div className="flex items-start gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                            <img
                              src={draft.duitnow_qr.qr_image_url}
                              alt="DuitNow QR Preview"
                              className="w-24 h-24 object-contain rounded-md border border-slate-100 bg-white"
                              referrerPolicy="no-referrer"
                            />
                            <div className="space-y-1 text-[11px]">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Imej QR Tersedia
                              </span>
                              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                {draft.duitnow_qr.qr_image_url}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  updatePaymentDraft(b.id, 'duitnow_qr', 'qr_image_url', null);
                                  updatePaymentDraft(b.id, 'duitnow_qr', 'is_active', false);
                                }}
                                className="text-[10px] text-red-600 font-bold hover:underline"
                              >
                                Padam Imej
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-[11px] text-slate-400">
                            Tiada gambar QR dimuat naik. Kaedah tidak boleh diaktifkan.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transfer Bank */}
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-[#E31B23]" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">Transfer Bank</span>
                            <span className="text-[10px] text-slate-500">Akaun bank khusus bagi bil ini</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTransferBankActive(b.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                            draft.transfer_bank.is_active
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${draft.transfer_bank.is_active ? 'bg-emerald-300' : 'bg-slate-400'}`} />
                          {draft.transfer_bank.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </button>
                      </div>

                      {/* Validation Error */}
                      {validationErrors[b.id]?.transfer_bank && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{validationErrors[b.id]?.transfer_bank}</span>
                        </div>
                      )}

                      {/* Data Rekening Fields */}
                      <div className="space-y-2 pt-1 border-t border-slate-200/70">
                        <div>
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-1">
                            Nama Bank *
                          </label>
                          <input
                            type="text"
                            value={draft.transfer_bank.bank_name}
                            onChange={(e) => updatePaymentDraft(b.id, 'transfer_bank', 'bank_name', e.target.value)}
                            placeholder="Contoh: CIMB Bank Berhad"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-1">
                            Nama Pemegang Akaun *
                          </label>
                          <input
                            type="text"
                            value={draft.transfer_bank.account_name}
                            onChange={(e) => updatePaymentDraft(b.id, 'transfer_bank', 'account_name', e.target.value)}
                            placeholder="Contoh: CIMB CashPlus Financing"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-600 mb-1">
                            Nombor Akaun *
                          </label>
                          <input
                            type="text"
                            value={draft.transfer_bank.account_number}
                            onChange={(e) => updatePaymentDraft(b.id, 'transfer_bank', 'account_number', e.target.value)}
                            placeholder="Contoh: 7012345678"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void handleSaveBillPaymentConfig(b.id)}
                      className="w-full py-2.5 bg-[#E31B23] hover:bg-[#b5121b] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Konfigurasi Pembayaran</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}</div>}
        </section>

        <section className="bg-white p-4 rounded-xl border border-red-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-red-100 gap-2">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#D92D20]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#D92D20]">4. Zon Bahaya (Padam Akaun)</h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Memadam akaun ini akan membuang rekod pengguna serta semua dokumen KYC dan fail dari storan secara kekal.
          </p>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => setShowDeleteUserConfirm(true)}
            className="w-full py-2.5 bg-white hover:bg-red-50 text-[#D92D20] border border-red-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Padam Akaun Pengguna Ini</span>
          </button>
        </section>
      </div>
      {showRejectLoanConfirm && <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-xl"><div className="flex items-center gap-2 text-red-700"><XCircle className="w-5 h-5" /><h3 className="font-bold text-sm">Tolak Permohonan Pinjaman?</h3></div><p className="text-xs text-slate-600 leading-relaxed">Adakah anda pasti untuk menolak permohonan ini? Status permohonan akan ditukar kepada 'Rejected'.</p><div className="pt-2 flex gap-2"><button type="button" disabled={isProcessing} onClick={() => void handleRejectLoanSubmit()} className="flex-1 py-2 px-3 bg-red-700 text-white font-bold rounded-xl text-xs disabled:opacity-50">Ya, Tolak</button><button type="button" onClick={() => setShowRejectLoanConfirm(false)} className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Batal</button></div></div></div>}
      {showDeleteUserConfirm && <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"><div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-xl"><div className="flex items-center gap-2 text-[#D92D20]"><Trash2 className="w-5 h-5" /><h3 className="font-bold text-sm">Padam Akaun Pengguna?</h3></div><p className="text-xs text-slate-600 leading-relaxed">Adakah anda pasti untuk memadam akaun <strong>{targetUser?.name}</strong> ({targetUser?.phone})? Tindakan ini adalah kekal.</p><div className="pt-2 flex gap-2"><button type="button" disabled={isProcessing} onClick={() => void handleDeleteTargetUser()} className="flex-1 py-2 px-3 bg-[#D92D20] text-white font-bold rounded-xl text-xs disabled:opacity-50">Ya, Padam</button><button type="button" onClick={() => setShowDeleteUserConfirm(false)} className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Batal</button></div></div></div>}
    </StandalonePage>
  );
};
