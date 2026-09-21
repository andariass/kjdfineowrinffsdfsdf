import { CimbUser } from '../types';

export interface GamificationBadge {
  id: string;
  title: string;
  description: string;
  category: 'kyc' | 'loan' | 'repayment' | 'loyalty';
  icon: string;
  isUnlocked: boolean;
  unlockedAtText?: string;
}

export type RepScoreTier = 'Bronze' | 'Silver' | 'Gold' | 'CIMB Preferred Platinum';

export interface GamificationProfile {
  // 1. Credit Rep Score & Streak
  repScore: number; // 300 - 850
  repScoreTier: RepScoreTier;
  tierColor: string;
  tierBg: string;
  paymentStreak: number; // consecutive paid bills count
  onTimeRepaymentRate: number; // percentage 0 - 100

  // 2. Badges
  badges: GamificationBadge[];
  unlockedBadgesCount: number;

  // 3. Rebate & Virtual Reward Points
  rewardPoints: number; // 100 points per paid bill + 50 points KYC + 50 points active loan
  estimatedRebateMYR: number; // RM 0.10 per 10 points
  interestRateDiscount: number; // up to 0.50% based on tier

  // 4. Milestone Progress (Debt Freedom Progress)
  totalLoanAmount: number;
  totalRepaidAmount: number;
  remainingLoanAmount: number;
  repaymentProgressPercent: number; // 0 - 100
  totalBillsCount: number;
  paidBillsCount: number;
  unpaidBillsCount: number;
}

export function computeGamificationProfile(user: CimbUser | null): GamificationProfile {
  if (!user) {
    return {
      repScore: 350,
      repScoreTier: 'Bronze',
      tierColor: '#686B73',
      tierBg: '#F7F7F8',
      paymentStreak: 0,
      onTimeRepaymentRate: 0,
      badges: [],
      unlockedBadgesCount: 0,
      rewardPoints: 0,
      estimatedRebateMYR: 0,
      interestRateDiscount: 0,
      totalLoanAmount: 0,
      totalRepaidAmount: 0,
      remainingLoanAmount: 0,
      repaymentProgressPercent: 0,
      totalBillsCount: 0,
      paidBillsCount: 0,
      unpaidBillsCount: 0,
    };
  }

  const bills = Array.isArray(user.bills) ? user.bills : [];
  const paidBills = bills.filter((b) => b.status === 'paid');
  const unpaidBills = bills.filter((b) => b.status !== 'paid');

  const totalBillsCount = bills.length;
  const paidBillsCount = paidBills.length;
  const unpaidBillsCount = unpaidBills.length;

  // Streak: count consecutive paid bills from the end of the bills list or count paid bills
  const paymentStreak = paidBillsCount;

  // Repayment on-time rate
  const onTimeRepaymentRate =
    totalBillsCount > 0 ? Math.round((paidBillsCount / totalBillsCount) * 100) : user.loan_is_active ? 100 : 0;

  // Base score 500
  let score = 500;
  if (user.kyc_is_verified || user.kyc_status === 'verified') score += 80;
  else if (user.kyc_status === 'submitted' || user.kyc_status === 'under_review') score += 40;

  if (user.bank_account_number) score += 30;
  if (user.has_pin || user.pin) score += 20;

  if (user.loan_status === 'Approved') score += 50;
  if (user.loan_is_active) score += 50;

  // +25 per paid bill
  score += Math.min(paidBillsCount * 25, 120);

  // Cap score between 300 and 850
  const repScore = Math.min(850, Math.max(300, score));

  // Determine Tier
  let repScoreTier: RepScoreTier = 'Bronze';
  let tierColor = '#8A6D3B';
  let tierBg = '#FCF8E3';
  let interestRateDiscount = 0.0;

  if (repScore >= 780) {
    repScoreTier = 'CIMB Preferred Platinum';
    tierColor = '#E31B23';
    tierBg = '#FDEBEC';
    interestRateDiscount = 0.5;
  } else if (repScore >= 700) {
    repScoreTier = 'Gold';
    tierColor = '#D97706';
    tierBg = '#FEF3C7';
    interestRateDiscount = 0.35;
  } else if (repScore >= 600) {
    repScoreTier = 'Silver';
    tierColor = '#475569';
    tierBg = '#F1F5F9';
    interestRateDiscount = 0.15;
  }

  // Badges Definitions
  const badges: GamificationBadge[] = [
    {
      id: 'kyc_verified',
      title: 'Identiti Sah (KYC)',
      description: 'Lengkapkan pengesahan identiti MyKad & butiran peribadi.',
      category: 'kyc',
      icon: 'ShieldCheck',
      isUnlocked: Boolean(user.kyc_is_verified || user.kyc_status === 'verified'),
      unlockedAtText: user.kyc_verification_verified_at
        ? new Date(user.kyc_verification_verified_at).toLocaleDateString('ms-MY')
        : undefined,
    },
    {
      id: 'bank_linked',
      title: 'Akaun Terhubung',
      description: 'Pautkan akaun bank pengkreditan yang sah.',
      category: 'kyc',
      icon: 'Building2',
      isUnlocked: Boolean(user.bank_account_number && user.bank_name),
    },
    {
      id: 'loan_applied',
      title: 'Pemohon CashPlus',
      description: 'Hantar permohonan pembiayaan peribadi pertama.',
      category: 'loan',
      icon: 'FileText',
      isUnlocked: Boolean(user.loan_status !== null || user.loan_applied_amount > 0 || user.loan_amount > 0),
    },
    {
      id: 'loan_approved',
      title: 'Kredit Diluluskan',
      description: 'Menerima kelulusan pembiayaan dari CIMB.',
      category: 'loan',
      icon: 'Award',
      isUnlocked: Boolean(user.loan_status === 'Approved' || user.loan_approved || user.loan_is_active),
    },
    {
      id: 'first_payment',
      title: 'Pembayar Permulaan',
      description: 'Selesaikan bayaran ansuran bulanan yang pertama.',
      category: 'repayment',
      icon: 'CheckCircle2',
      isUnlocked: paidBillsCount >= 1,
    },
    {
      id: 'streak_master',
      title: 'Disiplin Emas (Streak 3x)',
      description: 'Mencapai rentetan sekurang-kurangnya 3 bayaran berturut-turut.',
      category: 'repayment',
      icon: 'Flame',
      isUnlocked: paymentStreak >= 3,
    },
    {
      id: 'security_pin',
      title: 'Kubu Selamat',
      description: 'Tetapkan kod PIN keselamatan 6-digit untuk akaun anda.',
      category: 'loyalty',
      icon: 'Lock',
      isUnlocked: Boolean(user.has_pin || user.pin),
    },
    {
      id: 'debt_freedom',
      title: 'Bebas Hutang',
      description: 'Selesaikan kesemua ansuran pinjaman sepenuhnya.',
      category: 'repayment',
      icon: 'Sparkles',
      isUnlocked: totalBillsCount > 0 && unpaidBillsCount === 0,
    },
  ];

  const unlockedBadgesCount = badges.filter((b) => b.isUnlocked).length;

  // Reward Points computation
  // 50 for KYC + 50 for Bank + 50 for PIN + 100 per paid bill
  let rewardPoints = 0;
  if (user.kyc_is_verified || user.kyc_status === 'verified') rewardPoints += 50;
  if (user.bank_account_number) rewardPoints += 50;
  if (user.has_pin || user.pin) rewardPoints += 50;
  if (user.loan_status === 'Approved') rewardPoints += 100;
  rewardPoints += paidBillsCount * 150;

  const estimatedRebateMYR = Math.round((rewardPoints / 100) * 5 * 100) / 100;

  // Milestone Progress (Debt Freedom)
  const totalLoanAmount = user.loan_total_payable || user.loan_approved_amount || user.loan_amount || 0;
  const totalRepaidAmount = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  const remainingLoanAmount = Math.max(0, totalLoanAmount - totalRepaidAmount);
  const repaymentProgressPercent =
    totalLoanAmount > 0
      ? Math.min(100, Math.round((totalRepaidAmount / totalLoanAmount) * 100))
      : totalBillsCount > 0
      ? Math.min(100, Math.round((paidBillsCount / totalBillsCount) * 100))
      : 0;

  return {
    repScore,
    repScoreTier,
    tierColor,
    tierBg,
    paymentStreak,
    onTimeRepaymentRate,
    badges,
    unlockedBadgesCount,
    rewardPoints,
    estimatedRebateMYR,
    interestRateDiscount,
    totalLoanAmount,
    totalRepaidAmount,
    remainingLoanAmount,
    repaymentProgressPercent,
    totalBillsCount,
    paidBillsCount,
    unpaidBillsCount,
  };
}
