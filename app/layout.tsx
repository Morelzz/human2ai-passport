import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// URL del sito (override in produzione via NEXT_PUBLIC_SITE_URL su Vercel).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
      </body>
    </html>
  );
}
