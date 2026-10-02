"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package2, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/audit", label: "Aisle Audit", icon: ClipboardList },
  { href: "/inventory", label: "Live Stock", icon: Package2 },
  { href: "/export", label: "Export Data", icon: ArrowDownToLine },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-1 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-300/40 p-1.5 flex items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/audit" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 select-none",
                isActive
                  ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/25 font-bold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 font-medium"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
              <span className="text-[11px] tracking-tight mt-0.5">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
