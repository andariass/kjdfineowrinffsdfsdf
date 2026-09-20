import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterFlowProps {
  phone: string;
  onBackToPhone: () => void;
  onSuccess: () => void;
}

export const RegisterFlow: React.FC<RegisterFlowProps> = ({ phone, onBackToPhone, onSuccess }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sila masukkan nama penuh anda seperti dalam MyKad');
      return;
    }
    if (!password || password.length < 6) {
      setError('Kata laluan mestilah sekurang-kurangnya 6 aksara');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await register(name.trim(), phone, password);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Pendaftaran gagal. Sila cuba lagi.');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2 mb-4">
        <button
          type="button"
          onClick={onBackToPhone}
          className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
          title="Tukar nombor telefon"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Langkah 2 dari 2: Daftar Akaun Baru
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Cipta Akaun CIMB Cash Plus
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Nombor <span className="font-semibold text-slate-900">{phone}</span> belum berdaftar. Lengkapkan butiran untuk mendaftar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Nama Penuh (seperti dalam MyKad)
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              id="name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Muhammad Ali bin Ahmad"
              className="w-full h-[52px] pl-11 pr-4 bg-[#FFFFFF] border border-[#E4E5E8] rounded-[12px] text-[#17181B] text-sm font-medium placeholder:text-[#686B73] focus:outline-none focus:ring-2 focus:ring-[#E31B23] focus:border-transparent transition-all shadow-2xs"
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#17181B] mb-1.5">
            Cipta Kata Laluan
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#686B73]">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="register-password-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Minimum 6 aksara"
              className="w-full h-[52px] pl-11 pr-11 bg-[#FFFFFF] border border-[#E4E5E8] rounded-[12px] text-[#17181B] text-sm font-medium placeholder:text-[#686B73] focus:outline-none focus:ring-2 focus:ring-[#E31B23] focus:border-transparent transition-all shadow-2xs"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[#686B73] hover:text-[#17181B] p-1"
              aria-label={showPassword ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#686B73] mt-1.5">
            Gunakan kata laluan yang selamat dan mudah diingati.
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
          id="btn-register-submit"
          disabled={isLoading || !name.trim() || !password}
          className="w-full h-[52px] px-4 bg-[#E31B23] hover:bg-[#B5121B] active:scale-[0.99] text-white font-bold rounded-[12px] text-sm shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="inline-flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Mendaftar Akaun...</span>
            </span>
          ) : (
            <>
              <span>Daftar & Teruskan</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onBackToPhone}
            className="text-xs font-semibold text-[#E31B23] hover:underline"
          >
            Tukar nombor telefon
          </button>
        </div>
      </form>
    </div>
  );
};
