"use client";

import { useState } from "react";
import { descriptorForFile } from "@/lib/face-match";
import { POSES, PoseGlyph } from "@/components/avatar/poses";

// Cattura del volto riusabile (spec Passo 3b: SOLO foto del viso). I descrittori
// FaceNet si calcolano SUL DISPOSITIVO e formano il faceprint difensivo; i pixel
// restano privati. Registra la protezione via /api/veto/register (crea l'avatar
// protection_only + il faceprint). L'identita e' gia' verificata dal KYC a monte,
// quindi niente documento qui. onDone scatta a registrazione riuscita.
type Slot = { file: File; url: string } | null;

export function FaceCapture({ onDone }: { onDone: () => void }) {
  const [slots, setSlots] = useState<Slot[]>(() => Array(POSES.length).fill(null));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const count = slots.filter(Boolean).length;
  const slotFrom = (file: File | undefined): Slot => (file ? { file, url: URL.createObjectURL(file) } : null);

  async function submit() {
    if (count < 1) { setErr("Carica almeno una foto frontale del tuo volto."); return; }
    setBusy(true); setErr(null);
    try {
      setPhase("Preparo le foto...");
      const photos: File[] = [];
      for (const s of slots) if (s) photos.push(await shrink(s.file, 1280, 0.85));

      setPhase("Leggo il tuo volto sul dispositivo... (la prima analisi scarica i modelli)");
      const descriptors: number[][] = [];
      for (const p of photos) { const d = await descriptorForFile(p); if (d) descriptors.push(d); }
      if (descriptors.length === 0) {
        setErr("Non riesco a leggere un volto nitido. Riprova con scatti frontali e ben illuminati.");
        setBusy(false); return;
      }

      setPhase("Registro la protezione...");
      const fd = new FormData();
      for (const p of photos) fd.append("photos", p);
      fd.append("descriptors", JSON.stringify(descriptors));
      fd.append("art9_consent", "true");
      const res = await fetch("/api/veto/register", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `Registrazione non riuscita (errore ${res.status}).`); setBusy(false); return; }
      onDone();
    } catch {
      setErr("Errore di rete.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="wf-caps">
        {POSES.map((p, i) => (
          <label key={p.key} title={p.tip} className={`wf-cap${slots[i] ? " filled" : ""}`}>
            {slots[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slots[i]!.url} alt={p.label} className="wf-cap-img" />
            ) : (
              <>
                <PoseGlyph pose={p} />
                <span className="wf-cap-lab">{p.label}</span>
              </>
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const s = slotFrom(e.target.files?.[0]);
              if (s) setSlots((a) => { const n = [...a]; n[i] = s; return n; });
              e.currentTarget.value = "";
            }} />
          </label>
        ))}
      </div>
      <p className="wf-hint">{count > 0 ? `${count} su ${POSES.length} pose caricate` : "Carica almeno una posa frontale, piu' ne carichi piu' robusta e' la protezione."}</p>
      <p className="wf-hint">Cifrate. Solo tue. Mai vendute, mai usate per addestrare nulla.</p>
      {err && <p className="wf-err">{err}</p>}
      <button type="button" className="wf-btn" disabled={busy} onClick={submit}>
        {busy ? (phase ?? "Registro...") : "Salva le foto e proteggi"}
      </button>
    </div>
  );
}

// Ridimensiona a maxDim px (lato lungo) e converte in JPEG; se il browser non
// decodifica (es. HEIC) invia l'originale.
function shrink(file: File, maxDim: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
