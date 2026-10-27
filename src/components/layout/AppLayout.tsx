import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { FloatingSOSButton } from './FloatingSOSButton';
import { startSyncEngine } from '@/services/syncEngine';
import { CheckCircle2, Download, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);

  useEffect(() => {
    // 1. Start background outbox synchronization engine
    const cleanupSync = startSyncEngine();

    // 2. Listen to custom sync success events for reconnect toast
    const handleSyncEvent = (e: any) => {
      const count = e.detail?.count || 1;
      setSyncToastMessage(`Synced ${count} queued item${count > 1 ? 's' : ''} with emergency responders.`);
      setTimeout(() => {
        setSyncToastMessage(null);
      }, 4000);
    };

    window.addEventListener('relief-desk-synced', handleSyncEvent);

    // 3. PWA Install Prompt Listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      cleanupSync();
      window.removeEventListener('relief-desk-synced', handleSyncEvent);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredInstallPrompt(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <Header />

      {/* Sync Success Toast */}
      {syncToastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Install PWA Prompt Banner */}
      {showInstallPrompt && (
        <aside
          aria-label="Install Relief Desk PWA"
          className="bg-blue-600 text-white px-4 py-2.5 text-xs flex items-center justify-between gap-3 shadow-md z-30"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">
              Install Relief Desk for full offline operation and instant access.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 rounded-lg bg-white text-blue-700 font-bold hover:bg-blue-50 transition"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="p-1 hover:bg-blue-700 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <FloatingSOSButton />
      <BottomNav />
    </div>
  );
};
