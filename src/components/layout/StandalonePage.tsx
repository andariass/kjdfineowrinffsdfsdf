import React from 'react';
import { HeaderStandalone } from './HeaderStandalone';

interface StandalonePageProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  fallbackBackUrl?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  bottomAction?: React.ReactNode;
  bottomNav?: React.ReactNode;
}

export const StandalonePage: React.FC<StandalonePageProps> = ({
  title,
  subtitle,
  onBack,
  fallbackBackUrl,
  rightAction,
  children,
  bottomAction,
  bottomNav,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-[#F7F7F8] text-[#17181B] relative overflow-hidden">
      <HeaderStandalone
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        fallbackBackUrl={fallbackBackUrl}
        rightAction={rightAction}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {children}
      </div>
      {bottomAction && (
        <div className="w-full bg-[#FFFFFF] border-t border-[#E4E5E8] p-4 shrink-0 shadow-sm z-20">
          {bottomAction}
        </div>
      )}
      {bottomNav}
    </div>
  );
};
