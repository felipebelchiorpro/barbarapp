import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-600/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl border border-amber-400/30 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>Modo Offline — Navegando em cache PWA</span>
    </div>
  );
};
