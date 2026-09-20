import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface HeaderStandaloneProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  fallbackBackUrl?: string;
  rightAction?: React.ReactNode;
}

export const HeaderStandalone: React.FC<HeaderStandaloneProps> = ({
  title,
  subtitle,
  onBack,
  fallbackBackUrl,
  rightAction,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (fallbackBackUrl) {
      navigate(fallbackBackUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="w-full h-[56px] bg-gradient-to-r from-[#E31B23] to-[#B5121B] text-white px-4 shrink-0 shadow-sm border-b border-[#9A0F16] flex items-center">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full text-white/90 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center -ml-1"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-white/85 leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
};
