import type { MetadataRoute } from "next";

// ONDATA MOBILE — PWA: "Aggiungi a schermata Home" e Human2AI si apre a tutto
// schermo come un'app (display standalone, void totale). Posizionamento:
// un'infrastruttura si installa, non si visita.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HUMAN2AI — Il registro dei volti consenzienti",
    short_name: "HUMAN2AI",
    description:
      "Il filtro di tutela umana per l'IA: ogni volto ha un consenso verificabile, ogni generazione paga la persona reale.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/logo-shield.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
