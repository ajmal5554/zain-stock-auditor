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
        setPendingCount(getPendingCount());
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold animate-slide-up ${
        isOffline
          ? "bg-amber-50 text-amber-900 border-b border-amber-200"
          : "bg-blue-50 text-blue-900 border-b border-blue-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <WifiOff size={15} />
        {isOffline
          ? "Offline Mode — Entries will be saved to phone and synced later"
          : `${pendingCount} offline counts pending sync`}
      </div>
      {!isOffline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors font-bold"
        >
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
          Sync
        </button>
      )}
    </div>
  );
}
