import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import VerifyClient from "./VerifyClient";

export default function VerifyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-xl px-5 py-14 sm:px-8">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-teal">VERIFICA</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Verifica un contenuto</h1>
            <p className="mt-3 leading-relaxed text-muted">
              Incolla il <span className="text-foreground">token di un avatar</span> o il{" "}
              <span className="text-foreground">certificato di un contenuto generato</span>: confermiamo
              il consenso e a quale persona reale appartiene.
            </p>
          </div>
          <VerifyClient />
        </main>
      </div>
    </div>
  );
}
