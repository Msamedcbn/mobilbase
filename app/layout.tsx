import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { RuntimeGuard } from "@/components/runtime-guard";
import { AppChrome } from "@/components/app-chrome";
import { PwaRegister } from "@/components/pwa-register";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";
const SITE_TITLE = "VibeGSM | Telefoncu Yazılımı ve Teknik Servis Programı";
const SITE_DESCRIPTION =
  "Telefon bayileri ve telefoncular için stok/IMEI takibi, POS, tamir takibi ve tahsilatı tek panelde birleştiren telefoncu yazılımı ve GSM teknik servis programı.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: SITE_TITLE, template: "%s | VibeGSM" },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "VibeGSM",
    statusBarStyle: "default",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
    siteName: "VibeGSM",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VibeGSM",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: BASE_URL,
  offers: {
    "@type": "Offer",
    price: "750",
    priceCurrency: "TRY",
    availability: "https://schema.org/InStock",
    url: BASE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <RuntimeGuard />
        <PwaRegister />
        <AppChrome>{children}</AppChrome>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
