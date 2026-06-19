// DISCOVERY (Job B, strato esterno). Trova immagini CANDIDATE sul web per
// SIMILARITA' DI CONTENUTO (reverse image), NON per biometria: rispetta le
// regole A2 (niente ricerca-volti di massa stile Clearview/PimEyes). Il match
// biometrico 1:1 contro la persona monitorata avviene DOPO, nel matching engine.

export interface Candidate {
  url: string;       // URL diretto dell'immagine candidata
  pageUrl?: string;  // pagina che la ospita, se nota
  host: string;      // host estratto dall'URL (per dedup/allowlist)
}

export interface DiscoveryQuery {
  // Riferimento da cercare: un'immagine PUBBLICA dell'avatar (URL) o i bytes.
  imageUrl?: string;
  imageBytes?: Uint8Array;
}

export interface DiscoveryProvider {
  readonly name: string;
  readonly enabled: boolean; // false se manca la chiave/config (provider inerte)
  find(query: DiscoveryQuery, limit: number): Promise<Candidate[]>;
}

export function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return ""; }
}
