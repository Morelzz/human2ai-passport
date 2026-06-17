import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isPublicAvatar } from "@/lib/registry";
import {
  FACE_MATCH_MAX_DISTANCE,
  isValidDescriptor,
  loadFaceIndex,
  rankFaceMatches,
} from "@/lib/face-index";
import { similarityFromDistance } from "@/lib/face-similarity";
import { fuzzyEq, ethnicityEq } from "@/lib/matching";
import { loadProtectedIndex } from "@/lib/protected-index";
import { logProtectionAlert } from "@/lib/protection-alert";

export const runtime = "nodejs";

// Fallback di /verify quando la filigrana invisibile NON c'è: il browser
// calcola sul dispositivo il descrittore FaceNet del volto nell'immagine e
// lo manda qui; noi lo confrontiamo con l'indice dei volti del registro.
// Se il volto corrisponde a un avatar, l'immagine è con ogni probabilità una
// generazione NON autorizzata (fatta fuori da Semblic) → base per /report.
//
// "RESTRINGI IL CERCHIO": filtri opzionali sui metadati AUTO-DICHIARATI degli
// avatar (genere/etnia/capelli/occhi/statura/corporatura). I filtri limitano
// l'insieme dei candidati PRIMA del confronto biometrico. Triplo guardrail:
//  1. solo valori in whitelist (mai testo libero verso i confronti);
//  2. la soglia biometrica NON si abbassa mai, nemmeno con 1 solo candidato;
//  3. ONESTÀ: indizio, mai prova — sotto soglia non si nomina NESSUNO.
// ZERO-RETENTION: né descrittore né filtri vengono persistiti. MAI persistere
// descriptor/filters: il descrittore del volto è dato biometrico (GDPR Art.9).

const FILTER_WHITELIST: Record<string, string[] | null> = {
  gender: ["uomo", "donna"],
  // L'etnia del registro è nazionalità O gruppo IDENTITY_KIT a seconda della
  // via di onboarding: il confronto passa da ethnicityEq (espansione gruppi in
  // ENTRAMBE le direzioni). Whitelist aperta ma sanificata (solo lettere).
  ethnicity: null,
  hair_color: ["neri", "castani", "biondi", "biondo platino", "rossi", "grigi", "bianchi", "rasati", "calvo", "blu", "rosa", "viola", "verdi", "multicolore"],
  eye_color: ["marroni", "neri", "azzurri", "verdi", "grigi", "nocciola"],
  height: ["bassa", "media", "alta"],
  body_type: ["slim", "atletico", "normale", "curvy", "robusto"],
};

type Filters = Partial<Record<keyof typeof FILTER_WHITELIST, string>>;

function sanitizeFilters(raw: unknown): Filters {
  const out: Filters = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(FILTER_WHITELIST) as Array<keyof typeof FILTER_WHITELIST>) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v !== "string") continue;
    const clean = v.trim().toLowerCase().slice(0, 40);
    if (!clean) continue;
    const allowed = FILTER_WHITELIST[key];
    if (allowed) {
      if (allowed.includes(clean)) out[key] = clean;
    } else if (/^[a-zàèéìòù\s-]{2,40}$/i.test(clean)) {
      out[key] = clean;
    }
  }
  return out;
}

type AvatarRow = Record<string, unknown> & {
  handle: string;
  alias: string;
  tier: string | null;
  consent_start: string | null;
  revoked_at: string | null;
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height: string | null;
  body_type: string | null;
};

// Regola rigida come in /match: filtro richiesto → il metadato DEVE combaciare
// (metadato assente = non combacia: mai inferenza dalla foto).
function matchesFilters(av: AvatarRow, f: Filters): boolean {
  if (f.gender && av.gender !== f.gender) return false;
  if (f.ethnicity && !(av.ethnicity && ethnicityEq(av.ethnicity, f.ethnicity))) return false;
  if (f.hair_color && !(av.hair_color && fuzzyEq(av.hair_color, f.hair_color))) return false;
  if (f.eye_color && !(av.eye_color && fuzzyEq(av.eye_color, f.eye_color))) return false;
  if (f.height && !(av.height && fuzzyEq(av.height, f.height))) return false;
  if (f.body_type && !(av.body_type && fuzzyEq(av.body_type, f.body_type))) return false;
  return true;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const descriptor = body?.descriptor;
  if (!isValidDescriptor(descriptor)) {
    return NextResponse.json({ match: false, error: "Descrittore non valido" }, { status: 400 });
  }
  const filters = sanitizeFilters(body?.filters);
  const filtersActive = Object.keys(filters).length > 0;

  // Fase 2.5 (VETO): se il volto e' di una persona in SOLA PROTEZIONE, NON si
  // rivela MAI chi e'. Solo "volto protetto" + alert al titolare (e' lui che
  // scopre l'abuso, non chi cerca: invertirlo sarebbe uno strumento di stalking).
  const protectedIndex = await loadProtectedIndex();
  if (protectedIndex && protectedIndex.entries.length > 0) {
    const pranked = rankFaceMatches(descriptor, protectedIndex);
    const pbest = pranked[0];
    if (pbest && pbest.distance <= FACE_MATCH_MAX_DISTANCE) {
      logProtectionAlert(pbest.handle, similarityFromDistance(pbest.distance), filtersActive);
      return NextResponse.json({
        match: true,
        protected: true,
        scanned: true,
        avatars_checked: pranked.length,
        filtered: filtersActive,
        // NESSUNA identita': niente handle/alias/passport. Mai.
      });
    }
  }

  const index = await loadFaceIndex();
  if (!index || index.entries.length === 0) {
    // Indice mai costruito: il fallback semplicemente non è disponibile.
    return NextResponse.json({ match: false, scanned: false, avatars_checked: 0, candidates: [] });
  }

  // Registro LIVE in una sola query: serve sia per i filtri sia per confermare
  // ogni candidato prima di nominarlo (un avatar uscito dal registro dopo
  // l'ultima costruzione dell'indice non va mai nominato).
  const admin = createServerClient();
  const { data: rows } = await admin.from("avatars").select("*");
  const publicByHandle = new Map<string, AvatarRow>();
  for (const r of rows ?? []) {
    if (isPublicAvatar(r)) publicByHandle.set((r as AvatarRow).handle, r as AvatarRow);
  }

  // Il cerchio: avatar pubblici, compatibili coi filtri, presenti nell'indice.
  const allowed = new Set<string>();
  for (const [handle, av] of publicByHandle) {
    if (!filtersActive || matchesFilters(av, filters)) allowed.add(handle);
  }

  const ranked = rankFaceMatches(descriptor, index, allowed);
  const checked = ranked.length;

  // Solo SOPRA soglia si fa un nome (guardrail #2: la soglia non scende mai).
  const candidates = ranked
    .filter((r) => r.distance <= FACE_MATCH_MAX_DISTANCE)
    .slice(0, 5)
    .map((r) => {
      const av = publicByHandle.get(r.handle)!;
      return {
        handle: av.handle,
        alias: av.alias,
        tier: av.tier,
        status: av.revoked_at ? "REVOCATO" : "ATTIVO",
        revoked_at: av.revoked_at,
        consent_start: av.consent_start,
        similarity: similarityFromDistance(r.distance),
        distance: Math.round(r.distance * 1000) / 1000,
      };
    });

  if (candidates.length === 0) {
    return NextResponse.json({
      match: false,
      scanned: true,
      avatars_checked: checked,
      filtered: filtersActive,
      candidates: [],
    });
  }

  const best = candidates[0];
  return NextResponse.json({
    match: true,
    scanned: true,
    avatars_checked: checked,
    filtered: filtersActive,
    candidates,
    // Campi del migliore in testa per retro-compatibilità col client esistente.
    handle: best.handle,
    alias: best.alias,
    tier: best.tier,
    status: best.status,
    consent_start: best.consent_start,
    revoked_at: best.revoked_at,
    similarity: best.similarity,
    distance: best.distance,
  });
}
