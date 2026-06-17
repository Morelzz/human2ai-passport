import { Mail, MapPin } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { ContactForm } from "./ContactForm";

export const metadata = {
  title: "Contatti",
  description: "Scrivi a Semblic: brand, persone che vogliono entrare nel registro, stampa, partner.",
};

// F2 — pagina /contatti: form pubblico → contact_messages + recapiti.
// B3: ?ingaggio=<handle> pre-compila il form per una richiesta di ingaggio reale.
export default async function ContattiPage({ searchParams }: { searchParams: Promise<{ ingaggio?: string }> }) {
  const { ingaggio } = await searchParams;
  const prefill = ingaggio
    ? { subject: "Ingaggio reale", message: `Vorrei richiedere un ingaggio reale per il volto @${ingaggio} del registro Semblic.` }
    : undefined;
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="text-center">
            <span className="label-mono text-teal">Contatti</span>
            <h1 className="mt-3 text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl">
              Parliamone. <span className="text-gradient">Da persone.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
              Che tu sia un brand, una persona che vuole possedere la propria immagine, un giornalista
              o un futuro partner: scrivici, rispondiamo noi.
            </p>
          </div>

          <Reveal>
            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="glass rounded-[2rem] p-6 sm:p-8">
                <ContactForm prefill={prefill} />
              </div>

              {/* Recapiti */}
              <aside className="flex flex-col gap-3">
                <div className="glass rounded-2xl p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet/35 bg-violet/10">
                    <Mail className="h-4 w-4 text-violet-light" />
                  </span>
                  <p className="mt-3 text-sm font-bold">Email</p>
                  <p className="mt-1 text-sm text-muted">hello@semblic.example</p>
                  <p className="mt-1 font-mono text-[0.68rem] text-faint">[DA CONFERMARE: indirizzo definitivo]</p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal/35 bg-teal/10">
                    <MapPin className="h-4 w-4 text-teal" />
                  </span>
                  <p className="mt-3 text-sm font-bold">Sede</p>
                  <p className="mt-1 text-sm text-muted">Rimini, Italia</p>
                  <p className="mt-1 font-mono text-[0.68rem] text-faint">[DA CONFERMARE: indirizzo completo]</p>
                </div>
                <a
                  href="https://www.instagram.com/semblic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass glass-hover block rounded-2xl p-5 transition-colors"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F2A93B,#B8005C)]">
                    {/* Glifo Instagram inline (lucide non distribuisce più icone brand) */}
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-bold">Instagram</p>
                  <p className="mt-1 text-sm text-muted">@semblic</p>
                </a>
              </aside>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
}
