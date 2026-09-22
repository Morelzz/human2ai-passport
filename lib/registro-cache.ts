// ──────────────────────────────────────────────────────────────────────────
// IL REGISTRO PUBBLICO, IN CACHE (21/9/2026).
// La home e il catalogo leggevano il registro a ogni visita: tre giri sul DB
// prima di mandare un solo byte, e il TTFB stava fra 1 e 2,5 secondi. La lista
// dei volti pubblici cambia di rado, quindi si tiene in cache e si BUTTA VIA
// nel momento esatto in cui cambia (revoca, ripensamento, approvazione,
// rifiuto, tutela): revocaRegistro() dai punti che scrivono su avatars.
//
// IMPORTANTE: questa e' SOLO la vetrina. Il consenso prima di generare si
// legge sempre dal vivo (lib/consent-gate e i job del motore), mai da qui:
// una revoca deve fermare il motore nello stesso istante, non fra un minuto.
// ──────────────────────────────────────────────────────────────────────────

import { unstable_cache, revalidateTag } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { getPublicAvatars, countProtectedFaces, type PublicAvatar } from "@/lib/registry";

export const TAG_REGISTRO = "registro";
const VITA = 60; // secondi: rete di sicurezza se un punto di scrittura dimentica di
// revocare. Tenuto basso apposta: una revoca deve sparire dalla vetrina subito, e
// una lettura al minuto su una tabella da 13 righe non costa niente.

export interface NumeriRegistro {
  volti: number;
  protetti: number; // volti registrati per NON essere generati (VETO)
  pagate: number; // generazioni commerciali: ognuna ha pagato la persona
}

// La lista dei volti pubblici. Stessa forma di getPublicAvatars.
export const registroPubblico = unstable_cache(
  async (): Promise<PublicAvatar[]> => getPublicAvatars(createServerClient()),
  ["registro-pubblico"],
  { tags: [TAG_REGISTRO], revalidate: VITA },
);

// I numeri manifesto (home e trasparenza), in un giro solo e in parallelo.
export const numeriRegistro = unstable_cache(
  async (): Promise<NumeriRegistro> => {
    const sb = createServerClient();
    const [volti, protetti, pagate] = await Promise.all([
      getPublicAvatars(sb).then((a) => a.length),
      countProtectedFaces(sb),
      // "generazioni pagate alle persone": ci sono anche le prove gratuite,
      // perche' anche quelle pagano la persona (le paga Semblic). Se non le
      // contassimo, il numero direbbe meno della verita'.
      sb.from("generations").select("id", { count: "exact", head: true }).in("mode", ["commercial", "prova"]).then((r) => r.count ?? 0),
    ]);
    return { volti, protetti, pagate };
  },
  ["numeri-registro"],
  { tags: [TAG_REGISTRO], revalidate: VITA },
);

// Da chiamare SUBITO DOPO ogni scrittura che cambia la vetrina: revoca e
// ripensamento (api/avatar/consent), approvazione e rifiuto (api/admin/review,
// api/admin/reports), registrazione in tutela (api/veto/register).
export function revocaRegistro(): void {
  try {
    // "max": la voce in cache va buttata del tutto, non solo rinfrescata piano.
    revalidateTag(TAG_REGISTRO, "max");
  } catch {
    // fuori da una richiesta (worker, script): la cache scade da sola
  }
}
