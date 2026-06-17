import { formatEur } from "@/lib/wallet";
import type { RevenueStats } from "@/lib/account-stats";

// Grafici royalty in SVG puro (zero librerie). Sobri, coerenti col design:
// void, hairline, viola unico colore d'azione. L'abbellimento fine arriva
// nella fase design, come da metodo.

function AreaChart({ daily }: { daily: RevenueStats["daily"] }) {
  const W = 480;
  const H = 120;
  const pad = 4;
  const max = Math.max(1, ...daily.map((d) => d.cents));
  const n = daily.length;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1);
  const y = (c: number) => H - pad - (c / max) * (H - pad * 2);
  const line = daily.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.cents).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`;
  const hasData = daily.some((d) => d.cents > 0);

  return (
    <div>
      <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Royalty · ultimi 30 giorni</p>
      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
          <defs>
            <linearGradient id="royFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2A93B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F2A93B" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#royFill)" />
          <path d={line} fill="none" stroke="#F2A93B" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-border text-xs text-faint">
          Ancora nessuna royalty in questo periodo
        </div>
      )}
    </div>
  );
}

function CategoryBars({ byCategory }: { byCategory: RevenueStats["byCategory"] }) {
  const top = byCategory.slice(0, 6);
  const max = Math.max(1, ...top.map((c) => c.cents));
  return (
    <div>
      <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Per categoria · 30 giorni</p>
      {top.length === 0 ? (
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-border text-xs text-faint">
          Nessun utilizzo in questo periodo
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((c) => (
            <li key={c.category}>
              <div className="mb-0.5 flex items-baseline justify-between text-xs">
                <span className="text-muted">
                  {c.category} <span className="text-faint">· {c.count}</span>
                </span>
                <span className="font-bold text-teal">{formatEur(c.cents)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
                <div className="h-full rounded-full bg-[#F2A93B]" style={{ width: `${Math.max(4, (c.cents / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RoyaltyCharts({ stats }: { stats: RevenueStats }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <AreaChart daily={stats.daily} />
      <CategoryBars byCategory={stats.byCategory} />
    </div>
  );
}
