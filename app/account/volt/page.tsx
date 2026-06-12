import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { VOLT_PACKS, voltBalance, voltTransactions, type VoltTransaction } from "@/lib/volt";
import { VOLT_STRINGS, voltStr } from "@/lib/strings/volt";

export const metadata = { title: "Ricarica VOLT" };

const FMT = new Intl.NumberFormat("it-IT");

// Etichetta di un movimento per lo storico (stesse stringhe del badge).
function txLabel(t: VoltTransaction): string {
  const n = FMT.format(Math.abs(t.delta_volt));
  switch (t.type) {
    case "generation":
      return voltStr("history.row.gen", { tier: t.ref?.split(":")[0] ?? "", n });
    case "recharge":
      return voltStr("history.row.recharge", { pacchetto: t.ref ?? "", n });
    case "bonus":
      return voltStr("history.row.bonus", { n });
    case "refund":
      return voltStr("history.row.refund", { n });
    default:
      return voltStr("history.row.admin_grant", { n });
  }
}

// Pagina ricarica + storico (VOLT_SYSTEM §3 e §4.9). FASE A: il pagamento
// online non è ancora attivo (arriva con Stripe): i pacchetti si vedono, la
// CTA spiega come farsi accreditare. Lo storico mostra gli ultimi movimenti.
export default async function VoltPage() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const balance = await voltBalance(user.id);
  const txs = balance === null ? [] : await voltTransactions(user.id, 30);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-violet-light">VOLT</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{VOLT_STRINGS["recharge.title"]}</h1>
            <p className="mt-3 leading-relaxed text-muted">{VOLT_STRINGS["recharge.subtitle"]}</p>
          </div>

          {balance === null ? (
            <div className="glass rounded-2xl p-6 text-sm leading-relaxed text-muted">
              Il sistema VOLT non è ancora attivo su questo ambiente.
            </div>
          ) : (
            <>
              {/* Saldo attuale */}
              <div className="glass rounded-2xl p-6">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Il tuo saldo</p>
                <p className="mt-1 text-4xl font-extrabold tabular-nums">
                  {FMT.format(balance)} <span aria-hidden className="text-2xl">⚡</span>
                </p>
              </div>

              {/* Pacchetti */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {VOLT_PACKS.map((p) => (
                  <div key={p.id} className={`glass glass-hover relative rounded-2xl p-5 ${p.popular ? "border border-violet/40" : ""}`}>
                    {p.popular && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-[#8b47f0] px-2.5 py-0.5 text-[0.62rem] font-bold text-white">
                        {VOLT_STRINGS["recharge.packs.popular"]}
                      </span>
                    )}
                    <p className="text-xs font-bold tracking-[0.12em] text-violet-light">{p.name}</p>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums">
                      {FMT.format(p.volt)} <span aria-hidden className="text-base">⚡</span>
                      {p.bonus > 0 && <span className="ml-1 text-sm font-bold text-teal">+{FMT.format(p.bonus)}</span>}
                    </p>
                    {p.note && <p className="mt-1 text-[0.7rem] text-faint">{p.note}</p>}
                    <button
                      disabled
                      title={VOLT_STRINGS["recharge.soon"]}
                      className="mt-4 w-full cursor-not-allowed rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-muted"
                    >
                      {voltStr("recharge.cta", { n: FMT.format(p.volt + p.bonus), prezzo: (p.priceCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 }) })}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{VOLT_STRINGS["recharge.soon"]}{" "}
                <a href="/contatti" className="text-violet-light hover:underline">Contattaci →</a>
              </p>
              <p className="mt-2 text-[0.68rem] text-faint">{VOLT_STRINGS["recharge.legal.microline"]}</p>

              {/* Storico */}
              <div className="mt-10">
                <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">{VOLT_STRINGS["history.title"]}</p>
                {txs.length === 0 ? (
                  <div className="glass rounded-2xl p-6 text-sm leading-relaxed text-muted">{VOLT_STRINGS["history.empty"]}</div>
                ) : (
                  <ul className="space-y-2">
                    {txs.map((t) => (
                      <li key={t.id} className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{txLabel(t)}</p>
                          <p className="mt-0.5 text-[0.68rem] text-faint">
                            {new Date(t.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })} · saldo {FMT.format(t.balance_after)} ⚡
                          </p>
                        </div>
                        <span className={`shrink-0 font-bold tabular-nums ${t.delta_volt < 0 ? "text-muted" : "text-teal"}`}>
                          {t.delta_volt < 0 ? "−" : "+"}{FMT.format(Math.abs(t.delta_volt))} ⚡
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
