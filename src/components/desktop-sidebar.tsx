"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package2,
  ArrowDownToLine,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package2 },
  { href: "/export", label: "Export", icon: ArrowDownToLine },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface DesktopSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function DesktopSidebar({
  collapsed = false,
  onToggle,
}: DesktopSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 z-40 select-none transition-[width] duration-200 ease-in-out shadow-2xs",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "border-b border-slate-100 flex items-center transition-all",
          collapsed
            ? "px-2 py-4 flex-col gap-2 justify-center"
            : "px-4 py-4 justify-between"
        )}
      >
        <Link
          href="/audit"
          className="flex items-center gap-2.5 group min-w-0"
          title="Zain Stock Auditor"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs group-hover:bg-indigo-700 transition-colors">
            Z
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <div className="text-sm font-bold text-slate-900 truncate leading-tight">
                Zain Gents Palace
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Stock Auditor
              </div>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center",
              collapsed ? "w-7 h-7 mt-1 text-slate-500" : "w-7 h-7 shrink-0"
            )}
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={cn("flex-1 py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/audit" && pathname === "/");

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-xl transition-all duration-150 group relative",
                collapsed
                  ? "w-11 h-11 mx-auto justify-center"
                  : "gap-2.5 px-3 py-2.5 text-[13px] font-medium",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}

              {/* Tooltip for collapsed rail view */}
              {collapsed && (
                <span className="fixed left-16 ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Status */}
      <div
        className={cn(
          "border-t border-slate-100 flex items-center transition-all",
          collapsed ? "p-3 justify-center flex-col gap-2" : "px-4 py-3 justify-between"
        )}
      >
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {!collapsed && <span>Cloud synced</span>}
        </div>

        {onToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
          >
            Collapse
          </button>
        )}
      </div>
    </aside>
  );
}
