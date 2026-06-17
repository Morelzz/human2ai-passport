# B3 Booking Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il flag opt-in "disponibile per ingaggi reali" sul volto del seller, con segnale e CTA sul passport pubblico verso il contatto esistente (fase "ora" di EXPANSION_V3 B3).

**Architecture:** Una colonna boolean su `avatars` (`available_for_booking`), un endpoint `/api/avatar/booking` gemello di `/api/avatar/wallet` per il toggle del proprietario, un toggle nel `ConsentClient`, e su `PassportClient` un badge + una CTA verso `/contatti?ingaggio=<handle>` con prefill nel `ContactForm`. Nessun flusso di richiesta/mediazione/fee (fase "dopo").

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (supabase-js, service role lato server), Tailwind + inline styles (coerenti coi file esistenti), lucide-react.

**Convenzioni del repo (rispettare):** commenti in italiano, niente trattini lunghi nei testi pubblici, verifica via `npx tsc --noEmit` + E2E nel browser di anteprima (no framework di unit test per route/UI), un commit di implementazione, push solo a "pubblica", migrazioni applicate col mio ok esplicito mostrando prima l'SQL.

---

### Task 1: Migrazione del flag

**Files:**
- Create: `supabase/booking_flag.sql`

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- B3 (EXPANSION_V3): flag opt-in "disponibile per ingaggi reali" sul volto.
-- Additiva, dormiente di default (opt-in). RLS gia' attiva su avatars.
alter table avatars
  add column if not exists available_for_booking boolean not null default false;
```

- [ ] **Step 2: Mostra l'SQL a Morelz e applicalo col suo ok esplicito**

Applicare con `apply_migration` (name: `booking_flag`) SOLO dopo "ok"/"applica". Senza ok, lo applica Morelz.

- [ ] **Step 3: Verifica lo schema**

`execute_sql`:
```sql
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name='avatars' and column_name='available_for_booking';
```
Atteso: 1 riga, `boolean`, default `false`, not null.

---

### Task 2: Endpoint `/api/avatar/booking`

**Files:**
- Create: `app/api/avatar/booking/route.ts`

- [ ] **Step 1: Crea la route (gemella di `/api/avatar/wallet`)**

```ts
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// B3 fase "ora": flag opt-in del seller "disponibile per ingaggi reali".
// Solo segnale (il brand contatta via /contatti). Non muove nulla d'altro.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const available = Boolean(body?.available);
  const handle = body?.handle ? String(body.handle).trim() : null;

  const admin = createServerClient();
  // Risolve l'avatar del proprietario (un seller ne ha uno; un'agenzia passa l'handle).
  let q = admin.from("avatars").select("id, handle, protection_only").eq("owner_id", user.id);
  if (handle) q = q.eq("handle", handle);
  const { data: av } = await q.maybeSingle();
  if (!av) return NextResponse.json({ error: "Avatar non trovato per questo account" }, { status: 404 });
  // Un volto in sola protezione (VETO) non puo' offrirsi per ingaggi.
  if (av.protection_only) return NextResponse.json({ error: "Un volto protetto non puo' offrirsi per ingaggi" }, { status: 400 });

  const { error } = await admin
    .from("avatars")
    .update({ available_for_booking: available })
    .eq("id", av.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, handle: av.handle, available_for_booking: available });
}
```

- [ ] **Step 2: Verifica (auth gate)**

`curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/avatar/booking -H "Content-Type: application/json" -d '{"available":true}'`
Atteso: `401` (non autenticato da curl). Il percorso autenticato si verifica nell'E2E (Task 6).

---

### Task 3: Toggle nel ConsentClient

**Files:**
- Modify: `app/account/consent/page.tsx` (select + prop)
- Modify: `app/account/consent/ConsentClient.tsx` (prop, stato, handler, UI)

- [ ] **Step 1: Estendi la select e passa i prop nel loader**

In `app/account/consent/page.tsx`, alla `.select(...)` aggiungi `available_for_booking, protection_only`:
```ts
    .select("handle, approved_categories, excluded_categories, revoked_at, available_for_booking, protection_only, gender, age_range, ethnicity, hair_color, eye_color, body_type, height, facial_hair, glasses, tattoos, language")
```
E nei prop di `<ConsentClient ... />` aggiungi (dopo `revokedAt={avatar.revoked_at}`):
```tsx
      availableForBooking={avatar.available_for_booking ?? false}
      protectionOnly={avatar.protection_only ?? false}
```

- [ ] **Step 2: Estendi i Props e destructure in ConsentClient**

In `app/account/consent/ConsentClient.tsx`, interfaccia `Props`: aggiungi
```ts
  availableForBooking: boolean;
  protectionOnly?: boolean;
```
Firma: `export default function ConsentClient({ handle, approved, excluded, revokedAt, availableForBooking, protectionOnly = false, kit }: Props) {`

- [ ] **Step 3: Stato + handler del toggle**

Subito dopo `const [error, setError] = useState<string | null>(null);` aggiungi:
```ts
  const [booking, setBooking] = useState(availableForBooking);

  async function toggleBooking() {
    const next = !booking;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/avatar/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setBooking(next);
  }
```

- [ ] **Step 4: UI del toggle (dentro il ramo `!revokedAt`, prima del Kill-switch)**

Subito prima del blocco `{/* Kill-switch */}` inserisci:
```tsx
            {/* Ingaggi reali (B3): segnale opt-in. Il brand contatta via /contatti.
                Nascosto per i volti in sola protezione (VETO). */}
            {!protectionOnly && (
              <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
                <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>INGAGGI REALI</p>
                <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                  Permetti ai brand di contattarti, tramite Human2AI, per uno shooting reale con la persona vera. Appare un badge sul tuo passport. Il consenso non cambia.
                </p>
                <button disabled={busy} onClick={toggleBooking}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700, cursor: busy ? "default" : "pointer", background: booking ? "rgba(0,168,150,0.12)" : "#12121a", color: booking ? "#00A896" : "#6b7280", border: booking ? "1px solid rgba(0,168,150,0.3)" : "1px solid rgba(255,255,255,0.08)" }}>
                  {booking ? "✓ Disponibile per ingaggi reali" : "Attiva: disponibile per ingaggi reali"}
                </button>
              </div>
            )}
```

- [ ] **Step 5: Typecheck parziale**

`npx tsc --noEmit` deve restare a 0 errori (verifica completa nel Task 6).

---

### Task 4: Badge + CTA sul PassportClient

**Files:**
- Modify: `app/passport/[handle]/page.tsx` (prop)
- Modify: `app/passport/[handle]/PassportClient.tsx` (import, prop, badge, CTA)

- [ ] **Step 1: Passa il prop dal loader**

In `app/passport/[handle]/page.tsx`, nei prop di `<PassportClient ... />` aggiungi (dopo `isRealPerson={isRealPerson}`):
```tsx
          availableForBooking={(a.available_for_booking as boolean) ?? false}
```
(`a` e' gia' `avatar as Record<string, unknown>`, riga 89.)

- [ ] **Step 2: Import dell'icona + Props**

In `app/passport/[handle]/PassportClient.tsx`, riga 6, aggiungi `Handshake` all'import lucide:
```ts
import { Copy, Check, BadgeCheck, Sparkles, ArrowLeft, AlertTriangle, Fingerprint, Link2, Handshake } from "lucide-react";
```
Interfaccia `Props`: dopo `isRealPerson?: boolean;` aggiungi `availableForBooking?: boolean;`
Firma: aggiungi `availableForBooking = false` ai parametri destrutturati (dopo `isRealPerson = true`).

- [ ] **Step 3: Badge nell'header (dopo il blocco isPublicFigure)**

Subito dopo la chiusura `)}` del badge `isPublicFigure` (riga ~145), prima di `</div>`:
```tsx
              {/* B3: disponibile per ingaggi reali (solo se attivo). */}
              {availableForBooking && status === "ATTIVO" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-teal">
                  <Handshake className="h-3.5 w-3.5" /> DISPONIBILE PER INGAGGI
                </span>
              )}
```

- [ ] **Step 4: Blocco CTA (dopo la CTA "Genera con questo avatar")**

Subito dopo la chiusura `)}` del blocco `{status === "ATTIVO" && ( ... )}` della CTA genera (riga ~270), inserisci:
```tsx
      {/* B3 fase "ora": CTA ingaggio reale verso il contatto esistente. Solo
          per avatar ATTIVI e disponibili. Nessun nuovo flusso. */}
      {availableForBooking && status === "ATTIVO" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="glass mt-4 rounded-2xl p-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-teal" />
            <p className="text-xs tracking-[0.1em] text-muted">INGAGGI REALI</p>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            {avatar.alias} e&apos; disponibile per uno shooting reale con la persona vera. Human2AI fa da garante: l&apos;AI non sostituisce i modelli, gli procura lavoro.
          </p>
          <Link
            href={`/contatti?ingaggio=${avatar.handle}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/15 px-5 py-2 text-sm font-bold text-teal transition-colors hover:bg-teal/25"
          >
            Richiedi un ingaggio →
          </Link>
        </motion.div>
      )}
```

---

### Task 5: Prefill del ContactForm da `?ingaggio=<handle>`

**Files:**
- Modify: `app/contatti/page.tsx` (searchParams + prefill prop)
- Modify: `app/contatti/ContactForm.tsx` (prop prefill + SUBJECTS)

- [ ] **Step 1: ContattiPage legge searchParams e passa il prefill**

In `app/contatti/page.tsx`, cambia la firma e calcola il prefill:
```tsx
export default async function ContattiPage({ searchParams }: { searchParams: Promise<{ ingaggio?: string }> }) {
  const { ingaggio } = await searchParams;
  const prefill = ingaggio
    ? { subject: "Ingaggio reale", message: `Vorrei richiedere un ingaggio reale per il volto @${ingaggio} del registro Human2AI.` }
    : undefined;
```
E passa `<ContactForm prefill={prefill} />` (al posto di `<ContactForm />`).

- [ ] **Step 2: ContactForm accetta il prefill e aggiunge l'oggetto**

In `app/contatti/ContactForm.tsx`:
- aggiungi `"Ingaggio reale"` a `SUBJECTS`:
```ts
const SUBJECTS = ["Sono un brand", "Voglio mettere il mio volto", "Ingaggio reale", "Stampa", "Partner", "Legale", "Altro"];
```
- firma + init di stato:
```ts
export function ContactForm({ prefill }: { prefill?: { subject?: string; message?: string } } = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [message, setMessage] = useState(prefill?.message ?? "");
```

- [ ] **Step 3: Typecheck parziale**

`npx tsc --noEmit` a 0 errori.

---

### Task 6: Verifica E2E + commit unico

**Files:** nessuno nuovo (verifica + commit del modulo).

- [ ] **Step 1: Typecheck completo**

Run: `npx tsc --noEmit`
Atteso: 0 errori.

- [ ] **Step 2: E2E nel browser di anteprima (preview MCP su :3000)**

Login seller `test-card-e3@h2ai.dev` / `H2ai-test-2026!` (preview anonima). Poi:
1. `/account/consent` → sezione "INGAGGI REALI" presente → click "Attiva" → diventa "✓ Disponibile per ingaggi reali" (nessun errore).
2. `/passport/random` → header mostra badge "DISPONIBILE PER INGAGGI" + blocco "INGAGGI REALI" con bottone "Richiedi un ingaggio".
3. Click "Richiedi un ingaggio" → `/contatti?ingaggio=random` con oggetto "Ingaggio reale" e messaggio pre-compilato col volto.
4. Torna su `/account/consent` → click per disattivare → `/passport/random` non mostra piu' badge ne' CTA.

Verifica DOM via `preview_snapshot`/`preview_eval` (i client si renderizzano lato browser; lo screenshot va in timeout sulle pagine animate, usare snapshot).

- [ ] **Step 3: Commit unico del modulo**

```bash
git add supabase/booking_flag.sql app/api/avatar/booking/route.ts app/account/consent/page.tsx app/account/consent/ConsentClient.tsx app/passport/[handle]/page.tsx app/passport/[handle]/PassportClient.tsx app/contatti/page.tsx app/contatti/ContactForm.tsx
git commit -F <messaggio temp>
```
Messaggio in italiano, niente trattini lunghi, trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Push solo a "pubblica". `git add --literal-pathspecs` per i path con `[brackets]`.

---

## Self-review

**Spec coverage:** dato (Task 1), controllo seller (Task 2+3), passport badge+CTA (Task 4), prefill contatto (Task 5), verifica+commit (Task 6). Tutte le sezioni della spec sono coperte. Fuori scope (flusso richiesta/fee) volutamente assente.

**Placeholder scan:** nessun TBD/TODO; ogni step ha codice o comando reale.

**Type consistency:** `available_for_booking` (colonna/DB e payload `available`/risposta), prop `availableForBooking` (ConsentClient + PassportClient), `protectionOnly`/`protection_only` coerenti tra loader e client, `prefill: { subject?, message? }` coerente tra ContattiPage e ContactForm. Endpoint `/api/avatar/booking` usato in ConsentClient. Tutto allineato.
