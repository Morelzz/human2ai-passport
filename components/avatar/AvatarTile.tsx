"use client";

// Tile di un volto del registro: 3:4, ritratto reale (watermarkato via
// /api/sample), chip di stato in alto, nome in basso. Il ritratto porta il
// view-transition-name: passando al passaporto "vola" da qui alla pagina.
import { Link } from "next-view-transitions";
import { portraitFor } from "@/lib/sample-galleries";

export type TileAvatar = {
  handle: string;
  alias: string;
  gallery_urls?: unknown;
  revoked_at?: string | null;
  gender?: string | null;
};

export function AvatarTile({ a, className = "", priority = false }: { a: TileAvatar; className?: string; priority?: boolean }) {
  const src = portraitFor(a);
  const revoked = !!a.revoked_at;
  const chip = revoked ? "Revocato" : a.gender === "donna" ? "Verificata" : "Verificato";
  return (
    <Link
      href={`/passport/${a.handle}`}
      className={`group relative block aspect-[3/4] overflow-hidden rounded-[18px] bg-[#E7E1D3] focus-ring ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={a.alias}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        style={{ viewTransitionName: `vt-portrait-${a.handle}` }}
      />
      <span
        className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${
          revoked ? "bg-blocked-soft text-on-blocked" : "bg-white/[0.92] text-on-verified"
        }`}
      >
        <i aria-hidden className={`h-1.5 w-1.5 rounded-full ${revoked ? "bg-blocked" : "bg-verified"}`} />
        {chip}
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
      <span className="absolute bottom-3 left-3.5 text-[0.95rem] font-semibold text-white [text-shadow:0_1px_10px_rgba(0,0,0,.45)]">{a.alias}</span>
    </Link>
  );
}
