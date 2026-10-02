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

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");
toast.info = (message: string) => toast(message, "info");

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
    success: <CheckCircle size={20} className="text-emerald-600 shrink-0" />,
    error: <AlertTriangle size={20} className="text-rose-600 shrink-0" />,
    info: <Info size={20} className="text-blue-600 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
    error: "border-rose-200 bg-rose-50/90 text-rose-950",
    info: "border-blue-200 bg-blue-50/90 text-blue-950",
  };

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-slide-up flex items-center gap-3
            backdrop-blur-md rounded-xl px-4 py-3 shadow-lg shadow-slate-200/80
            border ${borders[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
