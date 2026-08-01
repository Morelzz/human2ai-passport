import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./ward.css";

// Firma tipografica Ward (D9): display + mono dedicati, caricati SOLO sulle
// route /ward (il resto di Semblic resta su Geist). Body = Geist (ereditato).
const wardDisplay = Space_Grotesk({
  variable: "--font-ward-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const wardMono = JetBrains_Mono({
  variable: "--font-ward-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// /ward e' la pagina pubblica che spiega il finder: indicizzabile. La parte
// privata (/ward/content/[generationId]) resta noindex nel suo page.tsx.
export const metadata: Metadata = {
  title: "Ward",
  description:
    "Ward trova le copie delle immagini che generi su Semblic, in giro per il web, e ti aiuta a rimuoverle con Nemesis.",
};

export default function WardLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${wardDisplay.variable} ${wardMono.variable} ward-app`}>{children}</div>;
}
