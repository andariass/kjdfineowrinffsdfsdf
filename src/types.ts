/**
 * CIMB Cash Plus — Production Type Definitions
 * Source of truth: Actual public.cimb_users schema (46 columns) & API Contract V1
 */

export type CimbRole = 'user' | 'admin';
export type Role = CimbRole; // alias for backwards compatibility

export type KycStatus = 'unverified' | 'draft' | 'submitted' | 'under_review' | 'verified' | 'rejected';
export type LoanStatus = 'Under Review' | 'Approved' | 'Rejected' | null;

export type BillPaymentStatus = 'unpaid' | 'pending' | 'paid';

export type PaymentMethodType = 'duitnow_qr' | 'transfer_bank';

export type CimbAction =
  | 'get'
  | 'check'
  | 'login'
  | 'register'
  | 'upload'
  | 'update'
  | 'delete'
  | 'stream'
  | 'check-pin'
  | 'set-pin'
  | 'withdraw'
  | 'review-withdrawal'
  | 'call-create'
  | 'call-accept'
  | 'call-reject'
  | 'call-end';

export type CimbCallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'failed';

export interface CimbCall {
  id: string;
  caller_phone: string;
  receiver_phone: string;
  status: CimbCallStatus;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  ended_by?: string | null;
  end_reason?: string | null;
  last_activity_at?: string | null;
  updated_at?: string | null;
}

export interface CimbCallEvent {
  id: string;
  call_id: string;
  actor_phone: string;
  event_type: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface CimbPushSubscription {
  id: string;
  phone: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface DuitNowQRConfig {
  is_active: boolean;
  qr_image_url: string | null;
}

export interface TransferBankConfig {
  is_active: boolean;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_image_url: string | null;
}

export interface PaymentConfirmation {
  bill_id: string;
  phone: string;
  payment_method: PaymentMethodType;
  amount: number;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Bill {
  id: string;
  phone?: string;
  bill_name: string;
  amount: number;
  status: BillPaymentStatus;
  is_active: boolean;
  paid_at: string | null;
  duitnow_qr?: DuitNowQRConfig;
  transfer_bank?: TransferBankConfig;
  confirmation?: PaymentConfirmation | null;
}

/**
 * public.cimb_users table schema (46 columns)
 * Immutable database source of truth
 */
export interface CimbUser {
  // Identity (10 columns)
  phone: string;
  email: string | null;
  name: string;
  role: CimbRole;
  balance: number;
  created_at: string;
  updated_at: string;
  pin: string | null;
  password?: string;
  avatar: string | null;

  // KYC (19 columns)
  kyc_status: KycStatus | null;
  kyc_is_verified: boolean;
  kyc_address_line: string | null;
  kyc_city: string | null;
  kyc_state: string | null;
  kyc_postcode: string | null;
  kyc_country: string | null;
  kyc_identity_full_name: string | null;
  kyc_identity_gender: string | null;
  kyc_identity_nationality: string | null;
  kyc_identity_id_type: string | null;
  kyc_identity_mykad_number: string | null;
  kyc_identity_date_of_birth: string | null;
  kyc_documents_id_image_url: string | null;
  kyc_documents_face_image_url: string | null;
  kyc_documents_selfie_image_url: string | null;
  kyc_verification_verified_at: string | null;
  kyc_emergency_contact_name: string | null;
  kyc_emergency_contact_phone: string | null;
  kyc_emergency_contact_relationship: string | null;

  // Bank (3 columns)
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;

  // Loan (12 columns)
  loan_amount: number;
  loan_status: LoanStatus;
  loan_approved: boolean;
  loan_interest: number | null;
  loan_is_active: boolean;
  loan_tenure_months: number;
  loan_applied_amount: number;
  loan_approved_amount: number;
  loan_monthly_installment: number;
  loan_interest_rate: number | null;
  loan_total_interest: number | null;
  loan_total_payable: number | null;

  // Bills (1 column - JSONB)
  bills: Bill[];

  // Withdrawal Flow V1.3
  has_pin?: boolean;
  withdrawals?: Withdrawal[];
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface Withdrawal {
  id: string;
  type?: 'withdrawal';
  amount: number;
  status: WithdrawalStatus;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reject_reason?: string | null;
  bill_id?: string | null;
}

export type UserProfile = CimbUser;

/**
 * Sanitized user model for UI state (strips password and PIN)
 */
export type SanitizedUser = Omit<CimbUser, 'password' | 'pin'> & {
  has_pin?: boolean;
  withdrawals?: Withdrawal[];
};

// API Envelopes
export interface ApiSuccess<T = unknown> {
  success: true;
  action: string;
  data?: T;
  exists?: boolean;
  phone?: string;
  has_pin?: boolean;
  message?: string;
  withdrawal?: Withdrawal;
  bill?: Bill;
  access_token?: string;
  call?: CimbCall;
}

export interface ApiError {
  success: false;
  error: string;
  detail?: string;
  allowed_actions?: string[];
  allowed_fields?: string[];
  allowed_types?: string[];
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// API Request/Response Types
export interface CheckResponse {
  exists: boolean;
  phone: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  password: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface GetRequest {
  phone?: string;
  password?: string;
}

export interface UpdateRequest {
  phone?: string;
  password?: string;
  target_phone?: string;
  data: Partial<Omit<CimbUser, 'phone' | 'created_at' | 'updated_at'>>;
}

export interface DeleteRequest {
  phone?: string;
  password?: string;
  target_phone?: string;
}

export interface CheckPinRequest {
  phone: string;
  password?: string;
}

export interface SetPinRequest {
  phone: string;
  password?: string;
  pin: string;
  confirm_pin?: string;
}

export interface WithdrawRequest {
  phone: string;
  password?: string;
  amount: number;
  pin: string;
}

export interface ReviewWithdrawalRequest {
  phone: string;
  password?: string;
  target_phone: string;
  withdrawal_id: string;
  decision: 'approve' | 'reject';
  reject_reason?: string;
}

// Domain Model Wrappers for Application Architecture
export interface Loan {
  amount: number;
  status: LoanStatus;
  approved: boolean;
  isActive: boolean;
  tenureMonths: number;
  appliedAmount: number;
  approvedAmount: number;
  monthlyInstallment: number;
  interestRate: number | null;
  totalInterest: number | null;
  totalPayable: number | null;
}

export type Payment = PaymentConfirmation;
