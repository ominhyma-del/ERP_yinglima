import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { offlineOutbox } from '../../lib/offlineOutbox';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };
    const handleOffline = () => setIsOnline(false);

    const handleOutboxUpdate = (e: any) => {
      setPendingCount(e.detail?.count ?? offlineOutbox.getQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-outbox-updated', handleOutboxUpdate);

    setPendingCount(offlineOutbox.getQueue().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-outbox-updated', handleOutboxUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await offlineOutbox.flushQueue();
    setPendingCount(offlineOutbox.getQueue().length);
    setIsSyncing(false);
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 transition-all duration-300">
      <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 backdrop-blur-md text-xs font-semibold ${
        !isOnline
          ? 'bg-amber-900/95 text-amber-100 border-amber-500/50'
          : 'bg-emerald-900/95 text-emerald-100 border-emerald-500/50'
      }`}>
        {!isOnline ? (
          <>
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 animate-pulse">
              <WifiOff size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-200">Network Disconnected (Offline Mode)</p>
              <p className="text-[11px] text-amber-300/80">
                Form inputs are safely cached in local outbox queue ({pendingCount} pending).
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-bold text-emerald-200">Network Restored</p>
              <p className="text-[11px] text-emerald-300/80">
                {pendingCount} offline action(s) ready to sync automatically.
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="ml-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> Sync Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};
