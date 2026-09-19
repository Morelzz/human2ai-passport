// Il certificato dentro il file del video (metadati MP4, campo "comment").
// Modulo PURO: lo scrive il worker (lib/video-fotogrammi conCertificato) e lo
// legge Sigil sul dispositivo, senza caricare il video da nessuna parte.
// I metadati si perdono se una piattaforma ricodifica il file: vale per il file
// originale scaricato da Semblic, il resto lo fanno certificato e Ward.

export const MARCHIO = "semblic-certificate:";

export function testoMarchio(certificate: string): string {
  return `${MARCHIO}${certificate} verifica su semblic.com/verify`;
}

export function leggiMarchio(bytes: Uint8Array): string | null {
  // latin1: ogni byte e' un carattere, il prefisso ASCII si trova anche in mezzo ai dati binari
  const testo = new TextDecoder("latin1").decode(bytes);
  const m = /semblic-certificate:([0-9a-f]{64})/.exec(testo);
  return m ? m[1] : null;
}
