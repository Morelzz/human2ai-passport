import type { MetadataRoute } from "next";

// ONDATA MOBILE, PWA: "Aggiungi a schermata Home" e Semblic si apre a tutto
// schermo come un'app (display standalone, void totale). Posizionamento:
// un'infrastruttura si installa, non si visita.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SEMBLIC, il registro dei volti consenzienti",
    short_name: "SEMBLIC",
    description:
      "Il filtro di tutela umana per l'IA: ogni volto ha un consenso verificabile, ogni generazione paga la persona reale.",
    start_url: "/",
    display: "standalone",
    background_color: "#0C0F17",
    theme_color: "#0C0F17",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/logo-shield.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
