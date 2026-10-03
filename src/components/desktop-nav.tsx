"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package2,
  ArrowDownToLine,
  SlidersHorizontal,
  ShoppingBag,
  Sparkles,
  Database,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  {
    href: "/audit",
    label: "Aisle Audit",
    description: "Physical rack count & entry",
    icon: ClipboardList,
  },
  {
    href: "/inventory",
    label: "Live Stock",
    description: "Real-time SKU catalog & edits",
    icon: Package2,
  },
  {
    href: "/export",
    label: "Export Center",
    description: "Excel (.xlsx) & CSV reports",
    icon: ArrowDownToLine,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Brands, scales & attributes",
    icon: SlidersHorizontal,
  },
] as const;

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Brand Logo & Store Title ── */}
          <Link
            href="/audit"
            className="flex items-center gap-3 group select-none transition-transform active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-100 group-hover:scale-105 transition-all">
              <ShoppingBag size={20} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  Zain Gents Palace
                </span>
                <Badge
                  variant="success"
                  className="text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider"
                >
                  Auditor
                </Badge>
              </div>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Physical Stock Control Terminal
              </span>
            </div>
          </Link>

          {/* ── Primary Navigation Links ── */}
          <nav className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || (href === "/audit" && pathname === "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none",
                    isActive
                      ? "bg-white text-indigo-700 shadow-sm shadow-slate-200/80 font-bold border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 active:scale-98"
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-indigo-600 stroke-[2.4]"
                        : "text-slate-400 group-hover:text-slate-600 stroke-[1.8]"
                    )}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right Status & Cloud Indicator ── */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Database size={13} className="text-emerald-700" />
              <span>Neon Cloud DB</span>
            </div>

            <Link
              href="/audit"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-600/25 transition-all"
            >
              <Sparkles size={13} />
              <span>New Scan</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
