// Fotogrammi di un video per i controlli (volti protetti, somiglianza).
// SERVER-ONLY: usa ffmpeg (pacchetto ffmpeg-static) e un file temporaneo che
// si cancella sempre. Gira sul worker (Railway, next start), non su Vercel.

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Un fotogramma a meta' di ogni secondo, piu' uno vicino alla fine: in 5 s
// sono 6 controlli, in 10 s 11. I volti che girano o cambiano a meta' video
// non sfuggono.
export function istantiPer(secondi: number): number[] {
  const s = Math.max(1, Math.round(secondi));
  const t = Array.from({ length: s }, (_, i) => i + 0.5);
  const fine = Math.max(0, s - 0.15);
  if (fine - t[t.length - 1] > 0.2) t.push(Math.round(fine * 100) / 100);
  return t;
}

function ffmpeg(args: string[]): Promise<Buffer> {
  return new Promise(async (ok, ko) => {
    const mod = await import("ffmpeg-static");
    const bin = (mod.default ?? mod) as unknown as string | null;
    if (!bin) return ko(new Error("ffmpeg non disponibile su questo host"));
    execFile(bin, args, { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, timeout: 60_000 }, (err, stdout) => (err ? ko(err) : ok(stdout)));
  });
}

export async function fotogrammi(video: Buffer, secondi: number): Promise<{ t: number; png: Buffer }[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "anima-"));
  const file = path.join(dir, "v.mp4");
  try {
    await writeFile(file, video);
    const out: { t: number; png: Buffer }[] = [];
    for (const t of istantiPer(secondi)) {
      const png = await ffmpeg(["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]);
      if (png.length > 1000) out.push({ t, png });
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
