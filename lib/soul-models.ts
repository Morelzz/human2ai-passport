// Catalogo dei modelli di generazione e degli stili Soul.
// Usato sia dal motore (lib/higgsfield.ts) sia dalla UI (/match).
//
// Tutti i modelli qui elencati sono IDENTITY-LOCKED: usano il Soul addestrato
// (il volto reale della persona), quindi rispettano la tesi di Human2AI.

export type SoulModel = "soul-v2" | "soul-id";

export interface SoulModelInfo {
  id: SoulModel;
  label: string;
  quality: string;       // risoluzione/qualità mostrata all'utente
  description: string;
  supportsStyles: boolean; // gli stili Soul si applicano solo al modello v1 (Soul ID)
}

// Default = Soul 2.0: realismo editoriale a 2k.
// Nomi brand Human2AI: HUMAN = massima fedeltà (Soul 2.0), SHAPE = classico con stili (Soul ID).
export const SOUL_MODELS: SoulModelInfo[] = [
  { id: "soul-v2", label: "HUMAN", quality: "2k", description: "Massima fedeltà, realismo editoriale", supportsStyles: false },
  { id: "soul-id", label: "SHAPE", quality: "1080p", description: "Classico, con stili artistici", supportsStyles: true },
];

export const DEFAULT_MODEL: SoulModel = "soul-v2";

export function isValidModel(m: string | null | undefined): m is SoulModel {
  return m === "soul-v2" || m === "soul-id";
}

// Etichetta-tier (brand) di un modello Higgsfield: HUMAN (soul-v2) / SHAPE (soul-id).
// ECHO ha la sua etichetta a parte. Usata per marcare la generazione col motore usato.
export function modelTierLabel(model: string | null | undefined): string {
  return SOUL_MODELS.find((m) => m.id === model)?.label ?? "HUMAN";
}

// Stili Soul (sottoinsieme curato dei 106 disponibili sul motore).
// Si applicano SOLO al modello Soul ID (v1) tramite style_id.
export interface SoulStyleInfo { id: string; label: string; }

export const SOUL_STYLES: SoulStyleInfo[] = [
  { id: "1cb4b936-77bf-4f9a-9039-f3d349a4cdbe", label: "Realistic" },
  { id: "811de7ab-7aaf-4a6b-b352-cdea6c34c8f1", label: "Movie" },
  { id: "40ff999c-f576-443c-b5b3-c7d1391a666e", label: "Spotlight" },
  { id: "ff1ad8a2-94e7-4e70-a12f-e992ca9a0d36", label: "Quiet luxury" },
  { id: "ca4e6ad3-3e93-4e03-81a0-d1722d2c128b", label: "DigitalCam" },
  { id: "1b798b54-03da-446a-93bf-12fcba1050d7", label: "iPhone" },
  { id: "dab472a6-23f4-4cf8-98fe-f3e256f1b549", label: "Amalfi Summer" },
  { id: "62ba1751-63af-4648-a11c-711ac64e216a", label: "Night Beach" },
  { id: "26241c54-ed78-4ea7-b1bf-d881737c9feb", label: "Sunset beach" },
  { id: "86fc814e-856a-4af0-98b0-d4da75d0030b", label: "FashionShow" },
  { id: "f5c094c7-4671-4d86-90d2-369c8fdbd7a5", label: "90s Grain" },
  { id: "99de6fc5-1177-49b9-b2e9-19e17d95bcaf", label: "Tokyo Streetstyle" },
];

export function isValidStyle(id: string | null | undefined): boolean {
  return !!id && SOUL_STYLES.some((s) => s.id === id);
}
