"use client";

import { useState } from "react";

// Pannello admin: accredito manuale VOLT a un utente (per email).
// È il ponte pre-Stripe: vendita via bonifico, accredito a mano.
export default function VoltGrantPanel() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function grant() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/volt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount: Number(amount), note }),
      });
      const json = await res.json();
      if (!res.ok) setMsg(`Errore: ${json.error ?? res.status}`);
      else {
        setMsg(`Accreditati ${json.accredited} ⚡ a ${json.email}. Saldo: ${json.balance} ⚡`);
        setEmail("");
        setAmount("");
        setNote("");
      }
    } catch {
      setMsg("Errore di rete, riprova.");
    }
    setBusy(false);
  }

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-violet/50 focus:outline-none";

  return (
    <div style={{ background: "#141A24", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
      <p style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 0.4rem" }}>ACCREDITO VOLT (OPERATORE)</p>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Accredita crediti a un utente (es. vendita via bonifico). Ogni movimento finisce nel ledger come accredito operatore.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={inputCls} type="email" placeholder="email utente" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="number" min={1} placeholder="VOLT (es. 500)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className={inputCls} type="text" placeholder="nota (es. bonifico #123)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button
        onClick={grant}
        disabled={busy || !email || !amount}
        className="mt-3 rounded-xl bg-[#F2A93B] px-4 py-2 text-sm font-bold text-[#0C0F17] transition-all hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Accredito…" : "Accredita ⚡"}
      </button>
      {msg && <p role="status" className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
