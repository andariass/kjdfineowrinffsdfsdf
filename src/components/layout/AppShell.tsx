import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { PWABanner } from '../pwa/PWABanner';
import { PWAFirstOpenModal } from '../pwa/PWAFirstOpenModal';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

export const AppShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-full w-full bg-[#F7F7F8] text-[#17181B] relative overflow-hidden">
      <Header />
      <PWABanner />
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children || <Outlet />}
      </main>
      <BottomNav />
      <OfflineIndicator />
      <PWAFirstOpenModal />
    </div>
  );
};

