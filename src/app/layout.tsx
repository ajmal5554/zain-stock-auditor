import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/toaster";
import { OfflineBanner } from "@/components/offline-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zain Stock Auditor",
  description:
    "Fast, mobile-first physical stock audit tool for Zain Gents Palace",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-dvh`}
      >
        <OfflineBanner />
        <main className="pb-20">{children}</main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
