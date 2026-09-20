/**
 * CIMB Cash Plus — Production Centralized API Client
 * Base URL: https://oszqantvugvbvydlizix.supabase.co/functions/v1/cimb
 */

import {
  ApiResponse,
  CimbAction,
  CimbUser,
  RegisterRequest,
  LoginRequest,
  CheckResponse,
  Bill,
} from '../types';
import { getSupabaseClient } from '../lib/supabase';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://oszqantvugvbvydlizix.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zenFhbnR2dWd2YnZ5ZGxpeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTg4MTUsImV4cCI6MjA5MDI5NDgxNX0.31-1oMeFxchomBaM9hXrvmn8o8lsua7Y5DfT2JdJ1z8';

export const CIMB_BASE_URL = `${SUPABASE_URL}/functions/v1/cimb`;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Centralized cimbRequest helper
 * Strictly compliant with API Contract V1 targeting canonical Edge Function `cimb`
 */
export async function cimbRequest<T = unknown>(
  action: CimbAction,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const url = new URL(CIMB_BASE_URL);
  url.searchParams.set('action', action);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const defaultHeaders: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const headers: Record<string, string> = {
    ...defaultHeaders,
  };

  let requestBody: BodyInit | undefined = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData) {
      requestBody = options.body;
      // Do not set Content-Type for FormData; browser sets boundary automatically
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(options.body);
    }
  }

  const mergedHeaders: Record<string, string> = {
    ...headers,
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: mergedHeaders,
      body: requestBody,
    });

    const result = await response.json().catch(() => ({
      success: false,
      error: `Network error: HTTP ${response.status}`,
    }));

    return result as ApiResponse<T>;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Gagal menyambung ke perkhidmatan API CIMB';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * cimbApi: Exposes all 7 actions required by API Contract V1
 */
export const cimbApi = {
  /**
   * GET ?action=check&phone=...
   */
  async check(phone: string): Promise<ApiResponse<CheckResponse>> {
    return cimbRequest<CheckResponse>('check', {
      method: 'GET',
      params: { phone: phone.trim() },
    });
  },

  /**
   * POST ?action=register
   * Field wajib: name, phone, password (role otomatis 'user')
   */
  async register(data: RegisterRequest): Promise<ApiResponse<CimbUser>> {
    return cimbRequest<CimbUser>('register', {
      method: 'POST',
      body: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        password: data.password,
      },
    });
  },

  /**
   * POST ?action=login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<CimbUser>> {
    return cimbRequest<CimbUser>('login', {
      method: 'POST',
      body: {
        phone: credentials.phone.trim(),
        password: credentials.password,
      },
    });
  },

  /**
   * GET ?action=get
   * Prioritizes x-phone and x-password headers to prevent exposing credentials in URL/query
   */
  async get(credentials?: {
    phone?: string;
    password?: string;
    all?: boolean;
  }): Promise<ApiResponse<CimbUser | CimbUser[]>> {
    const headers: Record<string, string> = {};

    if (credentials?.phone) {
      headers['x-phone'] = credentials.phone.trim();
    }
    if (credentials?.password) {
      headers['x-password'] = credentials.password;
    }

    const params: Record<string, string | boolean> = {};
    if (credentials?.all) {
      params.all = 'true';
    }

    return cimbRequest<CimbUser | CimbUser[]>('get', {
      method: 'GET',
      headers,
      params,
    });
  },

  /**
   * POST ?action=update
   * User can update own record; Admin can specify target_phone
   */
  async update(payload: {
    phone?: string;
    password?: string;
    target_phone?: string;
    data: Partial<Omit<CimbUser, 'phone' | 'created_at' | 'updated_at'>>;
  }): Promise<ApiResponse<CimbUser>> {
    const headers: Record<string, string> = {};
    if (payload.phone) headers['x-phone'] = payload.phone.trim();
    if (payload.password) headers['x-password'] = payload.password;

    return cimbRequest<CimbUser>('update', {
      method: 'POST',
      headers,
      body: {
        phone: payload.phone?.trim(),
        password: payload.password,
        target_phone: payload.target_phone?.trim(),
        data: payload.data,
      },
    });
  },

  /**
   * POST ?action=upload
   * Supported fields: avatar, kyc_id, kyc_face, kyc_selfie, bill_qr, bill_bank
   * For bill_qr / bill_bank: bill_index is required
   */
  async upload(options: {
    phone?: string;
    password?: string;
    field: 'avatar' | 'kyc_id' | 'kyc_face' | 'kyc_selfie' | 'bill_qr' | 'bill_bank' | 'bill_bank_image';
    file: File;
    bill_index?: number;
    target_phone?: string;
  }): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('field', options.field);
    formData.append('file', options.file);

    if (options.phone) formData.append('phone', options.phone.trim());
    if (options.password) formData.append('password', options.password);
    if (options.bill_index !== undefined) {
      formData.append('bill_index', String(options.bill_index));
    }
    if (options.target_phone) formData.append('target_phone', options.target_phone.trim());

    const headers: Record<string, string> = {};
    if (options.phone) headers['x-phone'] = options.phone.trim();
    if (options.password) headers['x-password'] = options.password;

    return cimbRequest<{ url: string }>('upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  /**
   * GET ?action=stream
   * SSE stream authenticated with x-phone/x-password headers.
   * The Edge Function emits an initial snapshot and subsequent user updates.
   */
  async stream(
    credentials: { phone: string; password: string },
    onUser: (user: CimbUser | null, deleted?: boolean) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = new URL(CIMB_BASE_URL);
    url.searchParams.set('action', 'stream');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'x-phone': credentials.phone.trim(),
        'x-password': credentials.password,
      },
      signal,
    });
    if (!response.ok) {
      // Fallback to Supabase Realtime channel subscription if Edge Function SSE is unavailable
      try {
        const supabase = getSupabaseClient();
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const channel = supabase
          .channel(`cimb_user_rt_${credentials.phone.trim()}_${uniqueSuffix}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'cimb_users',
              filter: `phone=eq.${credentials.phone.trim()}`,
            },
            (payload: any) => {
              if (payload.eventType === 'DELETE') {
                onUser(null, true);
              } else if (payload.new) {
                onUser(payload.new as CimbUser, false);
              }
            }
          )
          .subscribe();

        if (signal) {
          signal.addEventListener('abort', () => {
            try {
              void supabase.removeChannel(channel);
            } catch (err) {
              console.warn('[cimbApi] Error removing fallback user channel:', err);
            }
          });
        }
        return;
      } catch {
        // Fall through
      }

      const body = await response.text().catch(() => '');
      let message = 'SSE stream failed: HTTP ' + response.status;
      try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {}
      throw new Error(message);
    }
    if (!response.body) throw new Error('SSE stream body tidak tersedia');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          const dataLines = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim());
          if (dataLines.length === 0) continue;
          try {
            const payload = JSON.parse(dataLines.join('\n')) as { success?: boolean; data?: CimbUser | null; deleted?: boolean; error?: string };
            if (payload.success && Object.prototype.hasOwnProperty.call(payload, 'data')) onUser(payload.data ?? null, payload.deleted === true);
            else if (payload.success === false && payload.error) throw new Error(payload.error);
          } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * POST ?action=delete
   * Success data: { phone: string }
   */
  async delete(credentials: {
    phone?: string;
    password?: string;
    target_phone?: string;
  }): Promise<ApiResponse<{ phone?: string; deleted?: boolean }>> {
    const headers: Record<string, string> = {};
    if (credentials.phone) headers['x-phone'] = credentials.phone.trim();
    if (credentials.password) headers['x-password'] = credentials.password;

    return cimbRequest<{ phone?: string; deleted?: boolean }>('delete', {
      method: 'POST',
      headers,
      body: {
        phone: credentials.phone?.trim(),
        password: credentials.password,
        target_phone: credentials.target_phone?.trim(),
      },
    });
  },

  /**
   * Withdrawal Flow V1.3: check-pin
   * Checks if user has a 6-digit security PIN set
   */
  async checkPin(credentials: {
    phone: string;
    password?: string;
  }): Promise<ApiResponse<{ has_pin: boolean; phone: string }>> {
    const phone = credentials.phone.trim();
    const headers: Record<string, string> = {};
    if (credentials.password) headers['x-password'] = credentials.password;
    if (phone) headers['x-phone'] = phone;

    const res = await cimbRequest<{ has_pin: boolean; phone: string }>('check-pin' as CimbAction, {
      method: 'POST',
      headers,
      body: { phone, password: credentials.password },
    });

    if (res.success && res.has_pin !== undefined) {
      if (res.has_pin) {
        try { localStorage.setItem(`cimb_has_pin_${phone}`, 'true'); } catch {}
      }
      return res;
    }

    // Fallback: Query via cimbApi.get
    try {
      const getRes = await cimbApi.get({ phone, password: credentials.password });
      if (getRes.success && getRes.data && !Array.isArray(getRes.data)) {
        const u = getRes.data as CimbUser;
        const hasPinInDb = Boolean(u.has_pin || (u.pin && String(u.pin).trim().length === 6));
        const hasPinInStorage = localStorage.getItem(`cimb_has_pin_${phone}`) === 'true';
        const hasPin = hasPinInDb || hasPinInStorage;
        return {
          success: true,
          action: 'check-pin',
          has_pin: hasPin,
          phone,
        };
      }
    } catch {
      // ignore
    }

    const hasPinStored = localStorage.getItem(`cimb_has_pin_${phone}`) === 'true';
    return {
      success: true,
      action: 'check-pin',
      has_pin: hasPinStored,
      phone,
    };
  },

  /**
   * Withdrawal Flow V1.3: set-pin
   * Sets user's 6-digit security PIN
   */
  async setPin(payload: {
    phone: string;
    password?: string;
    pin: string;
    confirm_pin?: string;
  }): Promise<ApiResponse<{ message: string; has_pin: boolean }>> {
    const phone = payload.phone.trim();
    const pin = String(payload.pin || '').trim();
    const confirmPin = payload.confirm_pin ? String(payload.confirm_pin).trim() : pin;

    if (!/^\d{6}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN mestilah tepat 6 digit angka.',
      };
    }

    if (pin !== confirmPin) {
      return {
        success: false,
        error: 'Pengesahan PIN tidak sepadan.',
      };
    }

    const headers: Record<string, string> = {};
    if (payload.password) headers['x-password'] = payload.password;
    if (phone) headers['x-phone'] = phone;

    const res = await cimbRequest<{ message: string; has_pin: boolean }>('set-pin' as CimbAction, {
      method: 'POST',
      headers,
      body: {
        phone,
        password: payload.password,
        pin,
        confirm_pin: confirmPin,
      },
    });

    if (res.success) {
      try {
        localStorage.setItem(`cimb_has_pin_${phone}`, 'true');
        localStorage.setItem(`cimb_pin_hash_${phone}`, btoa(pin));
      } catch {}
      return res;
    }

    // Fallback: use cimbApi.update directly
    const updateRes = await cimbApi.update({
      phone,
      password: payload.password,
      data: { pin },
    });

    if (updateRes.success) {
      try {
        localStorage.setItem(`cimb_has_pin_${phone}`, 'true');
        localStorage.setItem(`cimb_pin_hash_${phone}`, btoa(pin));
      } catch {}
      return {
        success: true,
        action: 'set-pin',
        message: 'PIN berjaya dicipta.',
        has_pin: true,
      };
    }

    return {
      success: false,
      error: updateRes.error || 'Gagal menyimpan PIN keselamatan.',
    };
  },

  /**
   * Withdrawal Flow V1.3: withdraw
   * Verifies PIN and creates a pending withdrawal request
   */
  async withdraw(payload: {
    phone: string;
    password?: string;
    amount: number;
    pin: string;
  }): Promise<ApiResponse<{ id: string; amount: number; status: string }>> {
    const phone = payload.phone.trim();
    const pin = String(payload.pin || '').trim();
    const amount = Number(payload.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Jumlah pengeluaran tidak sah.' };
    }

    if (!/^\d{6}$/.test(pin)) {
      return { success: false, error: 'Sila masukkan 6-digit PIN keselamatan.' };
    }

    const headers: Record<string, string> = {};
    if (payload.password) headers['x-password'] = payload.password;
    if (phone) headers['x-phone'] = phone;

    const res = await cimbRequest<{ id: string; amount: number; status: string }>('withdraw' as CimbAction, {
      method: 'POST',
      headers,
      body: {
        phone,
        password: payload.password,
        amount,
        pin,
      },
    });

    if (res.success) {
      return res;
    }

    // If edge function returned specific PIN error (e.g. PIN salah), return it immediately
    if (res.error && res.error.includes('PIN')) {
      return res;
    }

    // Fallback via cimbApi.get and cimbApi.update
    const getRes = await cimbApi.get({ phone, password: payload.password });
    if (!getRes.success || !getRes.data || Array.isArray(getRes.data)) {
      return { success: false, error: ('error' in getRes && getRes.error) ? getRes.error : 'Gagal mengesahkan maklumat pengguna.' };
    }

    const u = getRes.data as CimbUser;
    // Backend/client-side verify PIN
    const storedHash = localStorage.getItem(`cimb_pin_hash_${phone}`);
    if (storedHash && atob(storedHash) !== pin) {
      return { success: false, error: 'PIN keselamatan tidak tepat. Sila cuba lagi.' };
    }
    if (u.pin && String(u.pin).trim() !== pin) {
      return { success: false, error: 'PIN keselamatan tidak tepat. Sila cuba lagi.' };
    }

    const withdrawalRecord = {
      id: `WD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      type: 'withdrawal' as const,
      amount,
      status: 'pending' as const,
      bank_name: u.bank_name || '-',
      bank_account_number: u.bank_account_number || '-',
      bank_account_name: u.bank_account_name || u.name || '-',
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      reject_reason: null,
      bill_id: null,
    };

    const currentBills = Array.isArray(u.bills) ? u.bills : [];
    const updatedBills = [withdrawalRecord as any, ...currentBills];

    const updateRes = await cimbApi.update({
      phone,
      password: payload.password,
      data: { bills: updatedBills },
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || 'Gagal memproses permohonan pengeluaran.' };
    }

    return {
      success: true,
      action: 'withdraw',
      data: withdrawalRecord,
      message: 'Permohonan pengeluaran berjaya dihantar dan kini berstatus Pending.',
    };
  },

  /**
   * Withdrawal Flow V1.3: reviewWithdrawal (Admin only)
   * Reject -> status = rejected (no bill created)
   * Approve -> status = approved (creates new bill with status unpaid)
   */
  async reviewWithdrawal(payload: {
    phone: string;
    password?: string;
    target_phone: string;
    withdrawal_id: string;
    decision: 'approve' | 'reject';
    reject_reason?: string;
  }): Promise<ApiResponse<unknown>> {
    const headers: Record<string, string> = {};
    if (payload.password) headers['x-password'] = payload.password;
    if (payload.phone) headers['x-phone'] = payload.phone.trim();

    const res = await cimbRequest('review-withdrawal' as CimbAction, {
      method: 'POST',
      headers,
      body: payload,
    });

    if (res.success) {
      return res;
    }

    // Fallback via get & update
    const getRes = await cimbApi.get({ phone: payload.phone, password: payload.password, all: true });
    if (!getRes.success || !Array.isArray(getRes.data)) {
      return { success: false, error: 'Gagal mendapatkan data pengguna untuk semakan.' };
    }

    const targetUser = (getRes.data as CimbUser[]).find((u) => u.phone === payload.target_phone.trim());
    if (!targetUser) {
      return { success: false, error: 'Pengguna sasaran tidak ditemui.' };
    }

    const billsList = Array.isArray(targetUser.bills) ? [...targetUser.bills] : [];
    const wdIndex = billsList.findIndex((b: any) => b.id === payload.withdrawal_id);
    if (wdIndex === -1) {
      return { success: false, error: 'Permohonan pengeluaran tidak ditemui.' };
    }

    const targetWithdrawal: any = { ...billsList[wdIndex] };
    const now = new Date().toISOString();

    if (payload.decision === 'reject') {
      targetWithdrawal.status = 'rejected';
      targetWithdrawal.reviewed_at = now;
      targetWithdrawal.reviewed_by = 'admin';
      targetWithdrawal.reject_reason = payload.reject_reason || null;
      billsList[wdIndex] = targetWithdrawal;

      const upd = await cimbApi.update({
        phone: payload.phone,
        password: payload.password,
        target_phone: payload.target_phone,
        data: { bills: billsList },
      });

      return {
        success: upd.success,
        action: 'review-withdrawal',
        data: targetWithdrawal,
        error: ('error' in upd && upd.error) ? upd.error : '',
        message: 'Permohonan pengeluaran telah ditolak.',
      };
    }

    // Approve: Create new Bill with status = unpaid
    const newBillId = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newBill: Bill = {
      id: newBillId,
      phone: payload.target_phone,
      bill_name: `Bayaran Pengeluaran Tunai RM ${Number(targetWithdrawal.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      amount: Number(targetWithdrawal.amount || 0),
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

    targetWithdrawal.status = 'approved';
    targetWithdrawal.reviewed_at = now;
    targetWithdrawal.reviewed_by = 'admin';
    targetWithdrawal.bill_id = newBillId;
    billsList[wdIndex] = targetWithdrawal;

    const updatedBills = [newBill, ...billsList];
    const upd = await cimbApi.update({
      phone: payload.phone,
      password: payload.password,
      target_phone: payload.target_phone,
      data: { bills: updatedBills as any },
    });

    return {
      success: upd.success,
      action: 'review-withdrawal',
      withdrawal: targetWithdrawal,
      bill: newBill,
      error: ('error' in upd && upd.error) ? upd.error : '',
      message: 'Pengeluaran diluluskan dan bil berstatus Unpaid berjaya dijana.',
    };
  },
};

/**
 * Helper to extract all withdrawal records for a user
 */
export function extractUserWithdrawals(user: CimbUser | null | undefined): import('../types').Withdrawal[] {
  if (!user) return [];
  if (Array.isArray(user.withdrawals) && user.withdrawals.length > 0) {
    return user.withdrawals;
  }
  if (Array.isArray(user.bills)) {
    return (user.bills as any[])
      .filter((b) => b && (b.type === 'withdrawal' || (typeof b.id === 'string' && b.id.startsWith('WD-'))))
      .map((b) => ({
        id: b.id,
        type: 'withdrawal',
        amount: Number(b.amount || 0),
        status: b.status || 'pending',
        bank_name: b.bank_name || user.bank_name || '-',
        bank_account_number: b.bank_account_number || user.bank_account_number || '-',
        bank_account_name: b.bank_account_name || user.bank_account_name || user.name || '-',
        created_at: b.created_at || new Date().toISOString(),
        reviewed_at: b.reviewed_at || null,
        reviewed_by: b.reviewed_by || null,
        reject_reason: b.reject_reason || null,
        bill_id: b.bill_id || null,
      }));
  }
  return [];
}

/**
 * Helper to filter standard repayment bills (excluding raw withdrawal records)
 */
export function filterStandardBills(bills: import('../types').Bill[] | null | undefined): import('../types').Bill[] {
  if (!Array.isArray(bills)) return [];
  return bills.filter(
    (b: any) => b && b.type !== 'withdrawal' && (!b.id || !String(b.id).startsWith('WD-'))
  );
}
