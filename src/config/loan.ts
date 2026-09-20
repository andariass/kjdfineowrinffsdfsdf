/**
 * CIMB Cash Plus - Loan Configuration & Calculation Engine
 * Centralized mapping and calculations.
 */

export const TENURE_RATES: Record<number, number> = {
  6: 3.99,
  12: 4.66,
  18: 5.33,
  24: 6.00,
  36: 6.67,
  48: 7.34,
  60: 8.01,
};

export const ALLOWED_TENURES = [6, 12, 18, 24, 36, 48, 60] as const;
export type AllowedTenure = typeof ALLOWED_TENURES[number];

export const MIN_LOAN_AMOUNT = 2000;
export const MAX_LOAN_AMOUNT = 100000;
export const DEFAULT_LOAN_AMOUNT = 10000;
export const DEFAULT_TENURE: AllowedTenure = 24;

export interface LoanCalculationResult {
  amount: number;
  tenureMonths: number;
  annualRate: number;
  monthlyRate: number;
  monthlyInstallment: number;
  totalPayable: number;
  totalInterest: number;
}

/**
 * Calculates monthly installment using the standard financial Annuity Formula:
 * PMT = P * [ r(1 + r)^n ] / [ (1 + r)^n - 1 ]
 * where:
 *   P = Principal (loan_amount)
 *   r = Monthly interest rate (annual rate / 12 / 100)
 *   n = Number of months (loan_tenure_months)
 */
export function calculateAnnuity(amount: number, tenureMonths: number): LoanCalculationResult {
  const annualRate = TENURE_RATES[tenureMonths] ?? 6.00;
  const monthlyRate = (annualRate / 100) / 12;

  let monthlyInstallment = 0;
  if (amount > 0 && tenureMonths > 0) {
    if (monthlyRate === 0) {
      monthlyInstallment = amount / tenureMonths;
    } else {
      const factor = Math.pow(1 + monthlyRate, tenureMonths);
      monthlyInstallment = amount * ((monthlyRate * factor) / (factor - 1));
    }
  }

  const roundedInstallment = Math.round(monthlyInstallment * 100) / 100;
  const totalPayable = Math.round(roundedInstallment * tenureMonths * 100) / 100;
  const totalInterest = Math.round((totalPayable - amount) * 100) / 100;

  return {
    amount,
    tenureMonths,
    annualRate,
    monthlyRate,
    monthlyInstallment: roundedInstallment,
    totalPayable,
    totalInterest: Math.max(0, totalInterest),
  };
}

export function formatMYR(value: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const SUPPORTED_BANKS = [
  'CIMB Bank Berhad',
  'Maybank (Malayan Banking Berhad)',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Hong Leong Bank Berhad',
  'AmBank (M) Berhad',
  'Bank Islam Malaysia Berhad',
  'Bank Muamalat Malaysia Berhad',
  'Affin Bank Berhad',
  'Alliance Bank Malaysia Berhad',
  'Standard Chartered Bank Malaysia',
  'HSBC Bank Malaysia Berhad',
  'OCBC Bank (Malaysia) Berhad',
  'UOB Malaysia',
];
