import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in border border-amber-500/40 backdrop-blur-md"
    >
      <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mod Luar Talian — Memaparkan data cache terkini.</span>
    </div>
  );
};
