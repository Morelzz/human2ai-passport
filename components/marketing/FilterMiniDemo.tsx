"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/types";

// Review C2 — mini-demo del filtro in HOME: versione compatta del widget di
// /sviluppatori. Riusa /api/filter (sola lettura, nessun effetto collaterale).
// Il visitatore sceglie una persona REALE del registro + una categoria d'uso
// e vede la risposta live ALLOW/BLOCK con la prova. Le persone revocate sono
// incluse apposta: vedere il BLOCK è la tesi del prodotto.

export type FilterDemoAvatar = { handle: string; alias: string; revoked: boolean };

type FilterResponse = {
  decision?: "ALLOW" | "BLOCK";
  reason?: string;
  consent?: { status?: string };
  proof?: { passport_url?: string; verify_url?: string } | null;
  error?: string;
};

export function FilterMiniDemo({ avatars }: { avatars: FilterDemoAvatar[] }) {
  const [subject, setSubject] = useState(avatars[0]?.handle ?? "");
  const [use, setUse] = useState<string>("Food");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<FilterResponse | null>(null);

  async function ask() {
    setLoading(true);
    setRes(null);
    try {
      const q = new URLSearchParams({ subject, use });
      const r = await fetch(`/api/filter?${q.toString()}`);
      const data = (await r.json()) as FilterResponse;
      setRes(data);
      // Micro-aptica (dove supportata, es. Android): il consenso si SENTE —
      // tocco breve per ALLOW, doppio colpo per BLOCK. Best-effort, mai errori.
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(data.decision === "ALLOW" ? 18 : [45, 60, 45]);
        }
      } catch { /* niente aptica: pazienza */ }
    } catch {
      setRes({ error: "Errore di rete — riprova." });
    }
    setLoading(false);
  }

  const allow = res?.decision === "ALLOW";

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="text-center">
        <span className="label-mono text-crimson-light">Il filtro al lavoro</span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Provalo adesso. <span className="text-gradient">Decide il consenso.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
          Scegli una persona del registro e una categoria d&apos;uso: il filtro risponde in tempo
          reale, con la prova. Se la persona non ha detto sì, la risposta è no.
        </p>
      </div>

      <div className="glass mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="fmd-subject" className="mb-1 block text-xs text-muted">Persona</label>
            <select
              id="fmd-subject"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setRes(null); }}
              className="w-full rounded-xl border border-white/10 bg-obsidian px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/50"
            >
              {avatars.map((a) => (
                <option key={a.handle} value={a.handle}>
                  {a.alias}{a.revoked ? " · consenso revocato" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fmd-use" className="mb-1 block text-xs text-muted">Categoria d&apos;uso</label>
            <select
              id="fmd-use"
              value={use}
              onChange={(e) => { setUse(e.target.value); setRes(null); }}
              className="w-full rounded-xl border border-white/10 bg-obsidian px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={ask} disabled={loading || !subject} size="md" className="w-full sm:w-auto">
              {loading ? "…" : "Chiedi al filtro"}
            </Button>
          </div>
        </div>

        {res && !res.error && res.decision && (
          <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: allow ? "rgba(0,168,150,0.35)" : "rgba(184,0,92,0.35)", background: allow ? "rgba(0,168,150,0.07)" : "rgba(184,0,92,0.07)" }}>
            <div className="flex items-center gap-2.5">
              {allow
                ? <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: "#00d4be" }} />
                : <ShieldX className="h-5 w-5 shrink-0" style={{ color: "#e0006f" }} />}
              <span className="text-base font-extrabold" style={{ color: allow ? "#00d4be" : "#e0006f" }}>
                {res.decision} — {allow ? "generazione autorizzata" : "generazione non autorizzata"}
              </span>
            </div>
            {res.reason && <p className="mt-2 text-sm leading-relaxed text-muted">{res.reason}</p>}
            {allow && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Questa persona ha acconsentito a questa categoria: la generazione uscirebbe con
                certificato e filigrana, e lei verrebbe pagata.
              </p>
            )}
            {res.proof?.passport_url && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                <a href={res.proof.passport_url} className="text-sm font-semibold text-teal hover:underline">La prova: il passaporto →</a>
                {res.proof.verify_url && (
                  <a href={res.proof.verify_url} className="text-sm font-semibold text-teal hover:underline">Verifica il token →</a>
                )}
              </div>
            )}
          </div>
        )}
        {res?.error && <p className="mt-4 text-sm text-crimson-light">{res.error}</p>}
      </div>

      <p className="mt-6 text-center">
        <Link href="/sviluppatori" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-violet-light transition-colors hover:text-foreground">
          Il filtro è anche un&apos;API: integralo nel tuo sistema
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </p>
    </section>
  );
}
