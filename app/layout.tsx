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
const TITLE = "Semblic | Il registro dei volti consenzienti";
const DESCRIPTION =
  "Il filtro di tutela umana per l'IA: ogni volto ha un consenso verificabile, ogni generazione paga la persona reale.";

// Dati strutturati globali: dicono a Google chi siamo (Organization) e come è
// fatto il sito (WebSite). Letti su ogni pagina.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "SEMBLIC",
      url: SITE_URL,
      logo: `${SITE_URL}/logo-shield.png`,
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Semblic",
      url: SITE_URL,
      inLanguage: "it-IT",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Semblic" },
  description: DESCRIPTION,
  applicationName: "Semblic",
  keywords: ["Semblic", "registro volti", "consenso AI", "identità AI", "diritto d'immagine", "deepfake", "royalty"],
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Semblic",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
          />
          <SmoothScroll />
          {children}
          {/* F1 — banner cookie globale: default solo essenziali, scelta granulare */}
          <CookieBanner />
        </body>
      </html>
    </ViewTransitions>
  );
}
