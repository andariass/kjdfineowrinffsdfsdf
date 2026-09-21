import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, User, Bell } from 'lucide-react';
import { isKycVerified } from '../../utils/businessRules';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { PWAPushSettingsModal } from '../pwa/PWAPushSettingsModal';

interface HeaderProps {
  title?: string;
  showGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showGreeting = true }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isProfileActive = location.pathname === '/profile';
  const [showPwaModal, setShowPwaModal] = useState(false);

  return (
    <>
      <header className="w-full h-[56px] bg-gradient-to-r from-[#E31B23] to-[#B5121B] text-white px-3 sm:px-4 shrink-0 shadow-sm border-b border-[#9A0F16] flex items-center">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* CIMB Red Logo Mark */}
            <div className="w-8 h-8 rounded-[8px] bg-white flex items-center justify-center shadow-xs shrink-0">
              <span className="font-extrabold text-[#E31B23] text-xs tracking-tighter">CIMB</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white truncate">Cash Plus</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-[4px] bg-black/25 text-white/95 border border-white/20">
                  OCTO
                </span>
              </div>
              {showGreeting && user?.name && (
                <p className="text-[11px] text-white/90 truncate max-w-[120px] sm:max-w-[150px]">
                  Hai, {user.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* In-App PWA Install Button (Header variant) */}
            <PWAInstallButton variant="header" />

            {/* Push Notifications & PWA Settings Button */}
            <button
              id="header-notification-btn"
              type="button"
              onClick={() => setShowPwaModal(true)}
              className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 backdrop-blur-xs transition"
              title="Notifikasi Push & PWA"
              aria-label="Tetapan Notifikasi Push"
            >
              <Bell className="w-4 h-4" />
            </button>

            {isKycVerified(user) ? (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                <UserCheck className="w-3 h-3 mr-1 text-emerald-300" />
                KYC Sah
              </span>
            ) : null}

            {/* Tombol Profil di Header */}
            <Link
              to="/profile"
              id="header-profile-btn"
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs transition-all duration-150 active:scale-95 ${
                isProfileActive
                  ? 'bg-white text-[#E31B23] font-bold shadow-xs'
                  : 'bg-white/15 hover:bg-white/25 text-white font-medium border border-white/25 backdrop-blur-xs'
              }`}
              aria-label="Profil Pengguna"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'Profil'}
                  className="w-4 h-4 rounded-full object-cover shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              <span className="font-semibold hidden xs:inline">Profil</span>
            </Link>
          </div>
        </div>
        {title && (
          <div className="mt-2 pt-2 border-t border-red-800/50">
            <h1 className="text-base font-bold tracking-tight text-white">{title}</h1>
          </div>
        )}
      </header>

      <PWAPushSettingsModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
    </>
  );
};
