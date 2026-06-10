-- Review D3 — "Avvisami quando entra un volto compatibile".
-- Ogni richiesta senza match che il buyer sceglie di salvare diventa DOMANDA
-- REALE: attributi cercati + categoria (mai dati di terzi). Doppio uso:
-- (1) alert al buyer quando entra un volto compatibile (flusso futuro),
-- (2) intelligence di reclutamento accanto alla heatmap dei blocchi (F4)
--     e benzina per E3 "il tuo volto è stato cercato".
create table if not exists match_alerts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  attrs jsonb,
  category text,
  status text not null default 'open' check (status in ('open', 'notified', 'closed')),
  created_at timestamptz not null default now()
);

-- Accesso SOLO server-side (service role): nessuna policy pubblica.
alter table match_alerts enable row level security;
