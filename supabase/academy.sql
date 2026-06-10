-- G — HUMAN2AI Academy: modello dati (build per gradi, modello dal giorno uno).
-- Tre prodotti con tre funzioni (brief BRIEF_LEGALE_ACADEMY_SCANSIONE):
--   base     · tutti          · gratuito (iscritti)      · onboarding e fiducia
--   medio    · buyer/creator  · abbonamento              · valore ricorrente
--   avanzato · professionisti · a pagamento, certificante · porta della rete:
--              il superamento dell'esame del corso avanzato E' il requisito
--              della certificazione Capture Partner (/partner).
-- Si parte semplice (video esterni linkati + testo): il modello regge i 3 livelli.

create table if not exists corsi (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titolo text not null,
  descrizione text,
  livello text not null check (livello in ('base', 'medio', 'avanzato')),
  pubblico text not null,
  requisito_accesso text not null default 'free' check (requisito_accesso in ('free', 'abbonamento', 'pagamento')),
  certificante boolean not null default false,
  pubblicato boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists lezioni (
  id uuid primary key default gen_random_uuid(),
  corso_id uuid not null references corsi(id) on delete cascade,
  ordine integer not null,
  titolo text not null,
  tipo text not null check (tipo in ('video', 'testo', 'quiz')),
  -- contenuto per tipo: video {url, durata}, testo {markdown}, quiz {domande:[{q, opzioni, corretta}]}
  contenuto jsonb,
  created_at timestamptz not null default now(),
  unique (corso_id, ordine)
);

create table if not exists progressi (
  utente uuid not null references auth.users(id) on delete cascade,
  lezione uuid not null references lezioni(id) on delete cascade,
  stato text not null default 'in_corso' check (stato in ('in_corso', 'completata')),
  updated_at timestamptz not null default now(),
  primary key (utente, lezione)
);

create table if not exists certificazioni (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,
  corso_id uuid not null references corsi(id),
  esito text not null check (esito in ('superato', 'non_superato')),
  data timestamptz not null default now()
);

-- I tre corsi fondativi (NON pubblicati: il modello c'e', i contenuti arrivano).
insert into corsi (slug, titolo, descrizione, livello, pubblico, requisito_accesso, certificante) values
  ('benvenuti-in-human2ai', 'Benvenuti in HUMAN2AI', 'Cos''e'' il registro, come funziona il consenso, i tier, i tuoi diritti d''immagine spiegati semplici.', 'base', 'tutti', 'free', false),
  ('creare-con-i-volti-veri', 'Creare con i volti veri', 'Prompt efficaci, uso avanzato della piattaforma, workflow creativi con gli LLM.', 'medio', 'buyer e creator', 'abbonamento', false),
  ('protocollo-h2ai-scan', 'Il protocollo H2AI-SCAN', 'Il percorso Capture Partner: esecuzione, consenso on-site, postproduzione, esame finale. Chi lo supera entra nella rete.', 'avanzato', 'professionisti', 'pagamento', true)
on conflict (slug) do nothing;

-- Accesso SOLO server-side (service role): nessuna policy pubblica.
alter table corsi enable row level security;
alter table lezioni enable row level security;
alter table progressi enable row level security;
alter table certificazioni enable row level security;
