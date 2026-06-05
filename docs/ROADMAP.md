# Human2AI — Roadmap di prodotto

> Ultimo aggiornamento: 2026-06-06. Fonte di verità sulla progressione della piattaforma.
> Vedi anche `CLAUDE.md` (guardrail) e `docs/AVATAR_PASSPORT_SPEC.md` (spec del modulo registro).

---

## 1. Dove siamo oggi (stato reale)

Il prodotto-tesi è **completo end-to-end** con dati demo:

- ✅ **Registro volti**: passport pubblico per handle, identity kit immutabile, gate di verifica.
- ✅ **Verifica**: token avatar + certificato contenuti, verificabili da chiunque.
- ✅ **Consenso**: timeline eventi, revoca *prospettica* (blocca il futuro, non cancella il passato).
- ✅ **Generazione**: Higgsfield Soul, identity-lock verificato (avatar reale: Mario R.).
- ✅ **Royalty/Wallet**: split 80/20, accumulo, soglia payout, ledger.
- ✅ **Provenienza**: certificato C2PA impresso nei metadati (EXIF) al download.
- ✅ **Enterprise**: multi-avatar per agenzie, consenso "persona-nel-loop", coda revisione operatori.
- ✅ **Enforcement**: segnalazione abuso / takedown (coda moderazione admin).
- ✅ **UI/Brand**: home ricostruita cinematografica mobile-first (Tailwind + shadcn + Framer Motion), logo-scudo animato come centerpiece, hamburger mobile.

**Manca per essere "vivo":** UI sulle altre pagine, deploy, KYC reale, pagamenti reali, blockchain.

---

## 2. Sequenza strategica (decisa insieme)

```
UI cinematografica → Deploy → KYC reale → Pagamenti reali → Blockchain anchoring → Scala
```

Motivo: in questa fase il prodotto vende la **tesi**, non le generazioni. Prima deve
*convincere* (UI + manifesto), poi essere *vivo* (deploy), poi *reale* (KYC + pagamenti),
poi *inattaccabile* (prove on-chain). Il punto forte è **mobile / masse** → tutto mobile-first.

---

## 3. FASE A — Rifinitura UI & Brand  *(prima cosa, domenica)*

- [ ] Propagare il design system (Tailwind/shadcn/Framer) alle pagine ancora "vecchie":
      `/match`, `/passport`, `/pricing`, `/trasparenza`, `/account/*`, login/signup.
- [ ] Spostare la `Navbar` con hamburger come **nav condivisa** di tutto il sito (oggi solo home; le altre usano `app/Nav.tsx`).
- [ ] Versione **SVG/trasparente** del logo (più nitida e leggera della maschera sul PNG).
- [ ] Sostituire i **portrait DiceBear esterni** con asset locali (dipendenza esterna + lenta).
- [ ] QA mobile su tutte le pagine + pass accessibilità e `prefers-reduced-motion`.

## 4. FASE B — Deploy / Go-live

- [ ] Applicare migrazioni Supabase pendenti: `abuse_reports.sql` + check ruolo `enterprise` (2 righe ALTER in `enterprise.sql`).
- [ ] Deploy su **Vercel**: env/secrets server-side (Supabase service role, Higgsfield), dominio.
- [ ] **Legal/GDPR**: privacy policy, termini, testo di consenso, cookie. (Vincolo: nessun dato biometrico persistito non necessario.)
- [ ] SEO/OG meta + immagine social (può usare il logo), `sitemap`, `robots`.
- [ ] Analytics privacy-friendly (Plausible/Umami).
- [ ] Decidere demo vs reale: badge "DATI DEMO" finché non ci sono avatar reali.
- [ ] Performance budget: immagini ottimizzate, font, Lighthouse mobile.

## 5. FASE C — KYC reale & onboarding creatori

- [ ] Provider KYC individuale: **Stripe Identity** / Veriff / Onfido. (Costa a chiamata → attivare quando ci sono creatori veri.)
- [ ] Onboarding seller reale + primi avatar reali (le 15 foto di Mario su `Desktop\AVATAR` → Supabase Storage).
- [ ] **Enterprise Fase 2**: face-match documento↔selfie↔foto (AWS Rekognition), storage documenti cifrato con purge ("cancello, non cassaforte"), KYB org, flusso self-serve "diventa agenzia".

## 6. FASE D — Pagamenti reali

- [ ] **Stripe Connect**: payout reali ai creatori (oggi il ledger è simulato).
- [ ] **Stripe Checkout**: pagamento del compratore per le generazioni commerciali.
- [ ] Fatturazione/IVA, gestione resi/dispute.

## 7. FASE E — Blockchain / Tokenizzazione  *(il tuo prossimo grande tema)*

**Fattibile: SÌ.** Ed è già predisposto: il sistema calcola da subito hash SHA-256
(token avatar, certificato generazione). La blockchain qui serve come **livello di prova
pubblica e immutabile**, non come criptovaluta.

**Modello consigliato — "anchoring/notarizzazione" (semplice, economico, GDPR-safe):**
- [ ] Ancorare on-chain **solo gli hash anonimi** (certificati, root Merkle degli eventi di consenso). **MAI** volti/foto/documenti/dati personali (guardrail assoluto in `CLAUDE.md`).
- [ ] Catena: **L2 EVM** (Base o Polygon) per gas bassi, oppure **OpenTimestamps** (ancora su Bitcoin, quasi gratis) per pura marcatura temporale.
- [ ] **Batching via Merkle root**: una transazione periodica ancora migliaia di certificati → costi trascurabili.
- [ ] **Custodiale e invisibile**: la piattaforma firma con un proprio wallet backend; l'utente non ha bisogno di wallet né di capire la blockchain (coerente con "i motori sono terze parti invisibili").
- [ ] `/verify` mostra la **prova on-chain**: link alla transazione + timestamp immutabile, accanto al certificato.

**Da rimandare / valutare con cautela:**
- ⏳ **NFT** per consenso/licenza (più "web3" ma aggiunge gas, wallet UX, dubbi regolatori). Solo se c'è una domanda reale.
- 🛑 **Token/criptovaluta di piattaforma** per l'economia: **sconsigliato ora** — in UE ricade in **MiCA** (regolamentazione pesante) ed è speculativo. L'economia royalty resta in **EUR via Stripe**. "Tokenizzazione" = prova/certificato on-chain, non una moneta.

**Prerequisiti tecnici:** wallet/keystore backend sicuro (key management), scelta catena, smart contract "anchor" minimale (memorizza root + timestamp), monitor gas.

## 8. FASE F — Scala

- [ ] Self-serve agenzie (KYB) + billing a volume + **API pubblica**.
- [ ] Motori aggiuntivi: voce (ElevenLabs), video/avatar parlanti (HeyGen).
- [ ] Discovery: ricerca/filtri avanzati, categorie, "marketing studio".

---

## 9. Vincoli trasversali (non negoziabili)

- **GDPR**: nessun dato biometrico/personale on-chain → solo hash anonimi. Dati sensibili solo server-side.
- **MiCA**: niente token/criptovaluta di piattaforma per ora.
- **Costi**: gas (mitigato da L2 + batching), KYC a chiamata, crediti generazione (1 credito ≈ €0,06).
- **Onestà sui livelli**: SPARK/SHAPE = "ispirato a"; SOUL/HUMAN = identity-locked.

## 10. Debiti tecnici noti

- Portrait DiceBear esterni → asset locali.
- Logo PNG (con maschera radiale) → SVG/trasparente.
- Design system da propagare oltre la home.
- Payout/pagamenti simulati → Stripe reale.
- (Tooling) `preview_screenshot` instabile in locale; usare riavvio preview + `preview_eval`.

---

## 11. Per riprendere (checklist rapida)

1. `npm run dev` (va riavviato a ogni riapertura PC).
2. Migrazioni Supabase pendenti: `abuse_reports.sql` + check ruolo `enterprise`.
3. Account di test: `admin@h2ai.test`, `org@h2ai.test` (pwd `Test1234!`).
4. Avatar reale: `mario-r` (Soul attivo, ritratto reale in `public/logo-shield.png`? no — ritratto via `/api/sample/mario-r/0`).
5. Prossimo passo di default: **Fase A** (propagare UI) → poi **Fase B** (deploy).
