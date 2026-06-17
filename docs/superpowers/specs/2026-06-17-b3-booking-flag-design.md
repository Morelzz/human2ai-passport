# B3 — Booking "avatar → persona reale" (fase "ora")

Data: 17 giugno 2026
Modulo: EXPANSION_V3, Orizzonte B, B3 (fase "ora": raccontare + flag, non il flusso di richiesta).

## Contesto e obiettivo

EXPANSION_V3 B3 chiude il cerchio "da noi l'AI non sostituisce i modelli, gli procura lavoro":
un brand che usa l'avatar di un seller puo', tramite Human2AI, ingaggiare la persona vera per
uno shooting reale. La fase "ora" non costruisce il flusso di richiesta/mediazione/fee: aggiunge
solo il segnale (un flag opt-in del seller) e lo rende azionabile con un contatto.

Stato attuale verificato: il concetto e' gia' raccontato nel copy di `/partner` ("Ingaggi reali"),
ma il flag seller non esiste (colonna assente in `avatars`, confermato sul DB).

## Non-obiettivi (YAGNI)

Restano alla fase "dopo", fuori da questo modulo:
- flusso di richiesta ingaggio, mediazione, contrattualistica, fee da agenzia;
- notifiche al seller, dashboard ingaggi;
- attribuzione al Capture Partner della citta', revenue share;
- qualsiasi automazione di booking. La CTA porta solo al contatto esistente.

## Dato

Migrazione additiva su `avatars`:

```sql
alter table avatars
  add column available_for_booking boolean not null default false;
```

Su `avatars` e non `profiles`: il segnale e' per-volto e il passport pubblico e' per-avatar,
in simmetria con `is_public_figure` e `protection_only`. RLS gia' attiva sulla tabella, 0 righe
toccate, dormiente di default (opt-in).

## Controllo seller

Toggle nel `ConsentClient` (`app/account/consent`), la superficie "come puo' essere usato il
mio volto":
- switch "Disponibile per ingaggi reali" + riga di spiegazione: "Permetti ai brand di
  contattarti, tramite Human2AI, per uno shooting reale con la persona vera.";
- visibile solo per seller reali (avatar con `owner_id`); mai per i demo o per `protection_only`;
- salvataggio via nuovo endpoint `POST /api/avatar/booking` (gemello di `/api/avatar/wallet`):
  autentica il proprietario, setta `available_for_booking` sul SUO avatar (`.eq("owner_id", user.id)`),
  ritorna `{ ok: true, available_for_booking }`. Nessuna nuova logica di dominio, riuso del pattern.

Il loader `app/account/consent/page.tsx` aggiunge `available_for_booking` alla `select` e lo passa
a `ConsentClient` come stato iniziale del toggle.

## Passport pubblico

Il loader `app/passport/[handle]/page.tsx` fa gia' `select("*")`: la colonna arriva da sola.
Si passa un prop `availableForBooking` a `PassportClient`. Quando true (e l'avatar e' pubblico/reale):
- badge "Disponibile per ingaggi reali", tono teal "positivo", coerente coi badge esistenti;
- bottone "Richiedi un ingaggio" verso `/contatti?ingaggio=<handle>`.

`ContactForm` (`app/contatti/ContactForm.tsx`) legge il query param `ingaggio` e pre-compila
oggetto/messaggio col volto (es. "Richiesta di ingaggio reale per il volto @<handle>"), cosi' il
messaggio finisce in `contact_messages` gia' contestualizzato. Nessun nuovo flusso.

## Copy

Italiano, niente trattini lunghi. Badge: "Disponibile per ingaggi reali". CTA: "Richiedi un
ingaggio". Spiegazione toggle: "Permetti ai brand di contattarti, tramite Human2AI, per uno
shooting reale con la persona vera.". Prefill contatto: "Richiesta di ingaggio reale per il volto @<handle>".

## Verifica

- `npx tsc` pulito.
- E2E nel browser di anteprima: toggle ON dal seller -> il passport pubblico mostra badge + CTA
  -> il click apre `/contatti` pre-compilato col volto; toggle OFF -> badge e CTA spariscono.
- Migrazione applicata mostrando prima l'SQL e con ok esplicito di Morelz, poi verifica schema
  con `execute_sql`.

## File toccati

- nuova migrazione `supabase/booking_flag.sql` (l'`alter table` sopra);
- `app/api/avatar/booking/route.ts` (nuovo, gemello di `/api/avatar/wallet`);
- `app/account/consent/page.tsx` (aggiunge la colonna alla select + prop);
- `app/account/consent/ConsentClient.tsx` (toggle + chiamata API);
- `app/passport/[handle]/page.tsx` (prop `availableForBooking`);
- `app/passport/[handle]/PassportClient.tsx` (badge + CTA);
- `app/contatti/ContactForm.tsx` (prefill da `?ingaggio=`).

Un modulo, un commit di implementazione (oltre a questo commit di spec). Push solo a "pubblica".
