import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PhoneFlow } from '../components/auth/PhoneFlow';
import { LoginFlow } from '../components/auth/LoginFlow';
import { RegisterFlow } from '../components/auth/RegisterFlow';

type AuthStep = 'phone' | 'login' | 'register';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isKycComplete } = useAuth();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState<string>('');

  const handlePhoneSuccess = ({ phone: verifiedPhone, exists }: { phone: string; exists: boolean }) => {
    setPhone(verifiedPhone);
    if (exists) {
      setStep('login');
    } else {
      setStep('register');
    }
  };

  const handleAuthComplete = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
      return;
    }

    // After login or register, follow post-login rule:
    // Login -> KYC incomplete -> KYC -> KYC complete -> Loan
    if (isKycComplete()) {
      navigate('/loan');
    } else {
      navigate('/kyc');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F7F7F8] text-[#17181B] relative overflow-hidden">
      {/* Top CIMB Branding Banner */}
      <div className="bg-[#E31B23] text-white px-4 pt-10 pb-8 shrink-0 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-12 top-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-[12px] bg-white flex items-center justify-center shadow-md mb-3">
            <span className="font-extrabold text-[#E31B23] text-lg tracking-tighter">CIMB</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CIMB Cash Plus
          </h1>
          <p className="text-white/90 text-xs mt-1 font-medium">
            Pembiayaan Peribadi Tanpa Cagaran Pantas & Mudah
          </p>
        </div>
      </div>

      {/* Auth Content Card */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="bg-[#FFFFFF] rounded-[16px] p-5 shadow-xs border border-[#E4E5E8]">
          {step === 'phone' && (
            <PhoneFlow
              onSuccess={handlePhoneSuccess}
              initialPhone={phone}
            />
          )}

          {step === 'login' && (
            <LoginFlow
              phone={phone}
              onBackToPhone={() => setStep('phone')}
              onSuccess={handleAuthComplete}
            />
          )}

          {step === 'register' && (
            <RegisterFlow
              phone={phone}
              onBackToPhone={() => setStep('phone')}
              onSuccess={handleAuthComplete}
            />
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center space-x-3 p-3 rounded-[12px] bg-[#FFFFFF] border border-[#E4E5E8]">
            <div className="w-2 h-2 rounded-full bg-[#E31B23] shrink-0" />
            <p className="text-xs text-[#686B73] font-medium">
              Kadar faedah serendah <span className="font-bold text-[#17181B]">4.66% setahun</span>
            </p>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-[12px] bg-[#FFFFFF] border border-[#E4E5E8]">
            <div className="w-2 h-2 rounded-full bg-[#16834B] shrink-0" />
            <p className="text-xs text-[#686B73] font-medium">
              Tempoh bayaran fleksibel sehingga <span className="font-bold text-[#17181B]">84 bulan</span>
            </p>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-[12px] bg-[#FFFFFF] border border-[#E4E5E8]">
            <div className="w-2 h-2 rounded-full bg-[#B86E00] shrink-0" />
            <p className="text-xs text-[#686B73] font-medium">
              Bayaran mudah melalui DuitNow QR & Pindahan Bank
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
