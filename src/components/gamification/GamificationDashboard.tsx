import React, { useState } from 'react';
import { CimbUser } from '../../types';
import { computeGamificationProfile, GamificationBadge } from '../../utils/gamification';
import { formatMYR } from '../../config/loan';
import {
  Flame,
  Award,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  FileText,
  ChevronRight,
  Info,
  Gift,
  Coins,
} from 'lucide-react';

interface GamificationDashboardProps {
  user: CimbUser | null;
  compact?: boolean;
}

export const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ user, compact = false }) => {
  const profile = computeGamificationProfile(user);
  const [selectedBadge, setSelectedBadge] = useState<GamificationBadge | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const className = `w-5 h-5 ${isUnlocked ? 'text-[#E31B23]' : 'text-slate-400'}`;
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Building2':
        return <Building2 className={className} />;
      case 'FileText':
        return <FileText className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'CheckCircle2':
        return <CheckCircle2 className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Lock':
        return <Lock className={className} />;
      case 'Sparkles':
      default:
        return <Sparkles className={className} />;
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white rounded-[16px] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">
                Skor Disiplin Kredit
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{profile.repScore}</span>
                <span className="text-[11px] font-bold text-amber-400">{profile.repScoreTier}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div className="bg-white/10 px-2.5 py-1.5 rounded-[10px] border border-white/15">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{profile.paymentStreak}x Streak</span>
              </div>
              <span className="text-[9px] text-slate-300 block">{profile.rewardPoints} Poin Maya</span>
            </div>
          </div>
        </div>

        {/* Milestone Bar (Feature 4) */}
        {profile.totalLoanAmount > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Bebas Hutang (Debt Freedom):</span>
              <span className="font-bold text-emerald-400">{profile.repaymentProgressPercent}% Selesai</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, profile.repaymentProgressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. CREDIT REP SCORE & STREAK CARD */}
      <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#E31B23]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Skor Reputasi & Disiplin Bayaran
            </h3>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
            style={{
              color: profile.tierColor,
              backgroundColor: profile.tierBg,
              borderColor: profile.tierColor + '40',
            }}
          >
            Tier {profile.repScoreTier}
          </span>
        </div>

        {/* Score Display Meter */}
        <div className="p-4 rounded-[14px] bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-300 block">Skor Kredit CashPlus</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black tracking-tight">{profile.repScore}</span>
                <span className="text-xs text-slate-400">/ 850 Max</span>
              </div>
            </div>

            {/* Streak Counter */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold shadow-2xs">
                <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
                <span>{profile.paymentStreak}x Bayaran Streak</span>
              </div>
              <span className="text-[10px] text-slate-300 mt-1">
                Kadar Ketepatan: {profile.onTimeRepaymentRate}%
              </span>
            </div>
          </div>

          {/* Visual Gauge Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-300"
                style={{ width: `${Math.min(100, Math.max(10, ((profile.repScore - 300) / 550) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 px-0.5 font-medium">
              <span>300 (Asas)</span>
              <span>600 (Silver)</span>
              <span>700 (Gold)</span>
              <span>850 (Preferred)</span>
            </div>
          </div>
        </div>

        {/* Perks unlocked by Rep Score */}
        <div className="p-3 bg-[#F7F7F8] rounded-[12px] border border-[#E4E5E8] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-[#17181B] block">Potongan Faedah Dinikmati</span>
              <span className="text-[11px] text-[#686B73]">
                {profile.interestRateDiscount > 0
                  ? `Rebat faedah -${profile.interestRateDiscount.toFixed(2)}% berdasarkan tier anda`
                  : 'Kekalkan streak bayaran untuk diskaun faedah'}
              </span>
            </div>
          </div>
          <span className="font-black text-[#16834B] text-sm shrink-0">
            -{profile.interestRateDiscount.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2. ACHIEVEMENTS & BADGES (Feature 2) */}
      <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-[#E31B23]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Lencana Pencapaian
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {profile.unlockedBadgesCount} / {profile.badges.length} Terbuka
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {profile.badges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`p-3 rounded-[12px] border text-left flex items-start gap-2.5 transition-all ${
                badge.isUnlocked
                  ? 'bg-white border-[#E4E5E8] hover:border-red-300 shadow-2xs'
                  : 'bg-slate-50 border-slate-200/80 opacity-60'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                  badge.isUnlocked ? 'bg-[#FDEBEC] border border-red-100' : 'bg-slate-200'
                }`}
              >
                {renderBadgeIcon(badge.icon, badge.isUnlocked)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[#17181B] truncate block">
                  {badge.title}
                </span>
                <span className="text-[10px] text-[#686B73] line-clamp-1 block">
                  {badge.description}
                </span>
                <div className="mt-1">
                  {badge.isUnlocked ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Dibuka
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                      Terkunci
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. VIRTUAL REWARD POINTS & REBATE (Feature 3) */}
      <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="w-4 h-4 text-[#E31B23]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Ganjaran & Rebat Maya
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPointsModal(true)}
            className="text-[11px] text-[#E31B23] font-bold hover:underline flex items-center gap-0.5"
          >
            <span>Keterangan</span>
            <Info className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-[14px] bg-[#FDEBEC] border border-red-100">
            <span className="text-[10px] text-[#B5121B] uppercase font-bold block">
              Poin Ganjaran Terkumpul
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#E31B23]">{profile.rewardPoints}</span>
              <span className="text-xs font-bold text-[#B5121B]">PTS</span>
            </div>
            <span className="text-[10px] text-[#686B73] mt-1 block">
              +150 pts bagi setiap bil selesai
            </span>
          </div>

          <div className="p-3.5 rounded-[14px] bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] text-emerald-800 uppercase font-bold block">
              Nilai Rebat Yuran
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-700">
                {formatMYR(profile.estimatedRebateMYR)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-800/80 mt-1 block">
              Rebat tunai maya aktif
            </span>
          </div>
        </div>
      </div>

      {/* 4. DEBT FREEDOM PROGRESS (Feature 4) */}
      <div className="bg-[#FFFFFF] rounded-[16px] p-5 border border-[#E4E5E8] shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#E31B23]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17181B]">
              Kemajuan Bebas Hutang (Debt Freedom)
            </h3>
          </div>
          <span className="text-xs font-black text-emerald-600">
            {profile.repaymentProgressPercent}% Selesai
          </span>
        </div>

        {/* Milestone ProgressBar */}
        <div className="space-y-2">
          <div className="w-full bg-[#E4E5E8] h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-[#16834B] h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(5, profile.repaymentProgressPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#686B73] font-medium">
            <span>Telah Dibayar: {formatMYR(profile.totalRepaidAmount)}</span>
            <span>Baki Hutang: {formatMYR(profile.remainingLoanAmount)}</span>
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E4E5E8] text-center text-xs">
          <div className="p-2 rounded-[10px] bg-[#F7F7F8]">
            <span className="text-[10px] text-[#686B73] block">Jumlah Bil</span>
            <span className="font-bold text-[#17181B]">{profile.totalBillsCount}</span>
          </div>
          <div className="p-2 rounded-[10px] bg-emerald-50 text-emerald-800">
            <span className="text-[10px] block">Bil Selesai</span>
            <span className="font-bold">{profile.paidBillsCount}</span>
          </div>
          <div className="p-2 rounded-[10px] bg-amber-50 text-amber-800">
            <span className="text-[10px] block">Baki Bil</span>
            <span className="font-bold">{profile.unpaidBillsCount}</span>
          </div>
        </div>
      </div>

      {/* BADGE DETAIL MODAL */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-sm w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#686B73]">
                Butiran Lencana
              </span>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <div
                className={`w-16 h-16 rounded-[18px] mx-auto flex items-center justify-center shadow-inner ${
                  selectedBadge.isUnlocked ? 'bg-[#FDEBEC] border border-red-200' : 'bg-slate-100'
                }`}
              >
                {renderBadgeIcon(selectedBadge.icon, selectedBadge.isUnlocked)}
              </div>
              <h4 className="text-base font-extrabold text-[#17181B]">{selectedBadge.title}</h4>
              <p className="text-xs text-[#686B73] leading-relaxed px-3">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-3 bg-[#F7F7F8] rounded-[12px] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#686B73]">Status:</span>
                <span className={selectedBadge.isUnlocked ? 'font-bold text-emerald-700' : 'text-slate-500'}>
                  {selectedBadge.isUnlocked ? 'Telah Dibuka ✓' : 'Masih Terkunci'}
                </span>
              </div>
              {selectedBadge.unlockedAtText && (
                <div className="flex justify-between">
                  <span className="text-[#686B73]">Tarikh Dicapai:</span>
                  <span className="font-medium text-[#17181B]">{selectedBadge.unlockedAtText}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="w-full h-11 bg-[#17181B] text-white font-bold rounded-[12px] text-xs hover:bg-black transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* POINTS INFO MODAL */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#17181B]">Formula Poin & Rebat Maya</h4>
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#686B73]">
              <div className="p-2.5 rounded-[10px] bg-slate-50 border border-slate-200">
                <span className="font-bold text-[#17181B] block">Pengumpulan Poin:</span>
                <ul className="list-disc list-inside space-y-1 mt-1 text-[11px]">
                  <li>+50 Poin: Pengesahan MyKad (KYC) selesai</li>
                  <li>+50 Poin: Memautkan akaun bank aktif</li>
                  <li>+50 Poin: Menetapkan PIN keselamatan</li>
                  <li>+100 Poin: Kelulusan pinjaman CashPlus</li>
                  <li>+150 Poin: Setiap bayaran ansuran selesai tepat pada masanya</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="font-bold block">Rebat Faedah & Yuran:</span>
                <p className="text-[11px] mt-0.5">
                  Mata ganjaran digunakan sebagai kiraan kredit disiplin untuk kelayakan rebat faedah sehingga 0.50% setahun.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPointsModal(false)}
              className="w-full h-11 bg-[#E31B23] text-white font-bold rounded-[12px] text-xs hover:bg-[#B5121B] transition-all"
            >
              Faham
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
