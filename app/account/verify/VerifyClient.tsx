"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeFaceMatch } from "@/lib/face-match";

// KYC reale (step 1): la persona carica documento + selfie + foto del volto.
// Vengono salvati nello Storage privato e il profilo va "in revisione".
// Il face-match automatico (documento↔selfie↔foto) sarà il passo successivo.
export default function VerifyClient({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialStatus === "pending");
  const approved = initialStatus === "approved";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !selfie || photos.length < 1) {
      setErr("Carica documento, selfie e almeno una foto del volto.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // Face match SUL DISPOSITIVO (documento ↔ selfie ↔ prima foto): è il
      // pre-screening che l'operatore vedrà in coda. Best-effort: se fallisce
      // (modelli non caricati, volto non trovato) l'invio procede comunque.
      setPhase("Confronto i volti sul tuo dispositivo…");
      const match = await computeFaceMatch(doc, selfie, photos[0]).catch(() => null);

      // Ridimensiona PRIMA dell'invio: i file originali (PNG/foto da telefono)
      // superano facilmente il limite di 4,5MB del body su Vercel -> 413 muto.
      // Il documento resta più grande (deve essere leggibile), le foto bastano più piccole.
      setPhase("Invio in corso…");
      const fd = new FormData();
      fd.append("document", await shrinkForUpload(doc, 2000, 0.92));
      fd.append("selfie", await shrinkForUpload(selfie, 1600, 0.9));
      for (const p of photos) fd.append("photos", await shrinkForUpload(p, 1280, 0.85));
      if (match) fd.append("face_match", JSON.stringify(match));
      const res = await fetch("/api/kyc/submit", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          j.error ??
            (res.status === 413
              ? "I file sono troppo grandi: riduci il numero di foto e riprova."
              : `Invio non riuscito (errore ${res.status}). Riprova.`),
        );
        setBusy(false);
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setErr("Errore di rete");
    }
    setBusy(false);
  }

  if (approved) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-teal">✓ Identità verificata</p>
          <p className="mt-2 text-sm text-muted">Sei un creatore verificato. Puoi creare il tuo avatar nel registro.</p>
          <Link href="/account" className="mt-6 inline-block text-sm text-violet-light hover:underline">← Torna all&apos;account</Link>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-violet-light">● In revisione</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Abbiamo ricevuto i tuoi documenti. Verifichiamo che il documento corrisponda al tuo volto e ti avvisiamo all&apos;esito.
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-violet-light hover:underline">← Torna all&apos;account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
      <span className="text-xs font-bold tracking-[0.14em] text-teal">VERIFICA IDENTITÀ</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Carica i tuoi documenti</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Per entrare nel registro confermiamo che sei una persona reale e che il volto è il tuo.
        I file restano <span className="text-foreground">privati</span>, usati solo per la verifica.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <FilePick label="Documento d'identità" hint="carta d'identità o passaporto" file={doc} onPick={setDoc} />
        <FilePick label="Selfie" hint="una foto del tuo viso, ora" file={selfie} onPick={setSelfie} />
        <MultiPick label="Foto del volto" hint="da 1 a 10, per addestrare l'avatar" files={photos} onPick={setPhotos} />

        {err && <p className="text-sm text-crimson">{err}</p>}

        <button type="submit" disabled={busy}
          className="mt-2 rounded-xl bg-[linear-gradient(135deg,#6B21E8,#B8005C)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_40px_rgba(107,33,232,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
          {busy ? phase ?? "Invio in corso…" : "Invia per la verifica"}
        </button>
        <p className="text-xs leading-relaxed text-faint">
          Inviando dichiari di essere la persona rappresentata e acconsenti alla verifica della tua identità.
        </p>
      </form>
    </section>
  );
}

// Ridimensiona un'immagine a maxDim px (lato lungo) e la converte in JPEG.
// Se il browser non riesce a decodificarla (es. HEIC), invia l'originale:
// meglio un tentativo che un blocco.
function shrinkForUpload(file: File, maxDim: number, quality: number): Promise<File> {
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

function FilePick({ label, hint, file, onPick }: { label: string; hint: string; file: File | null; onPick: (f: File | null) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-muted">{label} <span className="font-normal text-faint">· {hint}</span></label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-white/15 bg-obsidian-2 px-4 py-3 text-sm transition-colors hover:border-violet/40">
        <span className={file ? "text-foreground" : "text-faint"}>{file ? file.name : "Scegli un file…"}</span>
        <span className="text-violet-light">{file ? "Cambia" : "Sfoglia"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

function MultiPick({ label, hint, files, onPick }: { label: string; hint: string; files: File[]; onPick: (f: File[]) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-muted">{label} <span className="font-normal text-faint">· {hint}</span></label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-white/15 bg-obsidian-2 px-4 py-3 text-sm transition-colors hover:border-violet/40">
        <span className={files.length ? "text-foreground" : "text-faint"}>{files.length ? `${files.length} foto selezionate` : "Scegli le foto…"}</span>
        <span className="text-violet-light">Sfoglia</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPick(Array.from(e.target.files ?? []).slice(0, 10))} />
      </label>
    </div>
  );
}
