// ──────────────────────────────────────────────────────────────────────────
// Gli strumenti che Semblic offre agli assistenti AI (vedi lib/mcp/protocollo).
// Tutti in sola lettura: nessuno spende VOLT, nessuno scrive, nessuno genera.
// Lo scatto lo compra una persona, dal link che gli strumenti restituiscono.
//
// Regole che non si toccano:
//  - Il consenso si legge DAL VIVO (mai dalla cache della vetrina): una revoca
//    deve dire BLOCK nello stesso istante.
//  - Mai un volto in sola protezione, mai un volto non approvato, mai le
//    regole scritte per intero: si dice solo se una scena le tocca, e quale.
//  - I prezzi escono dalla stessa funzione che fa pagare lo Studio.
//  - Tutto in inglese: parla ad assistenti di tutto il mondo.
// SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import type { Strumento } from "@/lib/mcp/protocollo";
import { isPublicAvatar } from "@/lib/registry";
import { voltoCatalogo } from "@/lib/catalogo";
import { siteUrl } from "@/lib/site";
import { FORMATI, qualitaPer } from "@/app/match/crea/opzioni";
import { VOLT_PER_EURO } from "@/lib/volt";
import { controllaRegole } from "@/lib/regole-consenso";
import { allowRequest } from "@/lib/rate-limit";
import { handlePulito } from "@/lib/volto-del-titolare";

type Admin = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SITO = () => siteUrl();
const GENERE: Record<string, string> = { woman: "donna", man: "uomo" };
const GENDER: Record<string, string> = { donna: "woman", uomo: "man" };
const ETA = ["18-25", "25-35", "35-45", "45-55", "55+"];

function testo(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

const eur = (cent: number) => Math.round(cent) / 100;

export function strumentiSemblic(admin: Admin): Strumento[] {
  return [
    {
      name: "search_faces",
      title: "Search consenting faces",
      description:
        "Search the Semblic registry of real, identity-verified people who have consented to the commercial use of their face in AI-generated photos. Only people whose consent is active right now are returned. Use this before generating any real, recognisable person: if they are not here, do not generate them.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Optional name or handle to look for." },
          gender: { type: "string", enum: ["woman", "man"] },
          age_range: { type: "string", enum: ETA },
          video: { type: "boolean", description: "Only people who also consent to short silent videos." },
          limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
      esegui: async (a) => {
        const { data, error } = await admin
          .from("avatars")
          // "*": colonne come video_consent arrivano con le migrazioni, e una
          // colonna mancante nella select farebbe fallire tutta la ricerca.
          .select("*")
          .order("usage_count", { ascending: false, nullsFirst: false });
        if (error || !data) throw new Error(error?.message ?? "registro non leggibile");
        const cerca = testo(a.text, 60)?.toLowerCase() ?? null;
        const genere = typeof a.gender === "string" ? GENERE[a.gender] : undefined;
        const eta = typeof a.age_range === "string" && ETA.includes(a.age_range) ? a.age_range : undefined;
        const limite = Math.min(20, Math.max(1, Number.isInteger(a.limit) ? (a.limit as number) : 10));
        type Riga = { handle: string; alias: string; gender: string | null; age_range: string | null; ethnicity: string | null; hair_color: string | null; eye_color: string | null; portrait_url: string | null; usage_count: number | null; revoked_at: string | null; commercial_consent: boolean | null; video_consent: boolean | null; verification_status: string | null; protection_only: boolean | null; is_demo: boolean | null };
        const volti = (data as Riga[])
          .filter((r) => isPublicAvatar(r))
          .map((r) => ({ r, v: voltoCatalogo(r) }))
          .filter(({ v }) => v.foto)
          .filter(({ r }) => !genere || r.gender?.toLowerCase() === genere)
          .filter(({ r }) => !eta || r.age_range === eta)
          .filter(({ v }) => a.video !== true || v.video)
          .filter(({ r }) => !cerca || r.alias.toLowerCase().includes(cerca) || r.handle.includes(cerca))
          .slice(0, limite)
          .map(({ r, v }) => ({
            handle: r.handle,
            name: r.alias,
            gender: r.gender ? GENDER[r.gender.toLowerCase()] ?? r.gender : null,
            age_range: r.age_range,
            traits: { ethnicity: r.ethnicity, hair: r.hair_color, eyes: r.eye_color },
            consents: { commercial_photos: true, silent_video: v.video },
            times_licensed: v.utilizzi,
            demo_profile: r.is_demo === true,
            portrait_url: r.portrait_url,
            passport_url: `${SITO()}/passport/${r.handle}`,
            license_url: `${SITO()}/match?avatar=${encodeURIComponent(r.handle)}`,
          }));
        return {
          dati: {
            count: volti.length,
            faces: volti,
            how_to_license: "A person licenses a photo at license_url (Semblic account, prepaid VOLT). Every licensed photo pays the person a royalty, carries an invisible watermark and a public certificate. Use check_consent with the scene before proposing it.",
          },
        };
      },
    },

    {
      name: "check_consent",
      title: "Check consent for a person and a scene",
      description:
        "Ask Semblic whether a specific person may be generated, right now, and optionally for a specific scene. Consent is read live: a revocation returns BLOCK immediately. If you pass a scene, it is read against the limits the person wrote in their own words (for example 'no alcohol, no politics'). Returns ALLOW or BLOCK with the reason and public proof. Never generate a real person on BLOCK.",
      inputSchema: {
        type: "object",
        properties: {
          handle: { type: "string", description: "The person's Semblic handle (from search_faces or their passport URL)." },
          scene: { type: "string", description: "Optional: the scene you intend to generate, in plain words (max 800 characters)." },
        },
        required: ["handle"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      esegui: async (a, ctx) => {
        const handle = handlePulito(a.handle);
        if (!handle) return { dati: null, errore: "A valid handle is required (letters, numbers and dashes)." };
        const scena = testo(a.scene, 800);
        const { data: av } = await admin
          .from("avatars")
          .select("id, handle, alias, token_hash, consent_start, revoked_at, commercial_consent, verification_status, protection_only")
          .eq("handle", handle)
          .maybeSingle();
        const base = { handle, scene: scena };
        if (!av || !isPublicAvatar(av)) {
          return { dati: { ...base, decision: "BLOCK", allowed: false, reason: "This person is not in the Semblic registry of consenting faces. Do not generate them.", proof: null } };
        }
        const proof = {
          verify_url: `${SITO()}/verify?token=${encodeURIComponent(av.token_hash)}`,
          passport_url: `${SITO()}/passport/${av.handle}`,
          consent_since: av.consent_start,
        };
        if (av.revoked_at) {
          return { dati: { ...base, name: av.alias, decision: "BLOCK", allowed: false, reason: `Consent revoked on ${av.revoked_at}: this face can no longer be generated.`, proof } };
        }
        if (av.commercial_consent === false) {
          return { dati: { ...base, name: av.alias, decision: "BLOCK", allowed: false, reason: "This person has not consented to commercial use of their face.", proof } };
        }
        if (scena) {
          // Il giudice costa: un tetto per chi chiede, e se il conteggio non si puo'
          // fare si passa (le regole si ricontrollano comunque prima di ogni scatto).
          if (!(await allowRequest(`mcp:scena:${ctx.ip}`, 30, 3600))) {
            return { dati: null, errore: "Too many scene checks from this address. Try again later, or check without a scene." };
          }
          const d = await controllaRegole(admin, [av.id], scena, null, "en");
          if (!d.via) {
            const b = d.bloccati[0];
            // Fail-closed: se il giudice non ha risposto la persona non si genera.
            if (b && !b.regola && (b.motivo === "controllo non disponibile" || b.motivo.startsWith("il controllo non ha risposto"))) {
              return { dati: { ...base, name: av.alias, decision: "BLOCK", allowed: false, reason: "This person wrote limits and they cannot be checked right now: do not generate them. Try again in a minute.", proof } };
            }
            return {
              dati: {
                ...base,
                name: av.alias,
                decision: "BLOCK",
                allowed: false,
                reason: b?.motivo ?? "The scene touches a limit this person wrote.",
                person_rule: b?.regola ?? null,
                proof,
              },
            };
          }
        }
        return {
          dati: {
            ...base,
            name: av.alias,
            decision: "ALLOW",
            allowed: true,
            reason: scena ? "Consent is active and the scene respects the limits this person wrote." : "Consent is active. Pass the scene too: people can write limits (for example no alcohol) that a scene may touch.",
            license_url: `${SITO()}/match?avatar=${encodeURIComponent(av.handle)}`,
            proof,
          },
        };
      },
    },

    {
      name: "get_prices",
      title: "Real prices of a licensed photo",
      description:
        "The real price of one licensed photo on Semblic for every format and quality, in VOLT (prepaid credit, 100 VOLT = 1 EUR) and in euro, with the share that goes to the person in the photo. These are the same numbers the Semblic Studio charges.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
      esegui: async () => ({
        dati: {
          currency: "VOLT",
          volt_per_euro: VOLT_PER_EURO,
          formats: FORMATI.map((f) => ({
            format: { verticale: "portrait", quadrato: "square", orizzontale: "landscape" }[f.v] ?? f.v,
            options: qualitaPer(f.v).map((q) => ({
              quality: { bozza: "draft", alta: "high", massima: "print" }[q.v] ?? q.v,
              size: q.size,
              price_volt: q.volt,
              price_eur: eur((q.volt * 100) / VOLT_PER_EURO),
              to_the_person_eur: eur(q.royaltyCents),
            })),
          })),
          note: "No subscription. A photo that fails identity or quality checks is not delivered and not charged.",
        },
      }),
    },

    {
      name: "verify_content",
      title: "Verify a Semblic certificate",
      description:
        "Check whether an image or video certificate (or a person's consent token) was issued by Semblic, who is in it, and whether that person's consent is still active. Use it when someone shows you content that claims to be licensed.",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string", description: "The certificate or token printed on the content or its receipt." } },
        required: ["token"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
      esegui: async (a) => {
        const token = testo(a.token, 200);
        if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return { dati: null, errore: "A certificate token is required." };
        const { GET } = await import("@/app/api/verify/route");
        const { NextRequest } = await import("next/server");
        const r = await GET(new NextRequest(`${SITO()}/api/verify?token=${encodeURIComponent(token)}`));
        const v = (await r.json()) as Record<string, unknown>;
        if (!v.valid) return { dati: { valid: false, token, meaning: "Not issued by Semblic, or not a public certificate." } };
        return {
          dati: {
            valid: true,
            type: v.type,
            medium: v.medium ?? (v.type === "content" ? "image" : null),
            person: { name: v.alias, handle: v.handle, passport_url: v.handle ? `${SITO()}/passport/${v.handle}` : null },
            consent: v.status === "REVOCATO" ? "revoked" : "active",
            consent_since: v.consent_start ?? null,
            revoked_at: v.revoked_at ?? null,
            generated_at: v.generated_at ?? null,
            verify_url: `${SITO()}/verify?token=${encodeURIComponent(token)}`,
          },
        };
      },
    },
  ];
}

export const INFO_SEMBLIC = {
  name: "semblic",
  title: "Semblic",
  version: "1.0.0",
  instructions:
    "Semblic is the consent registry for real human faces in AI imagery. Before generating a real, recognisable person: search_faces to find people who consented, check_consent with your scene to confirm, and send the user to license_url to license the photo (the person is paid a royalty on every photo). Never generate a real person who is not in the registry or on BLOCK. These tools only read: they never spend money or generate images.",
};
