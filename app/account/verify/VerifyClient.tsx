"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeFaceMatch } from "@/lib/face-match";
import { POSES, PoseGlyph } from "@/components/avatar/poses";

// KYC reale (step 1): la persona carica documento (fronte+retro), selfie e
// le foto del volto nello schema a 8 pose (lo stesso della creazione avatar).
// Tutto viene ridimensionato sul dispositivo, confrontato col face match
// locale (pre-screening per la coda operatori) e salvato nello Storage
// privato; il profilo va "in revisione".

type Slot = { file: File; url: string } | null;

export default function VerifyClient({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const [docFront, setDocFront] = useState<Slot>(null);
  const [docBack, setDocBack] = useState<Slot>(null);
  const [selfie, setSelfie] = useState<Slot>(null);
  const [poseSlots, setPoseSlots] = useState<Slot[]>(() => Array(POSES.length).fill(null));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialStatus === "pending");
  const approved = initialStatus === "approved";

  const photoCount = poseSlots.filter(Boolean).length;

  function slotFrom(file: File | undefined): Slot {
    return file ? { file, url: URL.createObjectURL(file) } : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!docFront || !docBack || !selfie || photoCount < 1) {
      setErr("Servono documento (fronte e retro), selfie e almeno una foto del volto.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // 1) Ridimensiona PRIMA di tutto: i file originali (PNG/foto da telefono)
      // superano facilmente il limite di 4,5MB del body su Vercel -> 413 muto.
      // Il documento resta più grande (deve essere leggibile).
      setPhase("Preparo i file…");
      const front = await shrinkForUpload(docFront.file, 2000, 0.92);
      const back = await shrinkForUpload(docBack.file, 2000, 0.92);
      const selfieSmall = await shrinkForUpload(selfie.file, 1600, 0.9);
      const photos: File[] = [];
      for (const s of poseSlots) if (s) photos.push(await shrinkForUpload(s.file, 1280, 0.85));

      // 2) Face match SUL DISPOSITIVO (fronte documento ↔ selfie ↔ tutte le
      // foto): pre-screening per la coda operatori. Best-effort: se fallisce
      // l'invio procede comunque.
      setPhase("Confronto i volti sul tuo dispositivo…");
      const match = await computeFaceMatch(front, selfieSmall, photos).catch(() => null);

      // 3) Invio
      setPhase("Invio in corso…");
      const fd = new FormData();
      fd.append("document_front", front);
      fd.append("document_back", back);
      fd.append("selfie", selfieSmall);
      for (const p of photos) fd.append("photos", p);
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
    <section className="mx-auto max-w-xl px-5 py-14 sm:px-8">
      <span className="text-xs font-bold tracking-[0.14em] text-teal">VERIFICA IDENTITÀ</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Carica i tuoi documenti</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Per entrare nel registro confermiamo che sei una persona reale e che il volto è il tuo.
        I file restano <span className="text-foreground">privati</span>, usati solo per la verifica.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-7">
        {/* Documento: fronte + retro */}
        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Documento d&apos;identità <span className="font-normal text-faint">· carta d&apos;identità o passaporto</span></p>
          <div className="grid grid-cols-2 gap-3">
            <PickBox label="Fronte" hint="il lato con la foto" slot={docFront} aspect="3/2" onPick={(f) => setDocFront(slotFrom(f))} />
            <PickBox label="Retro" hint="l'altro lato" slot={docBack} aspect="3/2" onPick={(f) => setDocBack(slotFrom(f))} />
          </div>
        </div>

        {/* Selfie: uno solo */}
        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Selfie <span className="font-normal text-faint">· una foto del tuo viso, scattata ora</span></p>
          <div className="grid grid-cols-2 gap-3">
            <PickBox label="Selfie" hint="viso frontale, luce naturale" slot={selfie} aspect="3/4" onPick={(f) => setSelfie(slotFrom(f))} />
          </div>
        </div>

        {/* Foto del volto: griglia a 8 pose (la stessa dell'avatar) */}
        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Foto del volto <span className="font-normal text-faint">· segui lo schema, servono per addestrare l&apos;avatar</span></p>
          <div className="grid grid-cols-4 gap-2.5">
            {POSES.map((p, slot) => (
              <label key={p.key} title={p.tip}
                className={`focus-ring relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed p-1.5 transition-colors ${poseSlots[slot] ? "border-violet bg-violet/10" : "border-border hover:border-violet/40"}`}>
                {poseSlots[slot] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poseSlots[slot]!.url} alt={p.label} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <PoseGlyph pose={p} />
                    <span className="text-center text-[0.58rem] font-semibold leading-tight text-muted">{p.label}</span>
                  </>
                )}
                <input type="file" accept="image/*" aria-label={`Carica foto: ${p.label}`} className="sr-only"
                  onChange={(e) => {
                    const s = slotFrom(e.target.files?.[0]);
                    if (s) setPoseSlots((a) => { const n = [...a]; n[slot] = s; return n; });
                    e.currentTarget.value = "";
                  }} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">{photoCount > 0 ? `${photoCount} su ${POSES.length} pose caricate` : "Carica almeno una posa (più ne carichi, migliore sarà l'avatar)."} Tutte le foto passano dal confronto automatico col selfie.</p>
        </div>

        {err && <p className="text-sm text-crimson">{err}</p>}

        <button type="submit" disabled={busy}
          className="mt-1 rounded-xl bg-[#F2A93B] px-6 py-3.5 text-sm font-bold text-[#412402] shadow-[0_8px_40px_rgba(242,169,59,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
          {busy ? phase ?? "Invio in corso…" : "Invia per la verifica"}
        </button>
        <p className="text-xs leading-relaxed text-faint">
          Inviando dichiari di essere la persona rappresentata e acconsenti alla verifica della tua identità.
        </p>
      </form>
    </section>
  );
}

// Riquadro di caricamento singolo con anteprima (documento fronte/retro, selfie).
function PickBox({ label, hint, slot, aspect, onPick }: {
  label: string; hint: string; slot: Slot; aspect: "3/2" | "3/4"; onPick: (f: File | undefined) => void;
}) {
  return (
    <label
      className={`focus-ring relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed p-3 transition-colors ${slot ? "border-violet bg-violet/10" : "border-border hover:border-violet/40"}`}
      style={{ aspectRatio: aspect === "3/2" ? "3 / 2" : "3 / 4" }}>
      {slot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="text-sm font-bold text-foreground">{label}</span>
          <span className="text-center text-[0.66rem] leading-tight text-faint">{hint}</span>
          <span className="mt-1 text-xs font-semibold text-violet-light">Sfoglia</span>
        </>
      )}
      {slot && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.62rem] font-bold text-violet-light">Cambia</span>
      )}
      <input type="file" accept="image/*" aria-label={`Carica ${label}`} className="sr-only"
        onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </label>
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
