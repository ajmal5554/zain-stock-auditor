"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToast: (message: string, type: ToastType) => void = () => {};

export function toast(message: string, type: ToastType = "success") {
  addToast(message, type);
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToast = (message: string, type: ToastType) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(type === "success" ? [50] : [100, 50, 100]);
      }

      setTimeout(() => removeToast(id), 3500);
    };
  }, [removeToast]);

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-400 shrink-0" />,
    error: <AlertTriangle size={20} className="text-red-400 shrink-0" />,
    info: <Info size={20} className="text-blue-400 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    info: "border-blue-500/30",
  };

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-slide-up flex items-center gap-3
            bg-slate-800/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-2xl shadow-black/30
            border ${borders[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm text-slate-100 flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
