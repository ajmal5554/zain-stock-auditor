import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/toaster";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaInstaller } from "@/components/pwa-installer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zain Stock Auditor",
  description:
    "Fast, mobile-first and desktop-ready physical stock audit tool for Zain Gents Palace",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zain Stock",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#f8f9fb] text-slate-900 min-h-dvh selection:bg-indigo-100 selection:text-indigo-900`}
      >
        <PwaInstaller />
        <OfflineBanner />
        <DesktopSidebar />
        <main className="pb-20 md:pb-8 md:pl-60 min-h-screen">
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
