import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bill } from '../../types';
import { formatMYR } from '../../config/loan';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Building,
  ChevronRight,
  EyeOff,
} from 'lucide-react';

interface BillCardProps {
  bill: Bill;
  canPay?: boolean;
}

export const BillCard: React.FC<BillCardProps> = ({ bill, canPay = true }) => {
  const navigate = useNavigate();

  const isPaid = bill.status === 'paid';
  const isPending = bill.status === 'pending';
  const isUnpaid = bill.status === 'unpaid';
  const isInactive = !bill.is_active;

  return (
    <div
      onClick={() => navigate(`/bills/${bill.id}`)}
      className={`p-4 rounded-[16px] border transition-all cursor-pointer shadow-2xs active:scale-[0.99] ${
        isPaid
          ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70'
          : isPending
          ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50/80'
          : isInactive
          ? 'bg-[#F7F7F8] border-[#E4E5E8] text-[#686B73]'
          : 'bg-[#FFFFFF] border-[#E4E5E8] hover:border-[#E31B23]/40 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
              isPaid
                ? 'bg-emerald-100 text-[#16834B]'
                : isPending
                ? 'bg-amber-100 text-[#B86E00]'
                : isInactive
                ? 'bg-[#E4E5E8] text-[#686B73]'
                : 'bg-[#FDEBEC] text-[#E31B23]'
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#17181B] tracking-tight leading-tight">
              {bill.bill_name || 'Bil Ansuran CIMB'}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              {/* Payment Methods Available */}
              {bill.duitnow_qr?.is_active && (
                <span className="inline-flex items-center text-[10px] text-[#686B73] font-medium">
                  <QrCode className="w-3 h-3 mr-0.5 text-[#E31B23]" />
                  DuitNow
                </span>
              )}
              {bill.transfer_bank?.is_active && (
                <span className="inline-flex items-center text-[10px] text-[#686B73] font-medium">
                  <Building className="w-3 h-3 mr-0.5 text-blue-600" />
                  Pindahan Bank
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-black text-[#17181B] block">
            {formatMYR(bill.amount)}
          </span>

          {/* Status Badge */}
          {isPaid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#16834B] mt-1">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              Telah Dibayar
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#B86E00] mt-1">
              <Clock className="w-3 h-3 mr-0.5 animate-spin" />
              Pengesahan
            </span>
          )}

          {isUnpaid && bill.is_active && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDEBEC] text-[#E31B23] mt-1">
              Belum Bayar
            </span>
          )}

          {isInactive && isUnpaid && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E4E5E8] text-[#686B73] mt-1">
              <EyeOff className="w-3 h-3 mr-0.5" />
              Tidak Aktif
            </span>
          )}
        </div>
      </div>

      {/* Footer Info / Action */}
      <div className="mt-3 pt-2.5 border-t border-[#E4E5E8] flex items-center justify-between text-xs">
        {isPaid ? (
          <span className="text-[11px] text-[#16834B] font-medium">
            Dibayar pada: {bill.paid_at ? new Date(bill.paid_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </span>
        ) : isPending ? (
          <span className="text-[11px] text-[#B86E00] font-medium">
            Resit pengesahan sedang disemak pentadbir
          </span>
        ) : isInactive ? (
          <span className="text-[11px] text-[#686B73] italic">
            Bil ditandakan tidak aktif oleh pentadbir
          </span>
        ) : (
          <span className="text-[11px] text-[#E31B23] font-semibold flex items-center">
            Sedia untuk dibayar
          </span>
        )}

        <div className="flex items-center text-[#686B73] font-medium text-xs">
          <span>{isPaid ? 'Lihat Resit' : isInactive ? 'Buka Butiran' : 'Bayar Sekarang'}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </div>
      </div>
    </div>
  );
};
