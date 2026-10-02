"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:p-4",
          description: "group-[.toast]:text-slate-400 text-xs",
          actionButton:
            "group-[.toast]:bg-indigo-600 group-[.toast]:text-white font-medium rounded-lg",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300 font-medium rounded-lg",
          success:
            "group-[.toaster]:!border-emerald-500/40 group-[.toaster]:!bg-slate-900/95 group-[.toaster]:!text-emerald-400",
          error:
            "group-[.toaster]:!border-rose-500/40 group-[.toaster]:!bg-slate-900/95 group-[.toaster]:!text-rose-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
