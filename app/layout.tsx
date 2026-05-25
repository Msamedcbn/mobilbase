import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { RuntimeGuard } from "@/components/runtime-guard";
import { AppChrome } from "@/components/app-chrome";

export const metadata: Metadata = {
  title: "MobiBase | Telefon Bayi Otomasyonu",
  description: "Telefon bayileri için hepsi bir arada bulut otomasyonu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <RuntimeGuard />
        <AppChrome>{children}</AppChrome>
        <SpeedInsights />
      </body>
    </html>
  );
}
