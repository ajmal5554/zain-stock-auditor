"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package2,
  ArrowDownToLine,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package2 },
  { href: "/export", label: "Export", icon: ArrowDownToLine },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-slate-200 z-40 select-none">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/audit" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
            Z
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate leading-tight">
              Zain Gents Palace
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Stock Auditor
            </div>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/audit" && pathname === "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Cloud synced</span>
        </div>
      </div>
    </aside>
  );
}
