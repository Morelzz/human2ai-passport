// ──────────────────────────────────────────────────────────────────────────
// "Dimmi cosa cambiare": fallback OFFLINE a parole chiave (porta del cmd del
// prototipo) + applicazione dei delta allo stato. Stesso formato della route
// /api/edit/interpret: { adjust: {<sezione.chiave>: delta}, preset }.
// ──────────────────────────────────────────────────────────────────────────

import type { EditState } from "@/lib/editor/types";

export interface EditCommand {
  adjust: Record<string, number>;
  preset: string | null;
}

// Mappa di parole chiave -> delta (fallback senza Claude API).
export function keywordCommand(raw: string): EditCommand {
  const t = (raw || "").toLowerCase();
  const adjust: Record<string, number> = {};
  let preset: string | null = null;
  if (/cald|warm/.test(t)) adjust["color.temp"] = 30;
  if (/fredd|cool/.test(t)) adjust["color.temp"] = -30;
  if (/schiar|luminos|chiar(?!ezza)/.test(t)) adjust["light.exp"] = 26;
  if (/scuri|scura|buio/.test(t)) adjust["light.exp"] = -26;
  if (/contrast/.test(t)) adjust["light.con"] = 28;
  if (/nitid|sharp/.test(t)) adjust["detail.sharp"] = 30;
  if (/chiarezza|clarity/.test(t)) adjust["detail.clar"] = 28;
  if (/satur|vivid|vivi/.test(t)) adjust["color.vib"] = 28;
  if (/vignett/.test(t)) adjust["detail.vig"] = 45;
  if (/gran/.test(t)) adjust["detail.grain"] = 40;
  if (/bianco e nero|b\/n|grigi/.test(t)) preset = "bn";
  if (/pastell/.test(t)) preset = "pastello";
  if (/cinema/.test(t)) preset = "cinema";
  if (/vintage/.test(t)) preset = "vintage";
  return { adjust, preset };
}

const RANGE: Record<string, [number, number]> = {
  "detail.vig": [0, 100],
  "detail.grain": [0, 100],
};

// Applica un comando allo stato (delta RELATIVI, clampati per range). Non
// distruttivo: ritorna un nuovo EditState.
export function applyCommand(state: EditState, cmd: EditCommand): EditState {
  const n: EditState = JSON.parse(JSON.stringify(state));
  if (cmd.preset) n.preset = cmd.preset;
  const sections = n as unknown as Record<string, Record<string, number>>;
  for (const [path, delta] of Object.entries(cmd.adjust)) {
    const dot = path.indexOf(".");
    const sec = path.slice(0, dot);
    const key = path.slice(dot + 1);
    const obj = sections[sec];
    if (obj && typeof obj[key] === "number") {
      const [lo, hi] = RANGE[path] ?? [-100, 100];
      obj[key] = Math.max(lo, Math.min(hi, obj[key] + delta));
    }
  }
  return n;
}

export function isEmptyCommand(cmd: EditCommand | null | undefined): boolean {
  return !cmd || (Object.keys(cmd.adjust ?? {}).length === 0 && !cmd.preset);
}
