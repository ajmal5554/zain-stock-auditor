"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package2,
  ArrowDownToLine,
  SlidersHorizontal,
  ShoppingBag,
  Plus,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/audit",
    label: "Aisle Rack Audit",
    sublabel: "Physical counting matrix",
    icon: ClipboardList,
  },
  {
    href: "/inventory",
    label: "Live Inventory",
    sublabel: "SKU edits & valuation",
    icon: Package2,
  },
  {
    href: "/export",
    label: "Export Reports",
    sublabel: "Excel (.xlsx) & CSV sheets",
    icon: ArrowDownToLine,
  },
  {
    href: "/settings",
    label: "Catalog Settings",
    sublabel: "Brands, scales & attributes",
    icon: SlidersHorizontal,
  },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200/90 z-40 select-none shadow-xs">
      {/* ── Brand & Store Header ── */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/audit" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-100 group-hover:scale-105 transition-all shrink-0">
            <ShoppingBag size={20} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                Zain Gents Palace
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Stock Control Terminal</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Primary Action CTA ── */}
      <div className="p-3">
        <Link
          href="/audit"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-sm shadow-indigo-600/25 transition-all"
        >
          <Plus size={16} />
          <span>Start New Rack Scan</span>
        </Link>
      </div>

      {/* ── Navigation Links ── */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
          Store Operations
        </div>

        {NAV_ITEMS.map(({ href, label, sublabel, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/audit" && pathname === "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {isActive && (
                <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-indigo-600" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isActive
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                )}
              >
                <Icon size={16} className={isActive ? "stroke-[2.4]" : "stroke-[1.8]"} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{label}</span>
                <span className={cn("text-[10px] font-normal truncate mt-0.5", isActive ? "text-indigo-600" : "text-slate-400")}>
                  {sublabel}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Footer: Neon Cloud Status Widget ── */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Database size={13} className="text-emerald-600" />
              <span>Neon Cloud DB</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            ep-patient-recipe-b4oi6unp
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center px-1">
          Zain Stock Auditor • Light PWA
        </div>
      </div>
    </aside>
  );
}
