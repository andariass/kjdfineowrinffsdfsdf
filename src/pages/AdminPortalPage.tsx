import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cimbApi, extractUserWithdrawals } from '../api/cimbApi';
import { StandalonePage } from '../components/layout/StandalonePage';
import { AdminBottomNav } from '../components/layout/AdminBottomNav';
import { CimbUser, Bill, PaymentMethodType } from '../types';
import { formatMYR } from '../config/loan';
import { isKycVerified } from '../utils/businessRules';
import {
  ShieldAlert,
  RefreshCw,
  UserRound,
  Search,
  LogOut,
  WalletCards,
  ShieldCheck,
  Building2,
  FileText,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  PlusCircle,
  Check,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface AdminBillRow extends Bill {
  userPhone: string;
  userName: string;
  userEmail: string | null;
}

export const AdminPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, logout } = useAuth();
  const [users, setUsers] = useState<CimbUser[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'bills'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState<'all' | 'pending' | 'unpaid' | 'paid' | 'inactive'>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals for Bills Management
  const [configModalBill, setConfigModalBill] = useState<AdminBillRow | null>(null);
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [editBillModal, setEditBillModal] = useState<AdminBillRow | null>(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<AdminBillRow | null>(null);

  // State for Payment Config Form
  const [configDuitNowActive, setConfigDuitNowActive] = useState(false);
  const [configDuitNowQrUrl, setConfigDuitNowQrUrl] = useState('');
  const [configTransferBankActive, setConfigTransferBankActive] = useState(false);
  const [configBankName, setConfigBankName] = useState('');
  const [configAccountName, setConfigAccountName] = useState('');
  const [configAccountNumber, setConfigAccountNumber] = useState('');
  const [configBankImageUrl, setConfigBankImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState<'qr' | 'bank' | null>(null);
  const [configTab, setConfigTab] = useState<'duitnow' | 'bank'>('duitnow');

  // State for Create Bill Form
  const [newBillTargetPhone, setNewBillTargetPhone] = useState('');
  const [newBillName, setNewBillName] = useState('Ansuran Bulanan');
  const [newBillAmount, setNewBillAmount] = useState<number>(500);
  const [newBillQrActive, setNewBillQrActive] = useState(true);
  const [newBillBankActive, setNewBillBankActive] = useState(true);
  const [newBillBankName, setNewBillBankName] = useState('CIMB Bank Berhad');
  const [newBillAccountName, setNewBillAccountName] = useState('CIMB CashPlus Financing Berhad');
  const [newBillAccountNumber, setNewBillAccountNumber] = useState('7088921401');

  // State for Edit Basic Bill Form
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'unpaid' | 'pending' | 'paid'>('unpaid');

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((item) =>
      [item.name, item.phone, item.email || '', item.role, item.loan_status || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [users, userSearch]);

  const loadUsers = async () => {
    if (!session) return;
    setIsLoadingUsers(true);
    const res = await cimbApi.get({ phone: session.phone, password: session.password, all: true });
    setIsLoadingUsers(false);
    if (!res.success || !Array.isArray(res.data)) {
      setNotice({ type: 'error', message: 'error' in res ? res.error : 'Gagal memuatkan senarai pengguna.' });
      return;
    }
    setUsers(res.data);
    setNotice(null);
  };

  useEffect(() => {
    if (user?.role === 'admin' && session) void loadUsers();
  }, [user?.role, session?.phone]);

  // Aggregate all bills across all users
  const allBills = useMemo<AdminBillRow[]>(() => {
    const list: AdminBillRow[] = [];
    users.forEach((u) => {
      if (Array.isArray(u.bills)) {
        u.bills.forEach((b) => {
          list.push({
            ...b,
            userPhone: u.phone,
            userName: u.name || 'Pengguna CIMB',
            userEmail: u.email,
          });
        });
      }
    });
    return list;
  }, [users]);

  // Pending count for badge
  const totalPendingBills = useMemo(
    () => allBills.filter((b) => b.status === 'pending' || b.confirmation?.status === 'pending').length,
    [allBills]
  );
  const totalUnpaidBills = useMemo(() => allBills.filter((b) => b.status === 'unpaid' && b.is_active).length, [allBills]);
  const totalPaidBills = useMemo(() => allBills.filter((b) => b.status === 'paid').length, [allBills]);
  const totalInactiveBills = useMemo(() => allBills.filter((b) => !b.is_active).length, [allBills]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return allBills.filter((b) => {
      const q = billSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.bill_name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.userName.toLowerCase().includes(q) ||
        b.userPhone.includes(q) ||
        (b.transfer_bank?.bank_name && b.transfer_bank.bank_name.toLowerCase().includes(q)) ||
        (b.transfer_bank?.account_number && b.transfer_bank.account_number.includes(q));

      if (!matchesSearch) return false;

      if (billStatusFilter === 'all') return true;
      if (billStatusFilter === 'pending') return b.status === 'pending' || b.confirmation?.status === 'pending';
      if (billStatusFilter === 'unpaid') return b.status === 'unpaid' && b.is_active;
      if (billStatusFilter === 'paid') return b.status === 'paid';
      if (billStatusFilter === 'inactive') return !b.is_active;

      return true;
    });
  }, [allBills, billSearch, billStatusFilter]);

  // Helper to convert file to data URL fallback
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Open config modal for a specific bill
  const openConfigModal = (bill: AdminBillRow) => {
    setConfigModalBill(bill);
    setConfigDuitNowActive(Boolean(bill.duitnow_qr?.is_active));
    setConfigDuitNowQrUrl(bill.duitnow_qr?.qr_image_url || '');
    setConfigTransferBankActive(Boolean(bill.transfer_bank?.is_active));
    setConfigBankName(bill.transfer_bank?.bank_name || 'CIMB Bank Berhad');
    setConfigAccountName(bill.transfer_bank?.account_name || 'CIMB CashPlus Financing Berhad');
    setConfigAccountNumber(bill.transfer_bank?.account_number || '');
    setConfigBankImageUrl(bill.transfer_bank?.bank_image_url || '');
    setConfigTab(bill.duitnow_qr?.is_active ? 'duitnow' : 'bank');
  };

  // Handle uploading QR or Bank slip for modal
  const handleUploadModalFile = async (type: 'qr' | 'bank', file: File) => {
    if (!session || !configModalBill) return;
    setIsUploadingImage(type);
    try {
      const res = await cimbApi.upload({
        phone: session.phone,
        password: session.password,
        target_phone: configModalBill.userPhone,
        field: type === 'qr' ? 'bill_qr' : 'bill_bank',
        file,
      });

      let finalUrl = '';
      if (res.success && res.data?.url) {
        finalUrl = res.data.url;
      } else {
        finalUrl = await readFileAsDataUrl(file);
      }

      if (type === 'qr') {
        setConfigDuitNowQrUrl(finalUrl);
        setConfigDuitNowActive(true);
      } else {
        setConfigBankImageUrl(finalUrl);
        setConfigTransferBankActive(true);
      }
    } catch {
      const fallbackUrl = await readFileAsDataUrl(file);
      if (type === 'qr') {
        setConfigDuitNowQrUrl(fallbackUrl);
        setConfigDuitNowActive(true);
      } else {
        setConfigBankImageUrl(fallbackUrl);
        setConfigTransferBankActive(true);
      }
    } finally {
      setIsUploadingImage(null);
    }
  };

  // Generate automated QR Code for this bill
  const handleGenerateAutoQr = () => {
    if (!configModalBill) return;
    const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=cimb-cashplus-${configModalBill.id}-${configModalBill.amount}&color=17181B`;
    setConfigDuitNowQrUrl(generatedUrl);
    setConfigDuitNowActive(true);
  };

  // Save payment config for this specific bill
  const handleSavePaymentConfig = async () => {
    if (!session || !configModalBill) return;

    if (configDuitNowActive && !configDuitNowQrUrl.trim()) {
      setNotice({ type: 'error', message: 'DuitNow QR tidak boleh aktif tanpa imej kod QR.' });
      return;
    }

    if (configTransferBankActive) {
      if (!configBankName.trim() || !configAccountName.trim() || !configAccountNumber.trim()) {
        setNotice({
          type: 'error',
          message: 'Sila lengkapkan Nama Bank, Nama Pemegang Akaun, dan Nombor Akaun untuk Pindahan Bank.',
        });
        return;
      }
    }

    setIsProcessing(true);
    setNotice(null);

    const targetUser = users.find((u) => u.phone === configModalBill.userPhone);
    if (!targetUser) {
      setIsProcessing(false);
      setNotice({ type: 'error', message: 'Pengguna sasaran tidak ditemui.' });
      return;
    }

    const updatedBills = (targetUser.bills || []).map((b) => {
      if (b.id !== configModalBill.id) return b;
      return {
        ...b,
        duitnow_qr: {
          is_active: configDuitNowActive,
          qr_image_url: configDuitNowQrUrl.trim() || null,
        },
        transfer_bank: {
          is_active: configTransferBankActive,
          bank_name: configBankName.trim() || null,
          account_name: configAccountName.trim() || null,
          account_number: configAccountNumber.trim() || null,
          bank_image_url: configBankImageUrl.trim() || null,
        },
      };
    });

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: targetUser.phone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);

    if (res.success) {
      setConfigModalBill(null);
      setNotice({
        type: 'success',
        message: `Konfigurasi pembayaran bagi bil "${configModalBill.bill_name}" berjaya disimpan.`,
      });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal menyimpan konfigurasi pembayaran.' });
    }
  };

  // Toggle active / inactive status
  const handleToggleActive = async (bill: AdminBillRow) => {
    if (!session) return;
    if (bill.status === 'paid') {
      setNotice({ type: 'error', message: 'Bil yang telah dibayar (Paid) tidak boleh dinonaktifkan.' });
      return;
    }

    setIsProcessing(true);
    const targetUser = users.find((u) => u.phone === bill.userPhone);
    if (!targetUser) return;

    const newActiveState = !bill.is_active;
    const updatedBills = (targetUser.bills || []).map((b) =>
      b.id === bill.id ? { ...b, is_active: newActiveState } : b
    );

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: bill.userPhone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);
    if (res.success) {
      setNotice({
        type: 'success',
        message: `Keterlihatan bil "${bill.bill_name}" ditukar kepada: ${newActiveState ? 'Aktif' : 'Tidak Aktif'}.`,
      });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal mengemaskini status bil.' });
    }
  };

  // Approve payment confirmation
  const handleApprovePayment = async (bill: AdminBillRow) => {
    if (!session) return;
    setIsProcessing(true);
    const targetUser = users.find((u) => u.phone === bill.userPhone);
    if (!targetUser) return;

    const now = new Date().toISOString();
    const updatedBills = (targetUser.bills || []).map((b) =>
      b.id !== bill.id
        ? b
        : {
            ...b,
            status: 'paid' as const,
            paid_at: now,
            is_active: true,
            confirmation: b.confirmation
              ? { ...b.confirmation, status: 'approved' as const }
              : {
                  bill_id: b.id,
                  phone: bill.userPhone,
                  payment_method: (b.duitnow_qr?.is_active ? 'duitnow_qr' : 'transfer_bank') as PaymentMethodType,
                  amount: b.amount,
                  submitted_at: now,
                  status: 'approved' as const,
                },
          }
    );

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: bill.userPhone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);
    if (res.success) {
      setNotice({ type: 'success', message: `Pembayaran bagi bil "${bill.bill_name}" berjaya DISAHKAN (Paid).` });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal meluluskan pembayaran.' });
    }
  };

  // Reject payment confirmation
  const handleRejectPayment = async (bill: AdminBillRow) => {
    if (!session) return;
    setIsProcessing(true);
    const targetUser = users.find((u) => u.phone === bill.userPhone);
    if (!targetUser) return;

    const updatedBills = (targetUser.bills || []).map((b) =>
      b.id !== bill.id
        ? b
        : {
            ...b,
            status: 'unpaid' as const,
            paid_at: null,
            confirmation: b.confirmation ? { ...b.confirmation, status: 'rejected' as const } : null,
          }
    );

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: bill.userPhone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);
    if (res.success) {
      setNotice({
        type: 'success',
        message: `Pengesahan bayaran bagi bil "${bill.bill_name}" telah DITOLAK (Unpaid).`,
      });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal menolak pengesahan bayaran.' });
    }
  };

  // Open Edit Modal
  const openEditModal = (bill: AdminBillRow) => {
    setEditBillModal(bill);
    setEditName(bill.bill_name);
    setEditAmount(bill.amount);
    setEditStatus(bill.status);
  };

  // Save Edit Bill
  const handleSaveEditBill = async () => {
    if (!session || !editBillModal) return;
    if (!editName.trim()) {
      setNotice({ type: 'error', message: 'Nama bil diperlukan.' });
      return;
    }
    if (editAmount <= 0) {
      setNotice({ type: 'error', message: 'Jumlah bil mestilah melebihi RM 0.' });
      return;
    }

    setIsProcessing(true);
    const targetUser = users.find((u) => u.phone === editBillModal.userPhone);
    if (!targetUser) return;

    const updatedBills = (targetUser.bills || []).map((b) => {
      if (b.id !== editBillModal.id) return b;
      return {
        ...b,
        bill_name: editName.trim(),
        amount: Number(editAmount),
        status: editStatus,
        paid_at: editStatus === 'paid' ? b.paid_at || new Date().toISOString() : null,
      };
    });

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: editBillModal.userPhone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);
    if (res.success) {
      setEditBillModal(null);
      setNotice({ type: 'success', message: 'Maklumat bil berjaya dikemaskini.' });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal mengemaskini maklumat bil.' });
    }
  };

  // Delete Bill
  const handleDeleteBill = async () => {
    if (!session || !deleteConfirmBill) return;
    setIsProcessing(true);
    const targetUser = users.find((u) => u.phone === deleteConfirmBill.userPhone);
    if (!targetUser) return;

    const updatedBills = (targetUser.bills || []).filter((b) => b.id !== deleteConfirmBill.id);

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: deleteConfirmBill.userPhone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);
    setDeleteConfirmBill(null);
    if (res.success) {
      setNotice({ type: 'success', message: `Bil "${deleteConfirmBill.bill_name}" berjaya dipadam.` });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal memadam bil.' });
    }
  };

  // Create New Bill for a User
  const handleCreateNewBill = async () => {
    if (!session) return;
    if (!newBillTargetPhone) {
      setNotice({ type: 'error', message: 'Sila pilih pengguna sasaran.' });
      return;
    }
    if (!newBillName.trim()) {
      setNotice({ type: 'error', message: 'Sila masukkan nama bil.' });
      return;
    }
    if (newBillAmount <= 0) {
      setNotice({ type: 'error', message: 'Jumlah bil mestilah lebih daripada RM 0.' });
      return;
    }

    setIsProcessing(true);
    setNotice(null);

    const targetUser = users.find((u) => u.phone === newBillTargetPhone);
    if (!targetUser) {
      setIsProcessing(false);
      setNotice({ type: 'error', message: 'Pengguna sasaran tidak ditemui.' });
      return;
    }

    const billId = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Auto-generate QR URL for DuitNow
    const autoQrUrl = newBillQrActive
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=cimb-cashplus-${billId}-${newBillAmount}&color=17181B`
      : null;

    const newBill: Bill = {
      id: billId,
      phone: targetUser.phone,
      bill_name: newBillName.trim(),
      amount: Number(newBillAmount),
      status: 'unpaid',
      is_active: true,
      paid_at: null,
      duitnow_qr: {
        is_active: newBillQrActive,
        qr_image_url: autoQrUrl,
      },
      transfer_bank: {
        is_active: newBillBankActive,
        bank_name: newBillBankActive ? newBillBankName : null,
        account_name: newBillBankActive ? newBillAccountName : null,
        account_number: newBillBankActive ? newBillAccountNumber : null,
        bank_image_url: null,
      },
      confirmation: null,
    };

    const currentBills = Array.isArray(targetUser.bills) ? targetUser.bills : [];
    const updatedBills = [newBill, ...currentBills];

    const res = await cimbApi.update({
      phone: session.phone,
      password: session.password,
      target_phone: targetUser.phone,
      data: { bills: updatedBills },
    });

    setIsProcessing(false);

    if (res.success) {
      setIsNewBillModalOpen(false);
      setNewBillName('Ansuran Bulanan');
      setNewBillAmount(500);
      setNotice({
        type: 'success',
        message: `Bil baharu (${newBill.bill_name}) berjaya dijana dengan tetapan bayaran khusus!`,
      });
      await loadUsers();
    } else {
      setNotice({ type: 'error', message: res.error || 'Gagal menjana bil baharu.' });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <StandalonePage title="Akses Dihadkan" fallbackBackUrl="/">
        <div className="p-6 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Akses Pentadbir Sahaja</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Halaman ini dikhaskan untuk kakitangan pentadbir kredit CIMB Cash Plus.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-[44px] px-5 bg-[#E31B23] text-white rounded-[12px] text-xs font-bold shadow-sm"
          >
            Kembali ke Laman Utama
          </button>
        </div>
      </StandalonePage>
    );
  }

  return (
    <StandalonePage
      title="Konsol Pentadbir Kredit"
      subtitle="Kawal selia semakan, pengaktifan dan bil CIMB"
      fallbackBackUrl="/admin"
      bottomNav={<AdminBottomNav />}
      rightAction={
        <button
          type="button"
          onClick={logout}
          className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center gap-1.5 text-white text-[11px] font-bold"
          aria-label="Log keluar"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      }
    >
      <div className="space-y-3 pb-6">
        {notice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{notice.message}</span>
          </div>
        )}

        {/* TOP LEVEL SWITCHER: PENGGUNA vs PENGURUSAN BIL */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-2xs">
          <button
            type="button"
            id="tab-admin-users"
            onClick={() => setActiveAdminTab('users')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeAdminTab === 'users'
                ? 'bg-white text-[#E31B23] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserRound className="w-4 h-4" />
            <span>Pengguna</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeAdminTab === 'users' ? 'bg-red-100 text-[#E31B23]' : 'bg-slate-300/70 text-slate-700'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-admin-bills"
            onClick={() => setActiveAdminTab('bills')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
              activeAdminTab === 'bills'
                ? 'bg-white text-[#E31B23] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pengurusan Bil</span>
            {totalPendingBills > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                totalPendingBills > 0
                  ? 'bg-amber-500 text-white'
                  : activeAdminTab === 'bills'
                  ? 'bg-red-100 text-[#E31B23]'
                  : 'bg-slate-300/70 text-slate-700'
              }`}
            >
              {allBills.length}
            </span>
          </button>
        </div>

        {/* ================= VIEW 1: SENARAI PENGGUNA ================= */}
        {activeAdminTab === 'users' && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-[#E31B23]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Senarai Pengguna</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {users.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={isLoadingUsers}
                className="p-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
                aria-label="Muat semula senarai pengguna"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="p-3.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama, telefon, email atau status..."
                  aria-label="Cari pengguna"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                />
              </div>
            </div>
            <div className="px-3.5 pb-3.5 space-y-2" aria-label="Senarai pengguna">
              {isLoadingUsers && users.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Memuatkan pengguna...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Tiada pengguna ditemui.</div>
              ) : (
                filteredUsers.map((item) => {
                  const itemWds = extractUserWithdrawals(item);
                  const pendingWds = itemWds.filter((w) => w.status === 'pending');
                  const kycOk = isKycVerified(item);
                  const userBillsCount = Array.isArray(item.bills) ? item.bills.length : 0;

                  return (
                    <button
                      key={item.phone}
                      type="button"
                      onClick={() => navigate(`/admin/user/${encodeURIComponent(item.phone)}`)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white active:bg-[#FDEBEC] transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 bg-white"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#FDEBEC] border border-red-200 flex items-center justify-center text-[#E31B23] font-bold text-[10px] shrink-0">
                              {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                            {item.role}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-black text-[#E31B23]">
                            {formatMYR(item.balance || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{item.phone}</span>
                        {item.email && <span className="truncate max-w-[140px] lowercase font-sans">{item.email}</span>}
                      </div>

                      {/* Status badges row: KYC, Bank, Loan, Pending WD, Bills */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60 text-[9px] font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${
                            kycOk
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.kyc_status === 'under_review' || item.kyc_status === 'submitted'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>{kycOk ? 'KYC Sah' : item.kyc_status || 'Belum KYC'}</span>
                        </span>

                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          <span>
                            {item.bank_name
                              ? item.bank_name.replace(' Bank Berhad', '').replace(' Berhad', '')
                              : 'Tiada Bank'}
                          </span>
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded-full border ${
                            item.loan_status === 'Approved'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.loan_status === 'Under Review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : item.loan_status === 'Rejected'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          Pinjaman: {item.loan_status || 'Tiada'}
                        </span>

                        {userBillsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                            <FileText className="w-2.5 h-2.5 text-[#E31B23]" />
                            <span>{userBillsCount} Bil</span>
                          </span>
                        )}

                        {pendingWds.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                            <WalletCards className="w-2.5 h-2.5 text-amber-700" />
                            <span>{pendingWds.length} WD Pending</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ================= VIEW 2: PENGURUSAN BIL (ALL BILLS & CONFIG) ================= */}
        {activeAdminTab === 'bills' && (
          <div className="space-y-3">
            {/* METRICS ROW */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setBillStatusFilter('all')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  billStatusFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block opacity-70">Semua</span>
                <span className="text-base font-black">{allBills.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillStatusFilter('pending')}
                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                  billStatusFilter === 'pending'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                }`}
              >
                {totalPendingBills > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
                <span className="text-[10px] uppercase font-bold block opacity-80">Pending</span>
                <span className="text-base font-black">{totalPendingBills}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillStatusFilter('unpaid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  billStatusFilter === 'unpaid'
                    ? 'bg-[#E31B23] text-white border-[#E31B23] shadow-xs'
                    : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100/70'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block opacity-80">Belum Bayar</span>
                <span className="text-base font-black">{totalUnpaidBills}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillStatusFilter('paid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  billStatusFilter === 'paid'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block opacity-80">Selesai</span>
                <span className="text-base font-black">{totalPaidBills}</span>
              </button>
            </div>

            {/* SEARCH & JANA BIL BAR */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    placeholder="Cari bil, pengguna, ID, telefon, atau bank..."
                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadUsers()}
                  disabled={isLoadingUsers}
                  className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  title="Muat semula senarai"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  id="btn-admin-create-bill"
                  onClick={() => {
                    if (users.length > 0 && !newBillTargetPhone) {
                      setNewBillTargetPhone(users[0].phone);
                    }
                    setIsNewBillModalOpen(true);
                  }}
                  className="h-9 px-3 bg-[#E31B23] hover:bg-[#b5121b] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Jana Bil</span>
                </button>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
                <span className="text-slate-400 font-semibold text-[10px] uppercase shrink-0 mr-1">Tapis:</span>
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'pending', label: `Pending (${totalPendingBills})` },
                  { id: 'unpaid', label: `Belum Bayar (${totalUnpaidBills})` },
                  { id: 'paid', label: `Selesai (${totalPaidBills})` },
                  { id: 'inactive', label: `Tidak Aktif (${totalInactiveBills})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBillStatusFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                      billStatusFilter === tab.id
                        ? 'bg-slate-800 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BILLS CARD LIST */}
            <div className="space-y-3">
              {isLoadingUsers && allBills.length === 0 ? (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-[#E31B23] animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Memuatkan senarai pengurusan bil...</p>
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Tiada Bil Ditemui</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {billSearch
                      ? 'Tiada rekod bil yang sepadan dengan carian anda.'
                      : 'Belum ada sebarang bil dijana dalam sistem.'}
                  </p>
                </div>
              ) : (
                filteredBills.map((b) => {
                  const isPaid = b.status === 'paid';
                  const isPending = b.status === 'pending' || b.confirmation?.status === 'pending';
                  const isUnpaid = b.status === 'unpaid';
                  const isInactive = !b.is_active;

                  const hasQrConfigured = Boolean(b.duitnow_qr?.is_active && b.duitnow_qr?.qr_image_url);
                  const hasBankConfigured = Boolean(
                    b.transfer_bank?.is_active &&
                      b.transfer_bank?.bank_name &&
                      b.transfer_bank?.account_name &&
                      b.transfer_bank?.account_number
                  );

                  return (
                    <div
                      key={`${b.userPhone}_${b.id}`}
                      className={`bg-white rounded-xl border p-3.5 shadow-xs space-y-3 transition-all ${
                        isPending
                          ? 'border-amber-300 bg-amber-50/20'
                          : isPaid
                          ? 'border-emerald-200'
                          : isInactive
                          ? 'border-slate-200 bg-slate-50/60 opacity-80'
                          : 'border-slate-200 hover:border-[#E31B23]/40'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">{b.bill_name}</span>
                            {isPaid && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Selesai
                              </span>
                            )}
                            {isPending && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" /> Menunggu Kelulusan
                              </span>
                            )}
                            {isUnpaid && b.is_active && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#E31B23] shrink-0">
                                Belum Bayar
                              </span>
                            )}
                            {isInactive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0 flex items-center gap-1">
                                <EyeOff className="w-3 h-3" /> Tidak Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono">ID: {b.id}</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/user/${encodeURIComponent(b.userPhone)}`)}
                              className="font-medium text-slate-700 hover:text-[#E31B23] hover:underline flex items-center gap-0.5"
                            >
                              <span>{b.userName} ({b.userPhone})</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-[#E31B23] block">{formatMYR(b.amount)}</span>
                          <button
                            type="button"
                            onClick={() => openEditModal(b)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-0.5 ml-auto mt-0.5"
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Ubah
                          </button>
                        </div>
                      </div>

                      {/* Payment Configuration Badge & Summary */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E31B23]" />
                            <span>Kaedah Bayaran Khusus Bil Ini:</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                            Berbeza Tiap Bil
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* QR Info */}
                          <div
                            className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                              hasQrConfigured
                                ? 'bg-white border-emerald-200'
                                : 'bg-white/60 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1 text-slate-800">
                                <QrCode className="w-3.5 h-3.5 text-[#E31B23]" /> DuitNow QR
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  b.duitnow_qr?.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {b.duitnow_qr?.is_active ? 'Aktif' : 'Tutup'}
                              </span>
                            </div>
                            {b.duitnow_qr?.qr_image_url ? (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <img
                                  src={b.duitnow_qr.qr_image_url}
                                  alt="QR Thumb"
                                  className="w-7 h-7 object-contain rounded border border-slate-200 bg-white"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[10px] text-emerald-700 font-semibold truncate">
                                  QR Khusus Ada
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic block">Tiada QR</span>
                            )}
                          </div>

                          {/* Bank Info */}
                          <div
                            className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                              hasBankConfigured
                                ? 'bg-white border-emerald-200'
                                : 'bg-white/60 border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1 text-slate-800">
                                <Building className="w-3.5 h-3.5 text-blue-600" /> Pindahan Bank
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  b.transfer_bank?.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {b.transfer_bank?.is_active ? 'Aktif' : 'Tutup'}
                              </span>
                            </div>
                            {b.transfer_bank?.bank_name ? (
                              <div className="text-[10px] space-y-0.5 min-w-0 pt-0.5">
                                <span className="font-bold text-slate-800 truncate block">
                                  {b.transfer_bank.bank_name}
                                </span>
                                <span className="font-mono text-slate-600 truncate block text-[9px]">
                                  {b.transfer_bank.account_number}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic block">Belum ada</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PENDING PAYMENT CONFIRMATION NOTICE */}
                      {isPending && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Pengesahan Bayaran Masuk Dari Pengguna</span>
                            </span>
                            <span className="text-[10px] font-semibold text-amber-700">
                              {b.confirmation?.submitted_at
                                ? new Date(b.confirmation.submitted_at).toLocaleTimeString('ms-MY', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Baru'}
                            </span>
                          </div>
                          <div className="bg-white/80 p-2 rounded-lg text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Kaedah Dipilih:</span>
                              <span className="font-bold uppercase text-slate-800">
                                {b.confirmation?.payment_method === 'duitnow_qr' ? 'DuitNow QR' : 'Pindahan Bank'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Jumlah Dibayar:</span>
                              <span className="font-bold text-[#E31B23]">{formatMYR(b.amount)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void handleApprovePayment(b)}
                              className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" /> Luluskan Bayaran
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => void handleRejectPayment(b)}
                              className="py-2 px-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Tolak Bayaran
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-between pt-1 gap-2 text-xs">
                        <button
                          type="button"
                          id={`btn-config-qr-bank-${b.id}`}
                          onClick={() => openConfigModal(b)}
                          className="flex-1 py-2 px-3 bg-[#E31B23] hover:bg-[#b5121b] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Tetapan QR & Bank</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPaid || isProcessing}
                          onClick={() => void handleToggleActive(b)}
                          className={`py-2 px-3 rounded-lg font-bold border transition-all flex items-center gap-1 shrink-0 ${
                            b.is_active
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          } ${isPaid ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {b.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{b.is_active ? 'Tutup' : 'Buka'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmBill(b)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 shrink-0"
                          title="Padam Bil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: KONFIGURASI QR & BANK KHUSUS BIL INI ================= */}
      {configModalBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#E31B23]" />
                  <span>Konfigurasi QR & Bank Khusus</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bil: <strong className="text-slate-800">{configModalBill.bill_name}</strong> (
                  <span className="text-[#E31B23] font-bold">{formatMYR(configModalBill.amount)}</span>)
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Pengguna: {configModalBill.userName} ({configModalBill.userPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalBill(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-[11px] text-[#E31B23] space-y-1">
              <span className="font-bold block">✨ Tetapan Bebas Bagi Setiap Bil</span>
              <p className="text-slate-600 leading-relaxed">
                Anda boleh menetapkan kod QR DuitNow dan akaun Bank Penerima yang berbeza bagi setiap bil. Pengguna hanya
                akan melihat maklumat pembayaran khusus bil ini.
              </p>
            </div>

            {/* Sub Tabs: DuitNow QR vs Transfer Bank */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfigTab('duitnow')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  configTab === 'duitnow' ? 'bg-white text-[#E31B23] shadow-xs' : 'text-slate-600'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>1. DuitNow QR</span>
                <span
                  className={`w-2 h-2 rounded-full ${configDuitNowActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('bank')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  configTab === 'bank' ? 'bg-white text-[#E31B23] shadow-xs' : 'text-slate-600'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>2. Pindahan Bank</span>
                <span
                  className={`w-2 h-2 rounded-full ${configTransferBankActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
              </button>
            </div>

            {/* TAB 1: DUITNOW QR */}
            {configTab === 'duitnow' && (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 block">Status DuitNow QR</span>
                    <span className="text-[11px] text-slate-500">
                      {configDuitNowActive ? 'Diaktifkan untuk bil ini' : 'Tidak aktif'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigDuitNowActive(!configDuitNowActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      configDuitNowActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {configDuitNowActive ? 'Aktif' : 'Tutup'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">Muat Naik Imej Kod QR</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploadingImage === 'qr'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadModalFile('qr', file);
                    }}
                    className="w-full text-[11px] file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#E31B23] file:text-white file:cursor-pointer border border-slate-300 rounded-lg p-1 bg-white"
                  />
                  {isUploadingImage === 'qr' && (
                    <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat naik imej QR...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">atau</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAutoQr}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Jana Kod QR Rasmi DuitNow Automatik (QR API)</span>
                </button>

                {/* QR Preview */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Pratonton Imej QR</span>
                  {configDuitNowQrUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={configDuitNowQrUrl}
                        alt="Preview QR"
                        className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1 min-w-0">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Imej QR Disimpan
                        </span>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{configDuitNowQrUrl}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setConfigDuitNowQrUrl('');
                            setConfigDuitNowActive(false);
                          }}
                          className="text-[10px] font-bold text-red-600 hover:underline"
                        >
                          Padam Imej QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-[11px]">
                      Tiada imej QR dimuat naik.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PINDAHAN BANK */}
            {configTab === 'bank' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 block">Status Pindahan Bank</span>
                    <span className="text-[11px] text-slate-500">
                      {configTransferBankActive ? 'Diaktifkan untuk bil ini' : 'Tidak aktif'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigTransferBankActive(!configTransferBankActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      configTransferBankActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {configTransferBankActive ? 'Aktif' : 'Tutup'}
                  </button>
                </div>

                {/* Bank Input Fields */}
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank *</label>
                    <input
                      type="text"
                      value={configBankName}
                      onChange={(e) => setConfigBankName(e.target.value)}
                      placeholder="Contoh: CIMB Bank Berhad"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Pemegang Akaun *</label>
                    <input
                      type="text"
                      value={configAccountName}
                      onChange={(e) => setConfigAccountName(e.target.value)}
                      placeholder="Contoh: CIMB CashPlus Financing Berhad"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombor Akaun Bank *</label>
                    <input
                      type="text"
                      value={configAccountNumber}
                      onChange={(e) => setConfigAccountNumber(e.target.value)}
                      placeholder="Contoh: 7088921401"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Buttons */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSavePaymentConfig}
                className="flex-1 py-2.5 bg-[#E31B23] hover:bg-[#b5121b] active:scale-95 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Konfigurasi Bil</span>
              </button>
              <button
                type="button"
                onClick={() => setConfigModalBill(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: JANA BIL BAHARU ================= */}
      {isNewBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#E31B23]" />
                  <span>Jana Bil Baharu</span>
                </h3>
                <p className="text-xs text-slate-500">Terbitkan bil beserta konfigurasi pembayaran unik</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBillModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Pengguna Sasaran *</label>
                <select
                  value={newBillTargetPhone}
                  onChange={(e) => setNewBillTargetPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.phone} value={u.phone}>
                      {u.name} ({u.phone}) — {u.loan_status || 'Tiada pinjaman'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bil *</label>
                <input
                  type="text"
                  value={newBillName}
                  onChange={(e) => setNewBillName(e.target.value)}
                  placeholder="Contoh: Ansuran Bulanan Pinjaman #1"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jumlah Bil (RM) *</label>
                <input
                  type="number"
                  value={newBillAmount}
                  onChange={(e) => setNewBillAmount(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#E31B23] focus:outline-none"
                />
              </div>

              {/* Quick payment options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Pilihan Pembayaran Segera:
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBillQrActive}
                    onChange={(e) => setNewBillQrActive(e.target.checked)}
                    className="rounded text-[#E31B23] focus:ring-[#E31B23]"
                  />
                  <span className="font-semibold text-slate-800">Aktifkan DuitNow QR (Auto Generate)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBillBankActive}
                    onChange={(e) => setNewBillBankActive(e.target.checked)}
                    className="rounded text-[#E31B23] focus:ring-[#E31B23]"
                  />
                  <span className="font-semibold text-slate-800">Aktifkan Pindahan Bank Segera</span>
                </label>

                {newBillBankActive && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <input
                        type="text"
                        value={newBillBankName}
                        onChange={(e) => setNewBillBankName(e.target.value)}
                        placeholder="Nama Bank"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs mb-1.5"
                      />
                      <input
                        type="text"
                        value={newBillAccountNumber}
                        onChange={(e) => setNewBillAccountNumber(e.target.value)}
                        placeholder="Nombor Akaun"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono mb-1.5"
                      />
                      <input
                        type="text"
                        value={newBillAccountName}
                        onChange={(e) => setNewBillAccountName(e.target.value)}
                        placeholder="Nama Pemegang Akaun"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleCreateNewBill()}
                className="flex-1 py-2.5 bg-[#E31B23] hover:bg-[#b5121b] text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Terbitkan Bil Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewBillModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT BASIC BILL ================= */}
      {editBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">Ubah Maklumat Bil</h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bil</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jumlah (RM)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Bil</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="unpaid">Belum Bayar (Unpaid)</option>
                  <option value="pending">Menunggu Kelulusan (Pending)</option>
                  <option value="paid">Selesai Dibayar (Paid)</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleSaveEditBill()}
                className="flex-1 py-2 bg-[#E31B23] text-white font-bold rounded-lg text-xs"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setEditBillModal(null)}
                className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PADAM BIL CONFIRM ================= */}
      {deleteConfirmBill && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm">Padam Bil Ini?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Adakah anda pasti mahu memadam bil <strong>{deleteConfirmBill.bill_name}</strong> (
              {formatMYR(deleteConfirmBill.amount)}) milik {deleteConfirmBill.userName}? Tindakan ini tidak boleh
              dikembalikan.
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleDeleteBill()}
                className="flex-1 py-2 px-3 bg-red-700 text-white font-bold rounded-xl text-xs disabled:opacity-50"
              >
                Ya, Padam
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmBill(null)}
                className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </StandalonePage>
  );
};
