import type { ConsentStatus } from "./consent";

// Stato del cancello Ward (spec B3). PURA. locked = non loggato o nessun avatar;
// demo = ha un avatar ma il monitoraggio non e' attivo; full = avatar +
// monitoraggio attivo. La distinzione demo/locked dipende dal POSSESSO di un
// avatar (non solo dal login), cosi il visitatore senza avatar vede i 3 pannelli.
export type WardGateState = "full" | "demo" | "locked";

export function wardGateState(p: {
  loggedIn: boolean;
  hasAvatar: boolean;
  monitoring: ConsentStatus;
}): WardGateState {
  if (!p.loggedIn || !p.hasAvatar) return "locked";
  return p.monitoring === "active" ? "full" : "demo";
}
