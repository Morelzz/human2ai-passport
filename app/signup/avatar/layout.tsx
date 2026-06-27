import Link from "next/link";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "../../ward/ward.css";

// Il funnel protetto vive nel mondo visivo di Ward (font + token), coerente coi
// mockup d'ingresso. Stesso wrapper di app/ward/layout.tsx.
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

export const metadata = { robots: { index: false, follow: false } };

export default function AvatarSignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${wardDisplay.variable} ${wardMono.variable} ward-app`}>
      {/* Tasto INDIETRO sempre presente: il funnel non e' una trappola, si esce
          sempre verso l'account (vale per fork, verifica KYC, foto, consenso). */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, padding: "14px 18px 10px", background: "linear-gradient(180deg,#0C0F17 55%,transparent)" }}>
        <Link
          href="/account"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "rgba(242,233,216,0.72)", textDecoration: "none" }}
        >
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>‹</span> Indietro
        </Link>
      </div>
      {children}
    </div>
  );
}
