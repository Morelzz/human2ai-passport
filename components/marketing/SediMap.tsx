"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Sede } from "@/lib/scan";

// H4 — la mappa delle sedi ("Dove scansionarti"): Leaflet + OpenStreetMap
// (gratuito, nessuna chiave API da proteggere). I pin arrivano dalla tabella
// `sedi`: aggiungere una sede = una riga, zero codice. Pin pieni = sedi
// certificate (popup con "Prenota qui" → booking con sede preselezionata);
// pin attenuati = città "in arrivo" (partner in certificazione: solo la
// città, MAI dati personali del partner prima della certificazione).
// Leaflet tocca window → import dinamico dentro useEffect, niente SSR.
// Tiles OSM scuriti via CSS (.smbl-tiles in globals.css) per stare sul void.

export type MapSede = Pick<Sede, "slug" | "name" | "city" | "lat" | "lng" | "status">;

export function SediMap({ sedi }: { sedi: MapSede[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        maxZoom: 19,
        className: "smbl-tiles",
      }).addTo(map);

      const pts = sedi.filter((s) => s.lat != null && s.lng != null);
      for (const s of pts) {
        const attiva = s.status === "attiva";
        const icon = L.divIcon({
          className: "",
          html: `<span class="smbl-pin ${attiva ? "smbl-pin--attiva" : "smbl-pin--arrivo"}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        });
        const marker = L.marker([s.lat!, s.lng!], { icon }).addTo(map);
        // Popup: template verbatim da docs/SITE_COPY_SCANSIONE.md
        const html = attiva
          ? `<p class="smbl-pop-title">${s.name} · ${s.city}</p>
             <p class="smbl-pop-sub">✔ Certificata SEMBLIC-SCAN</p>
             <a class="smbl-pop-cta" href="/scansione/prenota?sede=${encodeURIComponent(s.slug)}">Prenota qui</a>`
          : `<p class="smbl-pop-title">${s.city} · In certificazione</p>
             <p class="smbl-pop-sub">Un Capture Partner sta completando il percorso. Presto qui.</p>`;
        marker.bindPopup(html, { closeButton: false });
      }

      // Vista: con poche sedi teniamo il respiro dell'Italia (la mappa che si
      // popola È la narrazione); con una rete vera si adatta ai pin.
      if (pts.length > 3) {
        map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat!, p.lng!] as [number, number])), { padding: [40, 40] });
      } else {
        map.setView([42.6, 12.5], 6);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [sedi]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Mappa delle sedi di scansione certificate"
      className="smbl-map h-[360px] w-full overflow-hidden rounded-[2rem] border border-border bg-obsidian-2 sm:h-[440px]"
    />
  );
}
