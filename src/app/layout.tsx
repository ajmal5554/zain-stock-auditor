import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/toaster";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaInstaller } from "@/components/pwa-installer";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
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
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased bg-[#f8f9fb] text-slate-900 min-h-dvh selection:bg-indigo-100 selection:text-indigo-900`}
      >
        <PwaInstaller />
        <OfflineBanner />
        <AppShell>{children}</AppShell>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
