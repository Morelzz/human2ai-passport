"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/types";

// Demo live dell'API filtro: interroga /api/filter e mostra il verdetto + il JSON.
// Sola lettura, nessun effetto collaterale.

type FilterResponse = {
  decision?: "ALLOW" | "BLOCK";
  allowed?: boolean;
  reason?: string;
  consent?: { status?: string };
  categories_allowed?: string[] | null;
  proof?: { passport_url?: string; verify_url?: string } | null;
  error?: string;
};

export default function FilterDemo() {
  const [subject, setSubject] = useState("random");
  const [use, setUse] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<FilterResponse | null>(null);

  async function ask() {
    setLoading(true);
    setRes(null);
    try {
      const q = new URLSearchParams({ subject: subject.trim() });
      if (use) q.set("use", use);
      const r = await fetch(`/api/filter?${q.toString()}`);
      setRes(await r.json());
    } catch {
      setRes({ error: "Errore di rete" });
    }
    setLoading(false);
  }

  const allow = res?.decision === "ALLOW";
  const block = res?.decision === "BLOCK";

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Provalo dal vivo</p>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="subj" className="mb-1 block text-xs text-muted">subject (handle)</label>
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-obsidian px-3 focus-within:border-teal/50">
            <span className="text-muted">@</span>
            <input
              id="subj"
              value={subject}
              onChange={(e) => setSubject(e.target.value.trim().toLowerCase().replace(/^@+/, ""))}
              spellCheck={false}
              className="w-full bg-transparent py-2.5 font-mono text-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div>
          <label htmlFor="use" className="mb-1 block text-xs text-muted">use (categoria)</label>
          <select
            id="use"
            value={use}
            onChange={(e) => setUse(e.target.value)}
            className="w-full rounded-xl border border-border bg-obsidian px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal/50"
          >
            <option value="">(qualsiasi)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={ask}
            disabled={loading || !subject.trim()}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity sm:w-auto ${
              subject.trim() ? "bg-gradient-to-r from-violet to-crimson text-white hover:opacity-90" : "cursor-not-allowed bg-white/5 text-faint"
            }`}
          >
            {loading ? "…" : "Interroga il filtro"}
          </button>
        </div>
      </div>

      {res && !res.error && (
        <div className="mt-5">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold"
            style={{
              background: allow ? "rgba(127,174,150,0.14)" : "rgba(238,122,112,0.14)",
              color: allow ? "var(--verified-c)" : "var(--blocked-c)",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: allow ? "var(--verified-c)" : "var(--blocked-c)" }} />
            {res.decision}
            {block && ": generazione non autorizzata"}
            {allow && ": generazione autorizzata"}
          </div>
          {res.reason && <p className="mt-2 text-sm text-muted">{res.reason}</p>}

          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-obsidian p-3.5 text-xs leading-relaxed text-muted">
            <code>{JSON.stringify(res, null, 2)}</code>
          </pre>
        </div>
      )}

      {res?.error && <p className="mt-4 text-sm text-crimson-light">{res.error}</p>}
    </div>
  );
}
