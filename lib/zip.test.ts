import { describe, expect, it } from "vitest";
import { creaZip, crc32 } from "./zip";
import { liberatoria, FORMATI, riquadroTaglio } from "./kit-campagna";

describe("zip a magazzino", () => {
  it("il CRC32 e' quello standard", () => {
    // valori noti dello standard IEEE
    expect(crc32(Buffer.from(""))).toBe(0);
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("l'archivio ha la firma, i file dentro e la fine giusta", () => {
    const z = creaZip([
      { nome: "uno.txt", dati: Buffer.from("ciao") },
      { nome: "cartella/due.bin", dati: Buffer.from([0, 1, 2, 3, 255]) },
    ], new Date("2026-09-21T13:00:00Z"));

    expect(z.readUInt32LE(0)).toBe(0x04034b50); // primo header locale
    expect(z.includes(Buffer.from("uno.txt"))).toBe(true);
    expect(z.includes(Buffer.from("cartella/due.bin"))).toBe(true);
    expect(z.includes(Buffer.from("ciao"))).toBe(true);

    // la coda: firma di fine, due voci, e l'offset della directory dentro il file
    const fine = z.length - 22;
    expect(z.readUInt32LE(fine)).toBe(0x06054b50);
    expect(z.readUInt16LE(fine + 8)).toBe(2);
    expect(z.readUInt16LE(fine + 10)).toBe(2);
    const dirOff = z.readUInt32LE(fine + 16);
    expect(z.readUInt32LE(dirOff)).toBe(0x02014b50); // la directory centrale sta li'
    expect(dirOff + z.readUInt32LE(fine + 12)).toBe(fine);
  });

  it("un archivio vuoto resta un archivio valido", () => {
    const z = creaZip([]);
    expect(z.length).toBe(22);
    expect(z.readUInt32LE(0)).toBe(0x06054b50);
  });
});

describe("kit campagna", () => {
  it("la liberatoria nomina le persone, il certificato e tutti i file", () => {
    const t = liberatoria({
      certificato: "abc123",
      scena: "due amiche al bar",
      quando: "2026-09-21T10:00:00Z",
      persone: [
        { alias: "Gabriella", handle: "gabriella", somiglianza: 97 },
        { alias: "Stella", handle: "stella", somiglianza: 86 },
      ],
      verifyUrl: "https://semblic.com/verify",
    });
    expect(t).toContain("Certificato: abc123");
    expect(t).toContain("Gabriella");
    expect(t).toContain("semblic.com/passport/stella");
    expect(t).toContain("somiglianza misurata 97%");
    expect(t).toContain("due amiche al bar");
    for (const f of FORMATI) expect(t).toContain(f.nome);
    expect(t).toContain("originale.png");
    expect(t).toContain("liberatoria.txt");
  });

  it("senza persone la liberatoria non si rompe", () => {
    const t = liberatoria({ certificato: "x", scena: "", quando: "2026-09-21T10:00:00Z", persone: [], verifyUrl: "u" });
    expect(t).toContain("nessuna persona registrata");
  });
});

describe("il ritaglio del kit", () => {
  // scatto verticale tipico del motore
  const W = 1024, H = 1536;
  const volto = { x: 400, y: 300, w: 220, h: 220 }; // un volto in alto al centro

  it("il riquadro ha sempre le proporzioni chieste e sta dentro l'immagine", () => {
    for (const [tw, th] of [[1080, 1080], [1080, 1350], [1080, 1920], [1920, 1080]]) {
      const q = riquadroTaglio(W, H, tw, th, [volto]);
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.x + q.w).toBeLessThanOrEqual(W);
      expect(q.y + q.h).toBeLessThanOrEqual(H);
      expect(q.w / q.h).toBeCloseTo(tw / th, 2);
    }
  });

  it("il volto resta SEMPRE dentro il taglio, anche nel 16:9", () => {
    for (const [tw, th] of [[1080, 1080], [1080, 1350], [1080, 1920], [1920, 1080]]) {
      const q = riquadroTaglio(W, H, tw, th, [volto]);
      expect(q.x).toBeLessThanOrEqual(volto.x);
      expect(q.y).toBeLessThanOrEqual(volto.y);
      expect(q.x + q.w).toBeGreaterThanOrEqual(volto.x + volto.w);
      expect(q.y + q.h).toBeGreaterThanOrEqual(volto.y + volto.h);
    }
  });

  it("lascia aria sopra la testa: il volto non sta appiccicato al bordo alto", () => {
    const q = riquadroTaglio(W, H, 1920, 1080, [volto]);
    expect(volto.y - q.y).toBeGreaterThan(40);
  });

  it("con due persone tiene dentro tutte e due", () => {
    const a = { x: 180, y: 320, w: 200, h: 200 };
    const b = { x: 640, y: 300, w: 200, h: 200 };
    const q = riquadroTaglio(W, H, 1920, 1080, [a, b]);
    expect(q.x).toBeLessThanOrEqual(a.x);
    expect(q.x + q.w).toBeGreaterThanOrEqual(b.x + b.w);
  });

  it("senza volti non si rompe e resta dentro i bordi", () => {
    const q = riquadroTaglio(W, H, 1920, 1080, []);
    expect(q.x).toBe(0);
    expect(q.y).toBeGreaterThanOrEqual(0);
    expect(q.y + q.h).toBeLessThanOrEqual(H);
  });

  it("un volto enorme che non ci sta comunque non manda il riquadro fuori", () => {
    const grosso = { x: 0, y: 0, w: 1024, h: 1400 };
    const q = riquadroTaglio(W, H, 1920, 1080, [grosso]);
    expect(q.x).toBeGreaterThanOrEqual(0);
    expect(q.y).toBeGreaterThanOrEqual(0);
    expect(q.x + q.w).toBeLessThanOrEqual(W);
    expect(q.y + q.h).toBeLessThanOrEqual(H);
  });
});
