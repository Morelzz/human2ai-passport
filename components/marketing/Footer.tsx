import Link from "next/link";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

// Footer condiviso, casa nuova: chiaro, marchio e quattro colonne di link (due
// per riga sul telefono, niente colonna infinita), wordmark gigante in chiusura. Su token: dentro un'isola scura si ribalta da solo.
const COLONNE: { titolo: string; colore: string; voci: { href: string; label: string }[] }[] = [
  {
    titolo: "Piattaforma", colore: "text-amber-ink",
    voci: [
      { href: "/catalogo", label: "Registro" }, { href: "/match", label: "Genera" }, { href: "/brand", label: "Per i brand" }, { href: "/studio", label: "Studio" },
      { href: "/enterprise", label: "Enterprise" }, { href: "/academy", label: "Academy" }, { href: "/prezzi", label: "Prezzi" },
      { href: "/partner", label: "Diventa partner" },
    ],
  },
  {
    titolo: "Tutela", colore: "text-amber-ink",
    voci: [
      { href: "/entra", label: "Entra nel registro" }, { href: "/tutela", label: "Tutela dell'identità" },
      { href: "/scansione", label: "La scansione" }, { href: "/ward", label: "Ward e Nemesis" }, { href: "/verify", label: "Sigil" },
    ],
  },
  {
    titolo: "Fiducia", colore: "text-verified",
    voci: [
      { href: "/trasparenza", label: "Trasparenza" }, { href: "/ai-act", label: "AI Act" }, { href: "/sviluppatori", label: "Sviluppatori" },
      { href: "/faq", label: "FAQ" }, { href: "/blog", label: "Blog" },
    ],
  },
  {
    titolo: "Legale", colore: "text-blocked",
    voci: [
      { href: "/privacy", label: "Privacy" }, { href: "/termini", label: "Termini" }, { href: "/cookie", label: "Cookie" }, { href: "/contatti", label: "Contatti" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-14 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 max-w-xs sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/semblic-mark.png" alt="" aria-hidden className="h-8 w-8 object-contain" />
              <span className="text-[0.85rem] font-bold tracking-[0.18em]">SEMBLIC</span>
            </div>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
              Il registro dei diritti d&apos;immagine. Il filtro di tutela umana sopra ogni AI generativa.
            </p>
            <p className="kicker mt-4 text-[0.62rem] text-faint">
              {["Real humans", "Real rights", "Real earnings"].map((f, i) => (
                <span key={f} className="whitespace-nowrap">{i > 0 && " · "}{f}</span>
              ))}
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 inline-flex items-center gap-2.5 rounded-full border border-border py-1.5 pl-2 pr-4 transition-colors hover:border-amber/60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#412402" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-muted transition-colors group-hover:text-foreground">@{INSTAGRAM_HANDLE}</span>
            </a>
          </div>

          {COLONNE.map((c) => (
            <div key={c.titolo} className="flex flex-col gap-2.5">
              <span className={`kicker ${c.colore}`}>{c.titolo}</span>
              {c.voci.map((v) => (
                <Link key={v.href} href={v.href} className="text-[0.95rem] text-muted transition-colors hover:text-foreground">{v.label}</Link>
              ))}
            </div>
          ))}
        </div>

        {/* Wordmark gigante in chiusura: tono su tono, mai in competizione col contenuto */}
        <div aria-hidden className="pointer-events-none mt-12 select-none overflow-hidden">
          <p className="text-center text-[18vw] font-bold leading-[0.82] tracking-[-0.05em] text-[color-mix(in_srgb,var(--text)_7%,var(--bg))] sm:text-[12rem]">
            SEMBLIC
          </p>
        </div>
      </div>
    </footer>
  );
}
