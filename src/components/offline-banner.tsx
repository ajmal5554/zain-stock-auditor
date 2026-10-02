"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getPendingCount, processOfflineQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    setPendingCount(getPendingCount());

    const handleOnline = () => {
      setIsOffline(false);
      setPendingCount(getPendingCount());
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending count periodically
    const interval = setInterval(() => {
      setPendingCount(getPendingCount());
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await processOfflineQueue();
      setPendingCount(getPendingCount());
      if (result.succeeded > 0) {
        // Re-check
        setPendingCount(getPendingCount());
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium animate-slide-up ${
        isOffline
          ? "bg-amber-600/20 text-amber-300 border-b border-amber-500/30"
          : "bg-blue-600/20 text-blue-300 border-b border-blue-500/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <WifiOff size={16} />
        {isOffline
          ? "You're offline — entries will be saved locally"
          : `${pendingCount} pending entries to sync`}
      </div>
      {!isOffline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 transition-colors"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          Sync
        </button>
      )}
    </div>
  );
}
