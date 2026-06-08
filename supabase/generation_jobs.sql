-- Coda di generazione ASINCRONA (additiva, nessuna modifica distruttiva).
-- Serve a ECHO/gpt-image-2: le generazioni 2K/4K durano minuti, oltre il limite
-- delle funzioni Vercel. Il sito (su Vercel) si limita a METTERE IN CODA un job
-- e a leggerne lo stato; un WORKER esterno (la stessa app Next su un host senza
-- cap di durata) esegue la chiamata lunga a OpenAI e riscrive l'esito qui.
--
-- Flusso stato: pending → running → done | error.

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  engine text not null default 'echo',
  buyer_id uuid not null references auth.users(id) on delete cascade,
  avatar_id uuid not null,
  handle text not null,
  -- Parametri del job (scene, category, echoSize, echoQuality, extra refs, prezzo bloccato).
  params jsonb not null,
  -- Esito (popolato dal worker a fine generazione).
  certificate text,
  image_url text,
  gross_cents integer,
  fee_cents integer,
  royalty_cents integer,
  surcharge_cents integer,
  engine_cost_cents integer,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Il worker pesca i pending in ordine d'arrivo.
create index if not exists generation_jobs_pending_idx
  on generation_jobs (created_at) where status = 'pending';
-- Il client interroga i propri job.
create index if not exists generation_jobs_buyer_idx on generation_jobs (buyer_id);

-- RLS: l'accesso applicativo passa dal service role (che bypassa RLS). Abilitiamo
-- comunque RLS e permettiamo al buyer di leggere SOLO i propri job (difesa in
-- profondità, nel caso si legga mai lato client).
alter table generation_jobs enable row level security;

do $$ begin
  create policy generation_jobs_select_own on generation_jobs
    for select using (auth.uid() = buyer_id);
exception when duplicate_object then null; end $$;
