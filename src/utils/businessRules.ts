import { CimbUser, Bill } from '../types';

/**
 * Centralized business predicates.
 * Do not duplicate business conditions across multiple components.
 */

/**
 * Satu-satunya source of truth untuk menentukan KYC selesai:
 * kyc_is_verified === true
 */
export function isKycVerified(user: CimbUser | null | undefined): boolean {
  return Boolean(
    user?.kyc_status === 'verified' &&
    user?.kyc_is_verified === true &&
    Boolean(user?.kyc_verification_verified_at)
  );
}

/**
 * KYC dianggap complete hanya apabila backend telah mengesahkan KYC.
 */

/**
 * Bank dianggap complete hanya jika ketiga field tersedia:
 * bank_name, bank_account_name, bank_account_number
 */
export function isBankComplete(user: CimbUser | null | undefined): boolean {
  return Boolean(
    user?.bank_name?.trim() &&
    user?.bank_account_name?.trim() &&
    user?.bank_account_number?.trim()
  );
}

/**
 * Check if loan status is 'Under Review'
 */
export function isLoanUnderReview(user: CimbUser | null | undefined): boolean {
  return user?.loan_status === 'Under Review';
}

/**
 * Check if loan is approved
 */
export function isLoanApproved(user: CimbUser | null | undefined): boolean {
  return user?.loan_status === 'Approved' && user?.loan_approved === true;
}

/**
 * Loan dianggap active hanya jika:
 * loan_status === "Approved" && loan_is_active === true
 */
export function isLoanActive(user: CimbUser | null | undefined): boolean {
  return Boolean(
    user?.loan_status === 'Approved' &&
    user?.loan_approved === true &&
    user?.loan_is_active === true
  );
}

/**
 * Active Bill:
 * is_active === true
 */
export function isActiveBill(bill: Bill): boolean {
  return bill.is_active === true;
}

/**
 * Inactive Bill:
 * is_active === false
 */
export function isInactiveBill(bill: Bill): boolean {
  return bill.is_active === false;
}

/**
 * Paid Bill:
 * status === "paid"
 */
export function isPaidBill(bill: Bill): boolean {
  return bill.status === 'paid';
}

/**
 * Payable Bill:
 * unpaid + is_active === true
 */
export function isPayableBill(bill: Bill): boolean {
  return bill.status === 'unpaid' && bill.is_active === true;
}
