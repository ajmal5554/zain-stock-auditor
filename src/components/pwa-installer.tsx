"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    }

    // Check if running in standalone PWA mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers (like iOS Safari) where beforeinstallprompt doesn't fire
      alert(
        "To install on iPhone/iPad: Tap the Share button at the bottom of Safari, then choose 'Add to Home Screen' (+)."
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-indigo-200 shrink-0" />
        <span className="font-semibold tracking-tight">
          Install Zain Stock App for offline store audits
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-white text-indigo-700 font-extrabold px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors shadow-2xs flex items-center gap-1 active:scale-95"
        >
          <Download size={13} />
          <span>Install</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-indigo-200 hover:text-white p-1"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
