"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:shadow-slate-200/80 group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:p-4",
          description: "group-[.toast]:text-slate-500 text-xs",
          actionButton:
            "group-[.toast]:bg-indigo-600 group-[.toast]:text-white font-medium rounded-lg",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700 font-medium rounded-lg",
          success:
            "group-[.toaster]:!border-emerald-200 group-[.toaster]:!bg-emerald-50 group-[.toaster]:!text-emerald-900",
          error:
            "group-[.toaster]:!border-rose-200 group-[.toaster]:!bg-rose-50 group-[.toaster]:!text-rose-900",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
