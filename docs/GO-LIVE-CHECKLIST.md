# Go-live: pagamenti VOLT + notifiche push

Ultimo aggiornamento: 2026-08-03. File locale, NON committare (docs/ business).

## GIA' FATTO (Claude, 2026-08-03)

- ✅ Le 3 env VAPID sono su Vercel Production (via CLI, mai stampate) e il
  redeploy e' andato: **le notifiche push sono ATTIVE in produzione**
  (verificato: /api/push/key serve la chiave pubblica).

## RESTA A MORELZ (Stripe: le chiavi vivono solo nel TUO dashboard)

## 1. Env su Vercel (3 min)

Vercel > progetto human2ai-passport > Settings > Environment Variables.
Ambiente: Production.

| Nome | Valore |
|---|---|
| `STRIPE_SECRET_KEY` | dashboard Stripe > Developers > API keys > Secret key (per ora quella **test** `sk_test_...` dell'account sandbox) |
| `STRIPE_WEBHOOK_SECRET` | arriva dal passo 2 qui sotto (`whsec_...`) |

In piu', 30 secondi: Supabase > Authentication > Providers/Settings >
attiva **Leaked password protection** (unico WARN dell'advisor sicurezza).

## 2. Webhook Stripe (3 min)

Dashboard Stripe (modalita' TEST) > Developers > Webhooks > Add endpoint:

- URL endpoint: `https://semblic.com/api/stripe/webhook`
- Evento da ascoltare: `checkout.session.completed` (basta questo)
- Dopo la creazione copia il "Signing secret" (`whsec_...`) e mettilo su
  Vercel come `STRIPE_WEBHOOK_SECRET` (passo 1).

## 3. Redeploy (1 min, OBBLIGATORIO)

Le env valgono solo per i deploy NUOVI (gotcha gia' visto col KYC Didit):
Vercel > Deployments > ... sull'ultimo > Redeploy. Senza questo passo
checkout e push restano spenti anche con le env giuste.

## 4. Verifica (2 min)

- `https://semblic.com/account/volt`: i 4 pacchetti (SCINTILLA, IMPULSO,
  SCARICA, ALTA TENSIONE) devono aprire il checkout Stripe. Paga un
  pacchetto con la carta test `4242 4242 4242 4242`: al ritorno il saldo
  VOLT si aggiorna (accredito via webhook, non e' istantaneo al secondo).
- Sul telefono, sito installato come PWA: attiva le notifiche dal
  mini-tutorial e prova `POST /api/push/test` da loggato (o lancia uno
  scan Ward).

## Note

- NON serve creare il prodotto "ALTA TENSIONE" su Stripe: il checkout usa
  `price_data` inline, i prodotti a catalogo (SCINTILLA ecc.) sono solo
  cosmetici nel dashboard. Il 4o pacchetto funziona gia'.
- Prima di andare coi soldi veri (sandbox -> live): attivare l'account
  Stripe, impostare nome pubblico/descriptor = SEMBLIC (ora dice
  "Interaction Music"), prendere le chiavi LIVE, rifare webhook in
  modalita' live, sostituire le 2 env su Vercel e redeploy.
- Slot team founder: manca solo la FOTO di Riccardo (il nome e' gia' live);
  quando c'e', va in `components/marketing/TeamSection.tsx` campo `photo`.
