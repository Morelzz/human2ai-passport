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
  return <div className={`${wardDisplay.variable} ${wardMono.variable} ward-app`}>{children}</div>;
}
