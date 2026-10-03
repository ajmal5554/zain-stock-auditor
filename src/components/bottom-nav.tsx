"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package2, ArrowDownToLine, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package2 },
  { href: "/export", label: "Export", icon: ArrowDownToLine },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/audit" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-colors select-none min-w-[56px]",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-400 active:text-slate-600"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={cn(
                "text-[10px] mt-0.5",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
