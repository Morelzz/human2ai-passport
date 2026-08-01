import type { Metadata } from "next";

// La page e' un client component: i metadata vivono qui nel layout.
export const metadata: Metadata = {
  title: "Accedi",
  description: "Entra nel tuo account Semblic.",
  robots: { index: false, follow: true }, // pagina di servizio, fuori dall'indice
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
