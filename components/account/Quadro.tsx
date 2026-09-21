// IL QUADRO: i quattro numeri in testa all'account (22/9/2026). Sono dati che
// avevamo gia', sparsi in tre riquadri diversi piu' in basso; uno, gli utilizzi
// del proprio volto, non si vedeva proprio. Sul telefono scorrono di lato.
// Componente di sola presentazione, niente stato: sta sul server.

export interface Numero {
  v: string; // il numero gia' scritto come va letto
  unita?: string; // "EUR", "⚡"
  e: string; // cosa vuol dire
  acceso?: boolean; // quello importante (i VOLT)
}

export function Quadro({ numeri }: { numeri: Numero[] }) {
  if (!numeri.length) return null;
  return (
    <div className="senza-barra -mx-5 mt-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
      {numeri.map((n) => (
        <div
          key={n.e}
          className={`w-[9.5rem] shrink-0 rounded-2xl border p-4 sm:w-auto ${
            n.acceso
              ? "border-amber/35 bg-[radial-gradient(60%_50%_at_98%_-15%,var(--amber-soft),transparent_62%)] bg-surface"
              : "border-border bg-surface"
          }`}
        >
          <div className={`flex items-baseline gap-1.5 text-[1.7rem] font-bold leading-none tracking-[-0.04em] ${n.acceso ? "text-amber-ink" : ""}`}>
            {n.v}
            {n.unita && <span className="text-[0.82rem] font-semibold tracking-normal text-faint">{n.unita}</span>}
          </div>
          <p className="mt-1.5 text-[0.75rem] leading-snug text-faint">{n.e}</p>
        </div>
      ))}
    </div>
  );
}
