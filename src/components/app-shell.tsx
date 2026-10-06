"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { DesktopSidebar } from "@/components/desktop-sidebar";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zain_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar on Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("zain_sidebar_collapsed", String(next));
          } catch {}
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("zain_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed: handleToggle,
      }}
    >
      <DesktopSidebar collapsed={collapsed} onToggle={handleToggle} />
      <main
        className={`pb-20 md:pb-8 min-h-screen transition-[padding] duration-200 ease-in-out ${
          collapsed ? "md:pl-16" : "md:pl-60"
        }`}
      >
        {children}
      </main>
    </SidebarContext.Provider>
  );
}
