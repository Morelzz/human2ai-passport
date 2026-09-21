# Audit sito SEMBLIC — 2026-06-25 (QA avversariale + stress robustezza)

Metodo: 5 reviewer paralleli read-only (auth/accessi, economia/volt, gate biometrici,
superfici pubbliche/input, data-minimization/storage) + probing di robustezza a basso
volume su prod (niente load/DoS). **Verdetto: posture forte.** Auth 0 bug exploitabili
(53 route con ownership/role server-side), economia VOLT atomica+idempotente, gate
fail-closed, nessun segreto nel bundle client, data-minimization (A2) rispettata.

Probe live prod (semblic.com): contact/report malformati -> 400; ward/scan GET -> 405;
verify token-junk -> 200 (pagina "non verificato", nessun leak); avatar/create & match
no-auth -> 401. Nessun 500 emerso.

## ✅ FIXATO (commit locale, non pushato)
- **[MED] scan/booking + contact senza rate-limit** (form pubblici; scan/booking conia
  pure una sessione Stripe per richiesta) -> aggiunto `allowRequest(...:ipFrom, 5, 600)`.
- **[LOW] isPublicAvatar default-OPEN** (`(status ?? "approved")`) -> default-DENY
  (`status === "approved"`) + test. Verificato a terra: tutte le 13 righe sono
  'approved', quindi NON nasconde nessun avatar esistente (founder inclusi).

## 🛠 PRONTO per "applica" (SQL, money LATENTE: nessun payout attivo oggi)
- **[MED] payout non-atomico read-then-zero** (`app/api/payout/route.ts:15-50`): legge
  `royalty_accrued_cents`, poi `update(0)` senza lock ne' compare-and-set. Due POST
  concorrenti -> doppio pagamento (quando `PAYOUT_PROVIDER=stripe`) o royalty perse.
  Oggi mascherato dal no-op fail-closed (provider non configurato). Fix = settle atomico:
  ```sql
  create or replace function settle_payout(p_avatar uuid, p_min_cents int)
  returns int language plpgsql security definer as $$
  declare v int;
  begin
    perform pg_advisory_xact_lock(hashtext('payout:'||p_avatar::text));
    select royalty_accrued_cents into v from avatars where id = p_avatar for update;
    if v is null or v < p_min_cents then return 0; end if;
    insert into payouts(avatar_id, amount_cents, ref)
      values (p_avatar, v, 'settle:'||p_avatar::text) on conflict (ref) do nothing;
    update avatars set royalty_accrued_cents = 0 where id = p_avatar;
    return v;
  end $$;
  revoke execute on function settle_payout(uuid,int) from public, anon, authenticated;
  ```
  (richiede una colonna/indice unico `payouts.ref` per l'idempotenza; la route chiama l'RPC.)
- **[LOW] accrual royalty read-modify-write** (`app/api/generate/route.ts:416`,
  `lib/echo-job.ts:329`): `update({ royalty_accrued_cents: (old ?? 0) + net })` perde
  update sotto worker concorrente. Fix = increment SQL (`= royalty_accrued_cents + $net`)
  o derivare da `sum(generations.royalty_cents)`. Cambio nel path generazione: lo lascio
  a un tuo ok ("ok royalty") perche' tocca l'hot-path e la money e' comunque latente.

## 📋 DA DECIDERE / cambi piu' grandi (riportati, non toccati)
- **[MED] preview salta lo scan VETO** (`app/api/generate/route.ts` ramo preview ~296):
  la preview genera un volto reale dalla reference SENZA passare lo scan contro l'indice
  protetti (che gira solo nel worker commerciale `echo-job.ts`). Bounded (identity-lock
  sull'avatar consenziente, watermark, URL pulito mai esposto) ma e' un'asimmetria su un
  prodotto di tutela. Fix = girare `scanGeneratedImageForProtected`+`outputScanVerdict`
  anche nel ramo preview (503 su unavailable, regenerate su match). Tradeoff: preview piu'
  lenta. Serve tuo ok sull'UX.
- **[MED] SSRF preview proxy** (`app/api/ward/preview/[matchId]/route.ts:44`,
  `lib/ward/preview-guard.ts`): `redirect:"follow"` NON ri-valida l'hop di redirect, e la
  guard e' solo lessicale (no DNS resolve -> DNS-rebinding verso 169.254/127/10.x). Richiede
  un avatar di proprieta' dell'attaccante con un URL malevolo matchato. Fix = `redirect:"manual"`
  con loop che ri-valida ogni Location + depth cap, e `dns.lookup(host,{all:true})` con blocco
  IP privati. NON un blanket-reject dei 3xx (i CDN immagini legittimi redirezionano).
- **[MED] altri form pubblici senza rate-limit**: `business/inquiry`, `partner/apply`,
  `consent/[token]` (quest'ultimo permette brute-force del token-segreto) -> stesso
  `allowRequest` di contact/scan-booking.
- **[LOW] webhook Didit senza dedup `event_id`** entro la finestra 300s (replay stretto;
  stati idempotenti, rischio solo ordering Approved/Declined). Fix = unique su event_id.
- **[LOW] AI endpoint autenticati senza throttle**: `avatar/analyze` (Claude Vision),
  `match` -> mirrorare `allowRequest` di enhance-prompt (costo).
- **[LOW] bucket storage creati lazy, non pinnati**: se `documents` venisse creato altrove
  con `public:true` diventerebbe leggibile. Fix = assert fail-closed in `ensureBucket`
  (se esiste e `public !== isPublic` -> throw/degrade).
- **[INFO] CSP Report-Only** (`proxy.ts:69`): la mitigazione XSS e' solo osservata, non
  applicata. **[INFO] account-erasure** (GDPR art.17) non e' in questo tree (branch a parte).

## Trigger
- **"pubblica"** -> push dei fix (registry default-deny + rate-limit) [+ tasto Esci gia' locale].
- **"applica royalty"** -> migrazione settle_payout + accrual atomico.
- **"ok preview-scan" / "ok ssrf"** -> i due MED di difesa-in-profondita'.
