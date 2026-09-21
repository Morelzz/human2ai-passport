import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// GUARDIA (21/9/2026). Da quando esiste generation_people ci sono DUE strade fra
// generations e avatars: un embed "avatars(...)" in una query che parte da
// generations diventa ambiguo, PostgREST risponde errore e la pagina resta vuota.
// Cosi' il 19/9 si sono rotte in produzione le immagini (/api/content), le
// ricevute e Sigil, senza che nessun test se ne accorgesse: i test non parlano
// col database. Questa prova legge il codice e non lascia passare la forma
// ambigua. Le query che partono da generation_people hanno un legame solo e
// restano com'erano.
const RADICI = ["app", "lib", "components"];
const ESTENSIONI = [".ts", ".tsx"];

function file(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return file(p);
    return ESTENSIONI.includes(path.extname(p)) && !p.endsWith(".test.ts") ? [p] : [];
  });
}

describe("embed fra generations e avatars", () => {
  it("nessuna query da generations incorpora 'avatars(' senza dire quale legame", () => {
    const colpevoli: string[] = [];
    for (const radice of RADICI) {
      for (const p of file(path.join(process.cwd(), radice))) {
        const righe = readFileSync(p, "utf8").split("\n");
        righe.forEach((r, i) => {
          if (!r.includes("avatars(") || r.includes("avatars!")) return;
          const contesto = righe.slice(Math.max(0, i - 6), i + 1).join("\n");
          if (contesto.includes("generation_people")) return; // un solo legame: va bene
          if (!contesto.includes('from("generations")')) return; // non parte da generations
          colpevoli.push(`${path.relative(process.cwd(), p)}:${i + 1}`);
        });
      }
    }
    expect(colpevoli).toEqual([]);
  });
});
