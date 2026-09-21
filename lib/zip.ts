// ──────────────────────────────────────────────────────────────────────────
// ZIP "a magazzino" (store, niente compressione). Modulo PURO, zero librerie.
// Serve al kit campagna: dentro ci vanno PNG e JPEG, che sono GIA' compressi —
// rizipparli non toglierebbe un byte e costerebbe CPU sul worker. Lo standard
// (APPNOTE 6.3) permette il metodo 0 "stored", che tutti i sistemi aprono.
//
// Niente Zip64: il kit sta sotto i 4 GB per costruzione (5 immagini e un txt).
// ──────────────────────────────────────────────────────────────────────────

export interface VoceZip {
  nome: string; // percorso dentro l'archivio, con / come separatore
  dati: Buffer;
}

// CRC-32 (IEEE 802.3), la tabella si costruisce una volta sola.
const TAVOLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TAVOLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Data e ora in formato MS-DOS (quello che lo ZIP si porta dietro dal 1989).
function dataDos(d: Date): { data: number; ora: number } {
  return {
    data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    ora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  };
}

export function creaZip(voci: VoceZip[], quando: Date = new Date()): Buffer {
  const { data, ora } = dataDos(quando);
  const pezzi: Buffer[] = [];
  const centrale: Buffer[] = [];
  let offset = 0;

  for (const v of voci) {
    const nome = Buffer.from(v.nome, "utf8");
    const crc = crc32(v.dati);

    const locale = Buffer.alloc(30);
    locale.writeUInt32LE(0x04034b50, 0); // firma
    locale.writeUInt16LE(20, 4); // versione minima
    locale.writeUInt16LE(0x0800, 6); // nomi in UTF-8
    locale.writeUInt16LE(0, 8); // metodo 0 = stored
    locale.writeUInt16LE(ora, 10);
    locale.writeUInt16LE(data, 12);
    locale.writeUInt32LE(crc, 14);
    locale.writeUInt32LE(v.dati.length, 18);
    locale.writeUInt32LE(v.dati.length, 22);
    locale.writeUInt16LE(nome.length, 26);
    locale.writeUInt16LE(0, 28); // niente campi extra

    pezzi.push(locale, nome, v.dati);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4); // versione di chi ha scritto
    c.writeUInt16LE(20, 6); // versione minima
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(ora, 12);
    c.writeUInt16LE(data, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(v.dati.length, 20);
    c.writeUInt32LE(v.dati.length, 24);
    c.writeUInt16LE(nome.length, 28);
    c.writeUInt16LE(0, 30); // extra
    c.writeUInt16LE(0, 32); // commento
    c.writeUInt16LE(0, 34); // disco
    c.writeUInt16LE(0, 36); // attributi interni
    c.writeUInt32LE(0, 38); // attributi esterni
    c.writeUInt32LE(offset, 42);
    centrale.push(c, nome);

    offset += locale.length + nome.length + v.dati.length;
  }

  const dir = Buffer.concat(centrale);
  const fine = Buffer.alloc(22);
  fine.writeUInt32LE(0x06054b50, 0);
  fine.writeUInt16LE(0, 4); // disco
  fine.writeUInt16LE(0, 6); // disco con l'inizio della directory
  fine.writeUInt16LE(voci.length, 8);
  fine.writeUInt16LE(voci.length, 10);
  fine.writeUInt32LE(dir.length, 12);
  fine.writeUInt32LE(offset, 16);
  fine.writeUInt16LE(0, 20); // commento

  return Buffer.concat([...pezzi, dir, fine]);
}
