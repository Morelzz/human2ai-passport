import type { DiscoveryProvider, DiscoveryQuery, Candidate } from "./types";
import { hostOf } from "./types";

// Provider STUB: per costruire e testare la pipeline di scan SENZA chiavi
// esterne. Ritorna candidati fissi (innocui) e NON fa rete. In dev e' il default
// finche' non c'e' la chiave Google Vision.
const STUB_URLS = [
  "https://cdn.unknown-host.ru/img/a1.jpg",
  "https://repost-board.net/u/abc.jpg",
  "https://mirror-cdn.io/x/77.png",
  "https://ad-network.io/banner/9.jpg",
];

export class StubDiscoveryProvider implements DiscoveryProvider {
  readonly name = "stub";
  readonly enabled = true;
  async find(_query: DiscoveryQuery, limit: number): Promise<Candidate[]> {
    return STUB_URLS.slice(0, limit).map((url) => ({ url, host: hostOf(url) }));
  }
}
