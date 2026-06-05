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
  body_type: string | null;
  approved_categories: string[];
  excluded_categories: string[];
  consent_start: string;
  consent_end: string | null;
  revoked_at: string | null;
  token_hash: string;
  usage_count: number;
  royalty_accrued_cents: number;
  is_demo: boolean;
  created_at: string;
}

export interface ConsentEvent {
  id: string;
  avatar_id: string;
  event_type: "GRANTED" | "CATEGORY_ADDED" | "CATEGORY_REMOVED" | "REVOKED";
  detail: string | null;
  occurred_at: string;
}

// Categorie d'uso selezionabili in fase di onboarding
export const CATEGORIES = [
  "Business", "Luxury", "Travel", "Fashion", "Beauty", "Sport",
  "Entertainment", "Food", "Lifestyle", "Healthcare", "Politics", "Alcohol",
] as const;

export const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; description: string }> = {
  SPARK:  { label: "SPARK",  color: "#9ca3af", bg: "rgba(156,163,175,0.15)", description: "Ispirato a" },
  SHAPE:  { label: "SHAPE",  color: "#00A896", bg: "rgba(0,168,150,0.15)",   description: "Somiglianza stilizzata" },
  SOUL:   { label: "SOUL",   color: "#6B21E8", bg: "rgba(107,33,232,0.15)",  description: "Alta fedeltà" },
  HUMAN:  { label: "HUMAN",  color: "#B8005C", bg: "rgba(184,0,92,0.15)",    description: "Identity-locked" },
};
