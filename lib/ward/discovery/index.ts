import type { DiscoveryProvider } from "./types";
import { StubDiscoveryProvider } from "./stub";
import { GoogleVisionDiscoveryProvider } from "./google-vision";

// Sceglie il provider di discovery: Google Vision se la chiave c'e', altrimenti
// lo STUB (cosi' la pipeline gira in dev senza chiave). Override esplicito via
// env WARD_DISCOVERY=stub|google-vision.
export function getDiscoveryProvider(): DiscoveryProvider {
  const forced = process.env.WARD_DISCOVERY;
  if (forced === "stub") return new StubDiscoveryProvider();
  const gv = new GoogleVisionDiscoveryProvider();
  if (gv.enabled || forced === "google-vision") return gv;
  return new StubDiscoveryProvider();
}

export type { DiscoveryProvider, DiscoveryQuery, Candidate } from "./types";
