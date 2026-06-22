export type Tier = "SPARK" | "SHAPE" | "SOUL" | "HUMAN";
export type ConsentStatus = "ATTIVO" | "REVOCATO" | "IN_VERIFICA";

export interface Avatar {
  id: string;
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  gender: string | null;
  age_range: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  eye_color: string | null;
  body_type: string | null;
  height: string | null;
  facial_hair: string | null;
  glasses: string | null;
  tattoos: string | null;
  language: string | null;
  approved_categories: string[];
  excluded_categories: string[];
  // Consenso uso commerciale sì/no (modello senza categorie, Fase 2). Gli array
  // qui sopra restano come specchio legacy per i gate non ancora migrati.
  commercial_consent?: boolean;
  consent_start: string;
  consent_end: string | null;
  revoked_at: string | null;
  token_hash: string;
  usage_count: number;
  royalty_accrued_cents: number;
  is_demo: boolean;
  created_at: string;
  verification_status?: string;
  org_id?: string | null;
  // Profilo pubblico opzionale (migrazione avatar_public_profile.sql)
  real_name?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  gallery_urls?: string[] | null;
}

export interface ConsentEvent {
  id: string;
  avatar_id: string;
  event_type: "GRANTED" | "CATEGORY_ADDED" | "CATEGORY_REMOVED" | "REVOKED";
  detail: string | null;
  occurred_at: string;
}

// Identity kit: metadati strutturali, fissati alla creazione e IMMUTABILI.
export const IDENTITY_KIT = {
  gender: ["uomo", "donna"],
  age_range: ["18-25", "25-35", "35-45", "45-55", "55+"],
  ethnicity: ["caucasico", "afroamericano", "asiatico", "sud-asiatico", "latino", "mediorientale", "africano", "misto"],
  hair_color: ["neri", "castani", "biondi", "biondo platino", "rossi", "grigi", "bianchi", "rasati", "blu", "rosa", "viola", "verdi", "multicolore"],
  eye_color: ["marroni", "neri", "azzurri", "verdi", "grigi", "nocciola"],
  body_type: ["slim", "atletico", "normale", "curvy", "robusto"],
  height: ["bassa", "media", "alta"],
  facial_hair: ["nessuna", "barba", "barba incolta", "baffi", "pizzetto"],
  glasses: ["no", "occhiali da vista", "occhiali da sole"],
  tattoos: ["nessuno", "visibili"],
  language: ["italiano", "inglese", "spagnolo", "francese", "tedesco", "altro"],
} as const;

export const IDENTITY_LABELS: Record<keyof typeof IDENTITY_KIT, string> = {
  gender: "Genere",
  age_range: "Età",
  ethnicity: "Etnia / carnagione",
  hair_color: "Capelli",
  eye_color: "Occhi",
  body_type: "Corporatura",
  height: "Statura",
  facial_hair: "Peli del viso",
  glasses: "Occhiali",
  tattoos: "Tatuaggi",
  language: "Lingua",
};

// Categorie d'uso selezionabili in fase di onboarding
export const CATEGORIES = [
  "Business", "Luxury", "Travel", "Fashion", "Beauty", "Sport",
  "Entertainment", "Food", "Lifestyle", "Healthcare", "Politics", "Alcohol",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Tier differenziati per INTENSITA, non per tinta (spec colori SEMBLIC): una
// sola famiglia Lumen che si schiarisce salendo di tier. Niente teal/crimson/
// amber qui (amber = azione, teal/coral = stati): evita la collisione semantica.
export const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; description: string }> = {
  SPARK:  { label: "SPARK",  color: "#8A857B", bg: "rgba(242,233,216,0.05)", description: "Ispirato a" },
  SHAPE:  { label: "SHAPE",  color: "#ADA89E", bg: "rgba(242,233,216,0.08)", description: "Somiglianza stilizzata" },
  SOUL:   { label: "ECHO",   color: "#D8D2C6", bg: "rgba(242,233,216,0.11)", description: "Alta fedeltà" },
  HUMAN:  { label: "HUMAN",  color: "#F2E9D8", bg: "rgba(242,233,216,0.15)", description: "Identity-locked" },
};
