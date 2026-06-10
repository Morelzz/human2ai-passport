-- F2 — messaggi dalla pagina /contatti (form pubblico).
-- Solo i dati che servono a rispondere; nessun obbligo di account.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

-- Accesso SOLO server-side (service role): nessuna policy pubblica.
alter table contact_messages enable row level security;
