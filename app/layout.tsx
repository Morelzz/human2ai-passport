import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = siteUrl();
const TITLE = "Human2AI — Il registro dei volti consenzienti";
const DESCRIPTION =
  "Il filtro di tutela umana per l'IA: ogni volto ha un consenso verificabile, ogni generazione paga la persona reale.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — Human2AI" },
  description: DESCRIPTION,
  applicationName: "Human2AI",
  keywords: ["Human2AI", "registro volti", "consenso AI", "identità AI", "diritto d'immagine", "deepfake", "royalty"],
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Human2AI",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/logo-shield.png", width: 1024, height: 1024, alt: "Human2AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo-shield.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ONDATA MOBILE — View Transitions: le navigazioni coi Link di
    // next-view-transitions usano document.startViewTransition (dove c'è) →
    // transizioni di pagina "da app" + shared element sui ritratti
    // (viewTransitionName vt-portrait-<handle>). Progressive enhancement:
    // dove l'API manca, navigazione normale.
    <ViewTransitions>
      <html
        lang="it"
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        {/* NB: niente h-full/height:100% su html/body — rompe la misura dello
            scroll di Lenis (lo scroll "scattava" e tornava in cima). */}
        <body className="min-h-screen flex flex-col" suppressHydrationWarning>
          <SmoothScroll />
          {children}
          {/* F1 — banner cookie globale: default solo essenziali, scelta granulare */}
          <CookieBanner />
        </body>
      </html>
    </ViewTransitions>
  );
}
