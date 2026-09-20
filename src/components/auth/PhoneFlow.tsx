import React, { useState } from 'react';
import { cimbApi } from '../../api/cimb';
import { ArrowRight, Shield, AlertCircle } from 'lucide-react';

interface PhoneFlowProps {
  onSuccess: (data: { phone: string; exists: boolean }) => void;
  initialPhone?: string;
}

/**
 * Strips +60, 60, or leading 0 automatically from entered phone number
 */
export const sanitizePhoneNumber = (input: string): string => {
  if (!input) return '';

  // Remove spaces, hyphens, brackets, dots
  let val = input.replace(/[\s\-\(\)\.]/g, '');

  // Strip international prefix formats at the start
  if (val.startsWith('+60')) {
    val = val.slice(3);
  } else if (val.startsWith('+6')) {
    val = val.slice(2);
  } else if (val.startsWith('+')) {
    val = val.slice(1);
  } else if (val.startsWith('0060')) {
    val = val.slice(4);
  }

  // Strip leading 60 (if user pasted 6012...)
  if (val.startsWith('60')) {
    val = val.slice(2);
  }

  // Strip leading zero(s) (e.g. 012... -> 12...)
  val = val.replace(/^0+/, '');

  // Keep only digits
  val = val.replace(/\D/g, '');

  // Limit length: Malaysian mobile numbers without +60 are 8 to 11 digits
  if (val.length > 11) {
    val = val.slice(0, 11);
  }

  return val;
};

export const PhoneFlow: React.FC<PhoneFlowProps> = ({ onSuccess, initialPhone = '' }) => {
  const [phone, setPhone] = useState(() => sanitizePhoneNumber(initialPhone));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePhoneNumber(e.target.value);
    setPhone(sanitized);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.trim();

    if (!cleanDigits) {
      setError('Sila masukkan nombor telefon bimbit anda');
      return;
    }

    if (cleanDigits.length < 7) {
      setError('Nombor telefon mestilah sekurang-kurangnya 7 digit');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Standardized phone format with international prefix +60
      const standardPhone = `+60${cleanDigits}`;
      let verifiedPhone = standardPhone;
      let exists = false;

      // 1. Primary check with +60 prefix
      const res1 = await cimbApi.check(standardPhone);
      if (res1.success && (res1.data?.exists ?? res1.exists)) {
        exists = true;
        verifiedPhone = res1.data?.phone || (res1 as any).phone || standardPhone;
      } else {
        // 2. Fallback check with 60 prefix (without +)
        const res2 = await cimbApi.check(`60${cleanDigits}`);
        if (res2.success && (res2.data?.exists ?? res2.exists)) {
          exists = true;
          verifiedPhone = res2.data?.phone || (res2 as any).phone || `60${cleanDigits}`;
        } else {
          // 3. Fallback check with legacy 0 prefix (e.g. 012...)
          const res3 = await cimbApi.check(`0${cleanDigits}`);
          if (res3.success && (res3.data?.exists ?? res3.exists)) {
            exists = true;
            verifiedPhone = res3.data?.phone || (res3 as any).phone || `0${cleanDigits}`;
          } else {
            // New user registration defaults to +60
            exists = false;
            verifiedPhone = standardPhone;
          }
        }
      }

      onSuccess({ phone: verifiedPhone, exists });
    } catch (err: any) {
      setError(err.message || 'Ralat sambungan ke pelayan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Selamat Datang ke CIMB Cash Plus
        </h2>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          Masukkan nombor telefon anda untuk memulakan permohonan atau log masuk ke akaun anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="phone-input"
            className="block text-xs font-semibold uppercase tracking-wider text-[#17181B] mb-1.5"
          >
            Nombor Telefon Bimbit
          </label>
          <div className="relative flex items-center h-[52px] rounded-[12px] border border-[#E4E5E8] bg-[#FFFFFF] shadow-2xs focus-within:ring-2 focus-within:ring-[#E31B23] focus-within:border-transparent transition-all overflow-hidden">
            {/* Country code prefix +60 */}
            <div className="flex items-center space-x-1.5 pl-3.5 pr-2.5 h-full border-r border-[#E4E5E8] bg-[#F7F7F8] select-none shrink-0">
              <span className="text-base leading-none" role="img" aria-label="Malaysia">🇲🇾</span>
              <span className="text-sm font-bold text-[#17181B] tracking-tight">+60</span>
            </div>

            {/* Phone Number Input */}
            <input
              type="tel"
              id="phone-input"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="12 345 6789"
              className="w-full h-full px-3.5 bg-transparent text-[#17181B] text-sm font-medium tracking-wide placeholder:text-[#686B73] focus:outline-none disabled:bg-[#F7F7F8] disabled:text-[#686B73]"
              disabled={isLoading}
              autoFocus
            />

            {phone && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setPhone('');
                  if (error) setError(null);
                }}
                className="pr-3 pl-1 text-[#686B73] hover:text-[#17181B] focus:outline-none transition-colors"
                title="Padam nombor telefon"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#F7F7F8] hover:bg-[#E4E5E8] text-xs font-bold text-[#686B73]">
                  ×
                </span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#686B73] mt-1.5">
            Awalan +60 ditetapkan secara automatik. Masukkan baki nombor telefon anda tanpa angka 0 di awal.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FDEBEC] border border-[#D92D20]/30 rounded-[12px] flex items-start space-x-2 text-[#D92D20] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          id="btn-check-phone"
          disabled={isLoading || !phone.trim()}
          className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="inline-flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Menyemak Akaun...</span>
            </span>
          ) : (
            <>
              <span>Teruskan</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-4 flex items-center justify-center space-x-2 text-[#686B73] text-xs">
          <Shield className="w-4 h-4 text-[#16834B]" />
          <span>Dilindungi oleh Keselamatan Perbankan CIMB</span>
        </div>
      </form>
    </div>
  );
};
