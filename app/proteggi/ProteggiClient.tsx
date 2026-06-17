"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeFaceMatch, descriptorForFile } from "@/lib/face-match";
import { POSES, PoseGlyph } from "@/components/avatar/poses";

// Fase 2.4/2.6 (modulo VETO): registrazione INVERSA "Diritto all'Oblio Generativo".
// Stessa raccolta del KYC (documento + selfie + foto del volto, tutto a riquadri),
// ma sbocca nello stato OPPOSTO: il volto entra in sola protezione. I descrittori
// FaceNet si calcolano SUL DISPOSITIVO e formano il faceprint difensivo; i pixel
// restano privati. Consenso Art.9 esplicito. Niente avatar, niente repertorio.

type Slot = { file: File; url: string } | null;

export default function ProteggiClient({ alreadyProtected, hasPublicAvatar }: { alreadyProtected: boolean; hasPublicAvatar: boolean }) {
  const router = useRouter();
  const [docFront, setDocFront] = useState<Slot>(null);
  const [docBack, setDocBack] = useState<Slot>(null);
  const [selfie, setSelfie] = useState<Slot>(null);
  const [poseSlots, setPoseSlots] = useState<Slot[]>(() => Array(POSES.length).fill(null));
  const [art9, setArt9] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyProtected);

  const photoCount = poseSlots.filter(Boolean).length;
  const slotFrom = (file: File | undefined): Slot => (file ? { file, url: URL.createObjectURL(file) } : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!docFront || !selfie || photoCount < 1) {
      setErr("Servono il documento (fronte), un selfie e almeno una foto del volto.");
      return;
    }
    if (!art9) {
      setErr("Per registrare la protezione devi dare il consenso al trattamento del dato biometrico a soli fini difensivi.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      setPhase("Preparo i file…");
      const front = await shrinkForUpload(docFront.file, 2000, 0.92);
      const back = docBack ? await shrinkForUpload(docBack.file, 2000, 0.92) : null;
      const selfieSmall = await shrinkForUpload(selfie.file, 1600, 0.9);
      const photos: File[] = [];
      for (const s of poseSlots) if (s) photos.push(await shrinkForUpload(s.file, 1280, 0.85));

      // Faceprint difensivo + verifica anti-abuso, tutto sul dispositivo.
      setPhase("Leggo il tuo volto sul dispositivo… (la prima analisi scarica i modelli)");
      const match = await computeFaceMatch(front, selfieSmall, photos).catch(() => null);
      const descriptors: number[][] = [];
      for (const p of photos) {
        const d = await descriptorForFile(p);
        if (d) descriptors.push(d);
      }
      const dSelfie = await descriptorForFile(selfieSmall);
      if (dSelfie) descriptors.push(dSelfie);
      if (descriptors.length === 0) {
        setErr("Non riesco a leggere un volto nitido dalle foto. Riprova con scatti frontali e ben illuminati.");
        setBusy(false);
        return;
      }

      setPhase("Registro la protezione…");
      const fd = new FormData();
      fd.append("document_front", front);
      if (back) fd.append("document_back", back);
      fd.append("selfie", selfieSmall);
      for (const p of photos) fd.append("photos", p);
      fd.append("descriptors", JSON.stringify(descriptors));
      if (match) fd.append("face_match", JSON.stringify(match));
      fd.append("art9_consent", "true");

      const res = await fetch("/api/veto/register", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? (res.status === 413 ? "I file sono troppo grandi: riduci il numero di foto e riprova." : `Registrazione non riuscita (errore ${res.status}).`));
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setErr("Errore di rete");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-violet-light">● Volto protetto</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Il tuo volto e&apos; registrato in sola protezione. Dentro Semblic non puo&apos; essere generato:
            e&apos; una garanzia, applicata dai nostri sistemi. Se qualcuno prova a usarlo, te lo segnaliamo.
          </p>
          <p className="mt-3 text-[0.72rem] leading-relaxed text-faint">
            Fuori da Semblic offriamo allerta precoce e rimozione assistita: un impegno serio, non una garanzia che
            il tuo volto non compaia mai da nessuna parte. Testi in revisione legale.
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-violet-light hover:underline">← Torna all&apos;account</Link>
        </div>
      </section>
    );
  }

  if (hasPublicAvatar) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-foreground">Hai gia&apos; un volto nel registro</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Non puoi al tempo stesso concedere e proteggere lo stesso volto. Se vuoi passare alla sola protezione,
            scrivici dai contatti e ti aiutiamo.
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-violet-light hover:underline">← Torna all&apos;account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-14 sm:px-8">
      <span className="text-xs font-bold tracking-[0.14em] text-violet-light">PROTEZIONE DEL VOLTO</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Registra il tuo volto perche&apos; non venga generato</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Confermiamo che il volto e&apos; il tuo (come per un documento), poi lo mettiamo in <span className="text-foreground">sola protezione</span>:
        dentro Semblic nessuno potra&apos; generarlo, in nessuna categoria. Non creiamo nessun avatar, nessun repertorio:
        solo un&apos;impronta difensiva del tuo volto.
      </p>
      <p className="mt-2 rounded-xl border border-violet/20 bg-violet/[0.06] p-3 text-[0.74rem] leading-relaxed text-faint">
        Dentro Semblic la non generazione e&apos; una garanzia (controllo sui nostri sistemi). Fuori, offriamo allerta
        precoce e rimozione assistita: best effort, non la promessa che il volto non compaia mai altrove. Testi in revisione legale.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-7">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Documento d&apos;identita&apos; <span className="font-normal text-faint">· serve a confermare che il volto e&apos; tuo</span></p>
          <div className="grid grid-cols-2 gap-3">
            <PickBox label="Fronte" hint="il lato con la foto" slot={docFront} aspect="3/2" onPick={(f) => setDocFront(slotFrom(f))} />
            <PickBox label="Retro" hint="facoltativo" slot={docBack} aspect="3/2" onPick={(f) => setDocBack(slotFrom(f))} />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Selfie <span className="font-normal text-faint">· una foto del tuo viso, scattata ora</span></p>
          <div className="grid grid-cols-2 gap-3">
            <PickBox label="Selfie" hint="viso frontale, luce naturale" slot={selfie} aspect="3/4" onPick={(f) => setSelfie(slotFrom(f))} />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Foto del volto <span className="font-normal text-faint">· formano l&apos;impronta difensiva</span></p>
          <div className="grid grid-cols-4 gap-2.5">
            {POSES.map((p, slot) => (
              <label key={p.key} title={p.tip}
                className={`relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed p-1.5 transition-colors ${poseSlots[slot] ? "border-violet bg-violet/10" : "border-white/15 hover:border-violet/40"}`}>
                {poseSlots[slot] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poseSlots[slot]!.url} alt={p.label} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <PoseGlyph pose={p} />
                    <span className="text-center text-[0.58rem] font-semibold leading-tight text-muted">{p.label}</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const s = slotFrom(e.target.files?.[0]);
                    if (s) setPoseSlots((a) => { const n = [...a]; n[slot] = s; return n; });
                    e.currentTarget.value = "";
                  }} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">{photoCount > 0 ? `${photoCount} su ${POSES.length} pose caricate` : "Carica almeno una posa frontale (piu' ne carichi, piu' robusta e' la protezione)."}</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <input type="checkbox" checked={art9} onChange={(e) => setArt9(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500" />
          <span className="text-[0.78rem] leading-relaxed text-muted">
            Acconsento al trattamento del mio dato biometrico (impronta del volto) a <span className="text-foreground">soli fini di protezione</span>,
            per impedire la generazione del mio volto. Posso chiederne la cancellazione totale in qualsiasi momento. (Consenso GDPR Art.9, testo in revisione legale.)
          </span>
        </label>

        {err && <p className="text-sm text-crimson">{err}</p>}

        <button type="submit" disabled={busy}
          className="mt-1 rounded-xl bg-[linear-gradient(135deg,#F2A93B,#B8005C)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_40px_rgba(242,169,59,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
          {busy ? phase ?? "Registro…" : "Proteggi il mio volto"}
        </button>
      </form>
    </section>
  );
}

function PickBox({ label, hint, slot, aspect, onPick }: {
  label: string; hint: string; slot: Slot; aspect: "3/2" | "3/4"; onPick: (f: File | undefined) => void;
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed p-3 transition-colors ${slot ? "border-violet bg-violet/10" : "border-white/15 hover:border-violet/40"}`}
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
      {slot && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.62rem] font-bold text-violet-light">Cambia</span>}
      <input type="file" accept="image/*" className="hidden"
        onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </label>
  );
}

// Ridimensiona a maxDim px (lato lungo) e converte in JPEG. Se il browser non
// decodifica (es. HEIC), invia l'originale: meglio un tentativo che un blocco.
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
