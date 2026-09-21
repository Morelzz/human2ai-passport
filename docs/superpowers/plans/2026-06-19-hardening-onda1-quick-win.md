# Onda 1 Hardening (quick win) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alzare subito il livello di sicurezza di SEMBLIC con misure a basso rischio e costo quasi zero (header/CSP, rate-limit, igiene segreti, scanner dipendenze, monitoraggio, hardening storage e auth), senza toccare l'architettura dati (quella e' Onda 2).

**Architettura:** Header statici in `next.config.ts`; CSP con nonce per-richiesta nel proxy (`proxy.ts`, il middleware di Next 16); rate-limit applicativo Postgres-backed nelle rotte calde Node; scanner dipendenze via GitHub; monitoraggio errori con PII scrubbing; hardening lato dashboard Supabase (azioni di Morelz). Tutto verificato a terra.

**Tech Stack:** Next.js 16.2.7 (App Router) + TypeScript, React 19, Supabase (Postgres + Auth + Storage), Vercel, npm.

---

## Vincoli e premesse operative (leggere prima)

- **Push/deploy SOLO su "pubblica" di Morelz.** Tutti i commit di questo piano sono **locali**; il deploy su semblic.com avviene solo quando Morelz dice "pubblica".
- **Migrazioni DB applicate da Claude** con `apply_migration`, mostrando l'SQL **prima** e verificando lo schema **dopo** con `execute_sql`/`get_advisors`. Il DB e' **condiviso = PROD vivo**: massima cautela, ogni migrazione e' additiva.
- **Verifica a terra (toolchain reale del repo, non c'e' un framework di unit test):**
  - `npx tsc --noEmit` (zero errori)
  - `npm run build` (build di produzione verde)
  - runtime: `curl -I` per gli header, hit ripetuti per il `429`, console del browser per la CSP
  - DB: `get_advisors` (security) senza WARN sulle voci che chiudiamo; `execute_sql` per le verifiche.
- **Testi e commit in italiano, MAI trattini lunghi**, trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Identificatori a terra:** Supabase project ref `ktjebfavzherochwhtis` (URL `https://ktjebfavzherochwhtis.supabase.co`); CDN blog `d8j0ntlcm91z4.cloudfront.net`; dominio `semblic.com`.

### Azioni che spettano a Morelz (dashboard, le elenco nel Task 8, non le posso fare io)
- Supabase Auth: attivare leaked-password protection, alzare la policy password, attivare CAPTCHA.
- Supabase: rigenerare la `SUPABASE_SERVICE_ROLE_KEY` e aggiornare le env su Vercel e sul worker.
- (Opzionale) creare il progetto Sentry e fornire la DSN; impostare le regole di Vercel Firewall.

### File toccati (mappa)
- Modify: `next.config.ts` (header statici; eventuale wrap Sentry)
- Modify: `proxy.ts` (nonce + CSP Report-Only, poi enforce)
- Create: `lib/security-headers.ts` (sorgente unica degli header statici, riusabile e testabile)
- Create: `app/api/csp-report/route.ts` (raccolta violazioni CSP, scrubbed)
- Modify: `lib/storage.ts` (commento + guardia anti-pubblico-per-errore)
- Create: `lib/rate-limit.ts` (helper che chiama l'RPC)
- Migration (DB): tabella `rate_limit_hits` + funzione `check_rate_limit(...)`
- Modify rotte calde: `app/api/enhance-prompt/route.ts`, `app/api/generate/route.ts`, `app/api/kyc/submit/route.ts`, `app/api/avatar/create/route.ts`, `app/api/veto/register/route.ts`
- Create: `.github/dependabot.yml`, `.github/workflows/security.yml`
- Create (Sentry): `instrumentation.ts`, `instrumentation-client.ts`, `lib/sentry-scrub.ts`
- Modify: `app/signup/page.tsx`, `app/login/page.tsx`, `app/auth-ui.tsx` (validazione password lato UX)

---

## Task 1: Header di sicurezza statici

Header che non dipendono dalla richiesta, applicati a tutte le rotte tramite `next.config.ts`. Esclude la CSP (Task 2, dinamica con nonce).

**Files:**
- Create: `lib/security-headers.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Creare la sorgente unica degli header**

`lib/security-headers.ts`:

```ts
// Header di sicurezza statici (validi per ogni risposta). La CSP NON e' qui:
// e' dinamica (nonce per-richiesta) e vive nel proxy. Sorgente unica cosi'
// next.config e gli eventuali test leggono lo stesso elenco.
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // Forza HTTPS per 2 anni, sottodomini inclusi (semblic.com).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Niente sniffing del content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti clickjacking di base (la CSP frame-ancestors e' la difesa moderna).
  { key: "X-Frame-Options", value: "DENY" },
  // Non perdere il referrer verso terze parti.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Spegne API potenti del browser; la fotocamera resta SOLO same-origin (scansione volto).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
```

- [ ] **Step 2: Applicarli in `next.config.ts`**

Sostituire il contenuto di `next.config.ts` con (mantiene `images.remotePatterns` esistente):

```ts
import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: STATIC_SECURITY_HEADERS }];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verifica build**

Run: `npx tsc --noEmit && npm run build`
Expected: nessun errore, build verde.

- [ ] **Step 4: Verifica runtime locale**

Run: `npm run dev` (in background) poi `curl -I http://localhost:3000/`
Expected: nelle intestazioni compaiono `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.

- [ ] **Step 5: Verifica che la scansione volto funzioni ancora**

Aprire `/scansione` (o la pagina che usa la fotocamera) in locale: la fotocamera deve poter partire (Permissions-Policy `camera=(self)` lo consente same-origin). Se non parte, controllare che la pagina sia same-origin.

- [ ] **Step 6: Commit**

```bash
git add lib/security-headers.ts next.config.ts
git commit -m "Sicurezza Onda 1: header statici (HSTS, nosniff, frame DENY, referrer, permissions-policy)

Permissions-Policy lascia la fotocamera solo same-origin (scansione volto), spegne microfono/geo.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: CSP con nonce nel proxy (prima Report-Only, poi enforce)

La CSP e' l'header piu' delicato: una policy troppo stretta rompe la pagina. Si parte in **Report-Only** (non blocca, riporta), si osservano le violazioni, poi si passa a **enforce**.

**Files:**
- Modify: `proxy.ts`
- Create: `app/api/csp-report/route.ts`

- [ ] **Step 1: Aggiungere nonce + CSP Report-Only nel proxy**

In `proxy.ts`, generare un nonce per richiesta, passarlo all'app via header `x-nonce`, e impostare la CSP in Report-Only sulla `response`. Inserire DOPO la creazione del client supabase e PRIMA del `return response`. Codice completo del nuovo `proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_ORIGIN = "https://ktjebfavzherochwhtis.supabase.co";
const BLOG_CDN = "https://d8j0ntlcm91z4.cloudfront.net";

function buildCsp(nonce: string): string {
  // script-src con nonce + strict-dynamic (Next inietta gli script col nonce).
  // style-src 'unsafe-inline': librerie (framer-motion, stili inline) usano
  // attributi style; il nonce non copre gli attributi, quindi e' un compromesso
  // accettabile lato stile (lo script resta blindato col nonce).
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${BLOG_CDN}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${SUPABASE_ORIGIN}`,
    `media-src 'self' ${SUPABASE_ORIGIN}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `report-uri /api/csp-report`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  // Nonce per-richiesta, passato all'app via header di richiesta.
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Necessario: forza il refresh della sessione.
  await supabase.auth.getUser();

  // CSP in Report-Only: non blocca, raccoglie le violazioni su /api/csp-report.
  // Quando i report sono puliti, rinominare l'header in "Content-Security-Policy".
  response.headers.set("Content-Security-Policy-Report-Only", buildCsp(nonce));
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 2: Creare l'endpoint di raccolta violazioni (scrubbed)**

`app/api/csp-report/route.ts`:

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Riceve i report di violazione CSP (Report-Only). Logga solo i campi utili,
// MAI dati sensibili. Serve a capire cosa rompe prima di passare a enforce.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const r = body?.["csp-report"] ?? body ?? {};
    console.warn("[csp]", JSON.stringify({
      violated: r["violated-directive"] ?? r.violatedDirective,
      blocked: r["blocked-uri"] ?? r.blockedURI,
      doc: r["document-uri"] ?? r.documentURI,
    }));
  } catch {
    // best-effort: una violazione non deve mai rompere nulla
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verifica build + tipi**

Run: `npx tsc --noEmit && npm run build`
Expected: verde. (`crypto.randomUUID` e `btoa` sono globali nel runtime middleware di Next 16.)

- [ ] **Step 4: Verifica runtime locale**

Run: `npm run dev` poi `curl -I http://localhost:3000/`
Expected: header `Content-Security-Policy-Report-Only` presente con il nonce; header `x-nonce` presente. Aprire la home nel browser: deve renderizzare normalmente; in console annotare eventuali violazioni Report-Only.

- [ ] **Step 5: Commit (Report-Only)**

```bash
git add proxy.ts app/api/csp-report/route.ts
git commit -m "Sicurezza Onda 1: CSP con nonce in Report-Only + endpoint di report

Parte in Report-Only per non rompere nulla: raccoglie le violazioni su /api/csp-report, poi si passa a enforce.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: (DOPO osservazione, sotto pubblica) passaggio a enforce**

Quando i report sono puliti (in locale e, dopo un "pubblica", anche in produzione per qualche giorno): in `proxy.ts` rinominare l'header da `Content-Security-Policy-Report-Only` a `Content-Security-Policy`. Ripetere build + verifica runtime. Commit separato:

```bash
git add proxy.ts
git commit -m "Sicurezza Onda 1: CSP in enforce dopo report puliti

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NB executor: questo step si chiude solo dopo aver visto report puliti. Se restano violazioni legittime (es. un dominio esterno necessario), aggiungerlo alla direttiva giusta in `buildCsp` prima di enforce.

---

## Task 3: Hardening storage (verifica a terra + guardia)

Verita' a terra: `lib/storage.ts` ha gia' due funzioni esplicite (`uploadPublicImage` pubblico, `uploadPrivate` privato), quindi non e' "pubblico per default". I rischi reali: (a) qualcuno chiama `uploadPublicImage` per qualcosa di sensibile; (b) i path del bucket pubblico `generations` sono indovinabili.

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: Censire i chiamanti di `uploadPublicImage`**

Run: `grep -rn "uploadPublicImage" human2ai-passport/app human2ai-passport/lib human2ai-passport/worker`
Expected: elenco dei chiamanti. Verificare a mano che riguardino SOLO output non sensibili (immagini generate gia' destinate a essere pubbliche/condivisibili), mai volti sorgente, documenti o selfie. Annotare l'esito in PR.

- [ ] **Step 2: Verificare l'entropia dei path del bucket `generations`**

Per ogni chiamante trovato, ispezionare il `path` passato. Deve contenere un identificatore ad **alta entropia** (es. certificate hash SHA-256, UUID), non un contatore sequenziale o un handle prevedibile. Confronto a terra:

Run (Supabase execute_sql):
```sql
SELECT name FROM storage.objects WHERE bucket_id = 'generations' ORDER BY created_at DESC LIMIT 20;
```
Expected: i nomi contengono segmenti non indovinabili (hash/uuid). Se fossero prevedibili, e' un finding: in tal caso valutare di rendere `generations` privato con signed URL (rimandato a Onda 2, ma segnalare subito).

- [ ] **Step 3: Aggiungere una guardia esplicita contro il pubblico per errore**

In `lib/storage.ts`, dentro `ensureBucket`, rendere esplicito e auditabile quando si crea un bucket pubblico. Sostituire il corpo di `ensureBucket` con:

```ts
async function ensureBucket(name: string, isPublic: boolean): Promise<void> {
  const admin = createServerClient();
  const { data } = await admin.storage.getBucket(name);
  if (data) return;
  if (isPublic) {
    // Creare un bucket PUBBLICO e' una scelta consapevole: lasciane traccia.
    // I dati sensibili (volti sorgente, documenti, selfie) NON vanno mai qui.
    console.warn(`[storage] creo bucket PUBBLICO '${name}' (solo output non sensibili)`);
  }
  const { error } = await admin.storage.createBucket(name, { public: isPublic });
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`Storage: impossibile creare il bucket '${name}': ${error.message}`);
  }
}
```

- [ ] **Step 4: Verifica**

Run: `npx tsc --noEmit && npm run build`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts
git commit -m "Sicurezza Onda 1: guardia e traccia sui bucket pubblici dello storage

I bucket pubblici si creano solo consapevolmente; i dati sensibili restano nei bucket privati. Verificati a terra i chiamanti di uploadPublicImage e l'entropia dei path di generations.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rate-limit applicativo (Postgres-backed) sulle rotte calde

Limiter in casa (nessun nuovo vendor): tabella + funzione atomica in Postgres, helper TS, applicato alle rotte Node calde. Login/signup vanno a Supabase Auth (non a rotte nostre): per quelli ci sono CAPTCHA + Supabase rate-limit + Vercel Firewall (Task 8).

**Files:**
- Migration (DB, applicata da Claude)
- Create: `lib/rate-limit.ts`
- Modify: `app/api/enhance-prompt/route.ts` (+ altre rotte elencate)

- [ ] **Step 1: Mostrare ad Morelz l'SQL della migrazione, poi applicarla**

SQL (additiva; la tabella e' service-role only: RLS ON, nessuna policy):

```sql
-- Conteggio colpi per chiave/finestra temporale, per il rate-limit applicativo.
create table if not exists public.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket_key, window_start)
);
alter table public.rate_limit_hits enable row level security;
-- Nessuna policy: accessibile solo via service-role (le rotte server). Deny by default.

-- Funzione atomica: registra un colpo e dice se la chiave e' sotto soglia.
-- p_window_seconds = ampiezza finestra; p_max = colpi massimi nella finestra.
create or replace function public.check_rate_limit(
  p_key text, p_max int, p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limit_hits (bucket_key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start)
  do update set hits = public.rate_limit_hits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- Igiene: rimuove le finestre vecchie (chiamata best-effort dal codice).
create or replace function public.prune_rate_limit() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';
$$;
```

Applicare con `apply_migration` (nome: `rate_limit_infra`). Poi verificare:
```sql
SELECT public.check_rate_limit('test', 2, 60); -- true
SELECT public.check_rate_limit('test', 2, 60); -- true
SELECT public.check_rate_limit('test', 2, 60); -- false (3 colpi, max 2)
```
Expected: true, true, false. Poi `get_advisors(security)`: la nuova tabella deve risultare `rls_enabled_no_policy` (sana, come le altre service-only).

- [ ] **Step 2: Creare l'helper TS**

`lib/rate-limit.ts`:

```ts
import { createServerClient } from "@/lib/supabase";

// Ritorna true se la richiesta e' AMMESSA, false se ha superato la soglia.
// Non lancia mai: in caso di errore DB "fail open" sul rate-limit (non blocca
// gli utenti veri per un problema infrastrutturale), ma logga.
export async function allowRequest(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const admin = createServerClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit] errore RPC, fail-open:", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.warn("[rate-limit] eccezione, fail-open:", (e as Error).message);
    return true;
  }
}

// Chiave per IP (rotte non autenticate) o per utente (rotte autenticate).
export function ipFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || "ip-sconosciuto";
}
```

- [ ] **Step 3: Applicare il limiter a `enhance-prompt` (rotta autenticata, chiave = utente)**

In `app/api/enhance-prompt/route.ts`, subito DOPO il check utente (riga ~39, dopo `if (!user) return ...`), aggiungere l'import in cima e il controllo:

Import (in cima al file, dopo gli altri import):
```ts
import { allowRequest } from "@/lib/rate-limit";
```

Dopo aver ottenuto `user` (e prima del check `ANTHROPIC_API_KEY`):
```ts
  // Rate-limit: max 20 migliorie al minuto per utente (chiama Claude, ha un costo).
  if (!(await allowRequest(`enhance:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }
```

- [ ] **Step 4: Applicare lo stesso pattern alle altre rotte calde**

Per ciascuna, aggiungere `import { allowRequest, ipFrom } from "@/lib/rate-limit";` e, subito dopo il check di autenticazione (o a inizio handler se la rotta e' pubblica), inserire il controllo con la chiave e le soglie indicate. Restituire `429` con messaggio italiano se non ammesso.

- [ ] `app/api/generate/route.ts` (autenticata): `allowRequest(\`generate:${user.id}\`, 10, 60)` (la generazione costa crediti).
- [ ] `app/api/kyc/submit/route.ts` (autenticata): `allowRequest(\`kyc:${user.id}\`, 5, 3600)` (upload documenti, raro).
- [ ] `app/api/avatar/create/route.ts` (autenticata): `allowRequest(\`avatar-create:${user.id}\`, 10, 3600)`.
- [ ] `app/api/veto/register/route.ts` (puo' essere pubblica): `allowRequest(\`veto:${ipFrom(request)}\`, 10, 3600)`.

> NB executor: leggere ogni file prima di editare; usare il nome reale della variabile utente in quel file e il nome reale del parametro request. Se una rotta non ha un `user`, usare `ipFrom(request)`. Mantenere lo stile delle risposte di errore gia' presente nel file.

- [ ] **Step 5: Verifica build**

Run: `npx tsc --noEmit && npm run build`
Expected: verde.

- [ ] **Step 6: Verifica runtime del 429**

Con dev server attivo e un utente loggato, colpire `enhance-prompt` oltre soglia (es. 21 volte in un minuto) e verificare che dalla 21esima risponda `429`. In assenza di sessione la rotta risponde gia' 401 (atteso).

- [ ] **Step 7: Commit**

```bash
git add lib/rate-limit.ts app/api/enhance-prompt/route.ts app/api/generate/route.ts app/api/kyc/submit/route.ts app/api/avatar/create/route.ts app/api/veto/register/route.ts
git commit -m "Sicurezza Onda 1: rate-limit applicativo Postgres sulle rotte calde

Limiter atomico in Postgres (tabella service-only + funzione check_rate_limit), helper fail-open, soglie per utente/IP su enhance-prompt, generate, kyc, avatar-create, veto. Migrazione rate_limit_infra applicata e verificata.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Scanner dipendenze (supply-chain)

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/security.yml`

- [ ] **Step 1: Dependabot**

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      minor-patch:
        update-types: ["minor", "patch"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- [ ] **Step 2: Workflow `npm audit` sulle PR**

`.github/workflows/security.yml`:

```yaml
name: security-audit
on:
  pull_request:
  push:
    branches: [master]
jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Audit (blocca su high/critical)
        run: npm audit --audit-level=high
```

- [ ] **Step 3: Verifica locale dell'audit**

Run: `npm audit --audit-level=high`
Expected: nessuna vulnerabilita' high/critical, oppure elenco da triagiare. Se ce ne sono, annotarle (il fix puo' essere un task a parte; non bloccare l'Onda 1 su un transitivo non sfruttabile, ma documentarlo).

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml .github/workflows/security.yml
git commit -m "Sicurezza Onda 1: Dependabot settimanale + npm audit in CI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NB: Dependabot e l'Action si attivano su GitHub dopo il push (sotto "pubblica"). In locale verifichiamo solo `npm audit`.

---

## Task 6: Monitoraggio errori con PII scrubbing (Sentry)

Occhi sugli errori, senza mai loggare dati sensibili. Degrada a no-op se la DSN non c'e' (cosi' non blocca nulla finche' Morelz non crea il progetto Sentry).

**Files:**
- Create: `lib/sentry-scrub.ts`
- Create: `instrumentation.ts`
- Create: `instrumentation-client.ts`
- Modify: `package.json` (dipendenza `@sentry/nextjs`)

- [ ] **Step 1: Installare la dipendenza**

Run: `npm install @sentry/nextjs`
Expected: aggiunta in `package.json`, lockfile aggiornato.

- [ ] **Step 2: Funzione di scrubbing condivisa**

`lib/sentry-scrub.ts`:

```ts
// Rimuove ogni dato potenzialmente sensibile prima dell'invio a Sentry.
// Mai volti, token, email, cookie, body di richiesta.
type Event = Record<string, unknown> & {
  request?: { data?: unknown; cookies?: unknown; query_string?: unknown; headers?: Record<string, unknown> };
  user?: { email?: string; ip_address?: string } & Record<string, unknown>;
};

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
  }
  if (event.user) {
    delete event.user.email;
    event.user.ip_address = undefined;
  }
  return event;
}
```

- [ ] **Step 3: Init server/edge**

`instrumentation.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

export function register() {
  if (!process.env.SENTRY_DSN) return; // no DSN -> no-op
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event as never),
  });
}

export const onRequestError = Sentry.captureRequestError;
```

- [ ] **Step 4: Init client**

`instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event as never),
  });
}
```

- [ ] **Step 5: Verifica build (DSN assente = no-op)**

Run: `npx tsc --noEmit && npm run build`
Expected: verde. Senza DSN, Sentry non invia nulla (no-op), nessun errore.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/sentry-scrub.ts instrumentation.ts instrumentation-client.ts
git commit -m "Sicurezza Onda 1: monitoraggio errori Sentry con PII scrubbing (no-op senza DSN)

Mai volti/token/email/cookie/body verso Sentry; attivo solo quando Morelz fornisce la DSN.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NB Morelz (Task 8): creare il progetto Sentry, impostare `SENTRY_DSN` (server) e `NEXT_PUBLIC_SENTRY_DSN` (client) nelle env Vercel.

---

## Task 7: Igiene segreti + rotazione service-role

La `SUPABASE_SERVICE_ROLE_KEY` bypassa ogni RLS: e' il segreto piu' critico.

**Files:**
- Nessuna modifica di codice prevista (audit). Eventuali fix se l'audit trova leak.

- [ ] **Step 1: Verificare che la service-role non sia mai lato client**

Run: `grep -rn "SUPABASE_SERVICE_ROLE_KEY" human2ai-passport/app human2ai-passport/lib human2ai-passport/components`
Expected: solo `lib/supabase.ts` (e file server-only che lo usano via `createServerClient`). Nessun file con `"use client"` deve riferirlo. Verificare che i file che chiamano `createServerClient` non abbiano la direttiva `"use client"`.

- [ ] **Step 2: Verificare che la chiave non finisca nel bundle client**

Run: `npm run build` poi `grep -rn "service_role" human2ai-passport/.next/static || echo "PULITO: nessun service_role nel bundle client"`
Expected: "PULITO". (La service-role e' un JWT con claim `"role":"service_role"`; se comparisse negli static, sarebbe un leak grave.)

- [ ] **Step 3: Rotazione (azione Morelz, guidata)**

Documentare e far eseguire a Morelz: Supabase Dashboard, Project Settings, API, rigenerare la `service_role` key. Poi aggiornare la env `SUPABASE_SERVICE_ROLE_KEY` su Vercel (Production) e sul worker (Railway / `.env.local` del poller). Dopo l'aggiornamento, verificare che app e worker funzionino (una generazione di prova, un accesso autenticato).

- [ ] **Step 4: Commit (solo se l'audit ha prodotto fix)**

Se l'audit non trova nulla da cambiare, nessun commit di codice: l'esito si annota nella PR/handoff. Se trova un leak, il fix (rimuovere l'uso client-side) va committato con messaggio dedicato.

---

## Task 8: Hardening Supabase Auth (dashboard) + validazione password lato UX

La parte server dell'auth e' nel pannello Supabase (azioni di Morelz); il codice aggiunge solo la validazione UX coerente.

**Files:**
- Modify: `app/auth-ui.tsx` (helper di validazione)
- Modify: `app/signup/page.tsx`
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Azioni Morelz in dashboard Supabase (Authentication, Policies/Providers)**
  - Attivare **Leaked password protection** (HaveIBeenPwned). Chiude l'advisor `auth_leaked_password_protection` (WARN).
  - Alzare la **minimum password length** (>= 10) e richiedere classi di caratteri.
  - Attivare **CAPTCHA** (hCaptcha o Cloudflare Turnstile) su signup/login per frenare i bot sull'auth (che non passa dalle nostre rotte).
  - Verifica: `get_advisors(security)` non mostra piu' `auth_leaked_password_protection`.

- [ ] **Step 2: Validatore password puro (riusabile)**

In `app/auth-ui.tsx`, esportare una funzione di validazione coerente con la policy del dashboard:

```ts
// Coerente con la policy server di Supabase Auth. Ritorna un messaggio
// d'errore in italiano, o null se la password va bene.
export function passwordIssue(pw: string): string | null {
  if (pw.length < 10) return "La password deve avere almeno 10 caratteri";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return "Servono lettere maiuscole e minuscole";
  if (!/[0-9]/.test(pw)) return "Serve almeno un numero";
  return null;
}
```

- [ ] **Step 3: Usarlo in `app/signup/page.tsx`**

Aggiungere l'import `passwordIssue` da `../auth-ui` (accanto agli altri import dello stesso file) e, dentro `handleSubmit`, subito dopo `setLoading(true);`, prima di creare il client:

```ts
    const pwErr = passwordIssue(password);
    if (pwErr) { setError(pwErr); setLoading(false); return; }
```

- [ ] **Step 4: (Login) messaggio coerente**

In `app/login/page.tsx` non si valida la robustezza (la password esiste gia'), ma assicurarsi che gli errori di Supabase (incluso il rifiuto per password trapelata al cambio) siano mostrati in italiano nel blocco errore gia' presente. Nessuna logica nuova se il login gia' mostra `error.message`.

- [ ] **Step 5: Verifica**

Run: `npx tsc --noEmit && npm run build`
Expected: verde. In locale: provare un signup con "abc" -> messaggio "almeno 10 caratteri"; con una password robusta -> prosegue.

- [ ] **Step 6: Commit**

```bash
git add app/auth-ui.tsx app/signup/page.tsx app/login/page.tsx
git commit -m "Sicurezza Onda 1: validazione password lato UX coerente con la policy Auth

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Chiusura Onda 1

- [ ] **Verifica complessiva a terra**
  - `npx tsc --noEmit` e `npm run build` verdi.
  - `curl -I` su semblic.com (dopo "pubblica") mostra tutti gli header + CSP.
  - `get_advisors(security)`: sparito il WARN leaked-password; la nuova tabella `rate_limit_hits` risulta sana (`rls_enabled_no_policy`).
  - Rate-limit: `429` oltre soglia su una rotta calda.
- [ ] **Richiesta di pubblicazione**: presentare a Morelz il riepilogo e attendere "pubblica" per push + deploy. NON pushare prima.
- [ ] **Aggiornare la memoria** ([[human2ai-roadmap]], [[sicurezza-blindata-mandate]]) con lo stato Onda 1 e i pendenti dashboard di Morelz.
- [ ] **Avvio Onda 2** (piano separato): RLS per-riga, audit autorizzazione rotte, audit log accessi biometrici, 2FA, signed URL.

## Self-review (esito)

- **Copertura spec Onda 1:** header+CSP (Task 1-2), leaked-password+policy (Task 8), igiene segreti+rotazione (Task 7), scanner dipendenze (Task 5), rate-limit (Task 4), monitoraggio (Task 6), bonus storage (Task 3). Tutte le misure della sezione 5 della spec hanno un task.
- **Placeholder:** nessuno; ogni step ha codice/comando reale.
- **Coerenza tipi/nomi:** `allowRequest`/`ipFrom` (lib/rate-limit) usati coerentemente; `check_rate_limit` con gli stessi parametri tra SQL e RPC; `STATIC_SECURITY_HEADERS` unica fonte; `passwordIssue` unico validatore; `scrubEvent` unico scrubber.
- **Nota a terra:** corretto il "footgun storage" (in realta' due funzioni esplicite) rispetto alla spec, come da disciplina di verifica.
