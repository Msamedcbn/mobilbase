import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { RuntimeGuard } from "@/components/runtime-guard";
import { AppChrome } from "@/components/app-chrome";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "MobiBase | Telefon Bayi Otomasyonu",
  description: "Telefon bayileri için hepsi bir arada bulut otomasyonu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "MobiBase",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <RuntimeGuard />
        <PwaRegister />
        <AppChrome>{children}</AppChrome>
        <SpeedInsights />
      </body>
    </html>
  );
}
