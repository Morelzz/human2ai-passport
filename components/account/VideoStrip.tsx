"use client";

// "I miei video" (Anima) dentro I miei contenuti: la scheda Anima promette "il
// video ti aspetta fra i tuoi contenuti", quindi qui c'e'. Striscia che scorre
// di lato (mai colonne infinite sul telefono), un video per scheda.

export type VideoItem = {
  id: string;
  status: "running" | "finishing" | "done" | "error";
  video_url: string | null;
  poster: string | null; // lo scatto di partenza
  certificate: string | null;
  seconds: number;
  somiglianza: number | null;
  fotogrammi: number | null;
  errore: string | null;
  created_at: string;
};

export function VideoStrip({ items }: { items: VideoItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2.5 text-[0.85rem] font-semibold text-foreground">Video</p>
      <div className="riga-scorrevole sm:grid sm:grid-cols-3 sm:gap-3">
        {items.map((v) => (
          <div key={v.id} className="flex w-[180px] shrink-0 flex-col gap-2 sm:w-auto">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[var(--hairline)]">
              {v.status === "done" && v.video_url ? (
                <video src={v.video_url} poster={v.poster ?? undefined} muted loop playsInline controls preload="metadata" className="h-full w-full object-cover" />
              ) : (
                v.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.poster} alt="" className={`h-full w-full object-cover ${v.status === "error" ? "grayscale opacity-60" : "blur-[3px] brightness-75"}`} />
                )
              )}
              <span className="absolute left-2 top-2 rounded-full bg-[rgba(12,15,23,0.7)] px-2.5 py-1 text-[0.72rem] text-[#F2E9D8]">
                {v.status === "done" ? `${v.seconds} s` : v.status === "error" ? "Annullato" : v.status === "finishing" ? "Controllo dei volti" : "In lavorazione"}
              </span>
            </div>
            {v.status === "done" && v.video_url ? (
              <>
                {v.somiglianza !== null && (
                  <span className="text-[0.75rem] text-muted">
                    Somiglianza {v.somiglianza}%{v.fotogrammi ? ` · ${v.fotogrammi} fotogrammi controllati` : ""}
                  </span>
                )}
                <a
                  href={v.video_url}
                  download={`semblic-anima-${(v.certificate ?? v.id).slice(0, 8)}.mp4`}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-amber px-4 text-[0.82rem] font-bold text-on-amber"
                >
                  Scarica MP4
                </a>
              </>
            ) : v.status === "error" ? (
              <span className="text-[0.75rem] leading-snug text-muted">{v.errore ?? "Il video non è riuscito."} VOLT restituiti.</span>
            ) : (
              <span className="text-[0.75rem] leading-snug text-muted">Ricarica la pagina tra qualche minuto.</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
