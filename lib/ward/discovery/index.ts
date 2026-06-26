import type { DiscoveryProvider } from "./types";
import { StubDiscoveryProvider } from "./stub";
import { GoogleVisionDiscoveryProvider } from "./google-vision";
import { isProdLike, reportDegradation } from "@/lib/observability";

// Sceglie il provider di discovery: Google Vision se la chiave c'e', altrimenti
// lo STUB (cosi' la pipeline gira in dev senza chiave). Override esplicito via
// env WARD_DISCOVERY=stub|google-vision.
export function getDiscoveryProvider(): DiscoveryProvider {
  const forced = process.env.WARD_DISCOVERY;
  if (forced === "stub") return new StubDiscoveryProvider();
  const gv = new GoogleVisionDiscoveryProvider();
  if (gv.enabled || forced === "google-vision") return gv;
  // CRIT-8/A12: fallback a stub senza chiave Vision. In dev e atteso (niente
  // rumore); in prod e un DEGRADO (lo scan non e reale) e va segnalato.
  if (isProdLike()) reportDegradation("ward.discovery_stub", { reason: "no_google_vision_key" });
  return new StubDiscoveryProvider();
}

export type { DiscoveryProvider, DiscoveryQuery, Candidate, MatchKind } from "./types";
