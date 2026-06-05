import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { Tier } from "@/lib/types";
import { colors, gradient, buttonPrimary, buttonSecondary } from "@/lib/ui";
import { Nav } from "./Nav";
import AvatarCard from "./AvatarCard";

export default async function Home() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("avatars")
    .select("*")
    .order("consent_start");

  // Gate: solo avatar approvati nel registro pubblico (default 'approved' se la
  // colonna non esiste ancora -> nessuna rottura prima della migrazione).
  const avatars = (data ?? []).filter((a) => (a.verification_status ?? "approved") === "approved");

  // Sessione: se l'utente è loggato, esponiamo il suo account nella nav.
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  let firstName: string | null = null;
  if (user) {
    const { data: profile } = await auth
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const full = profile?.full_name || user.email || "";
    firstName = full ? String(full).trim().split(/\s+/)[0] : "Account";
  }

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", color: colors.text, position: "relative", overflow: "hidden" }}>
      {/* Strato cinematografico: bagliori + grana (fissi, sotto il contenuto) */}
      <div className="cine-bg" aria-hidden />
      <div className="grain" aria-hidden />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Nav
          right={
            <>
              <span className="nav-secondary" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Link href="/match" style={{ color: colors.muted, fontSize: "0.85rem", textDecoration: "none" }}>Trova un volto</Link>
                <Link href="/pricing" style={{ color: colors.muted, fontSize: "0.85rem", textDecoration: "none" }}>Prezzi</Link>
                <Link href="/trasparenza" style={{ color: colors.muted, fontSize: "0.85rem", textDecoration: "none" }}>Trasparenza</Link>
              </span>
              {firstName ? (
                <Link href="/account" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: colors.text, fontSize: "0.85rem", textDecoration: "none", background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 999, padding: "0.4rem 0.9rem", fontWeight: 600 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: gradient, flexShrink: 0 }} />
                  {firstName}
                </Link>
              ) : (
                <Link href="/login" style={{ color: colors.muted, fontSize: "0.85rem", textDecoration: "none" }}>Accedi</Link>
              )}
              <Link href="/verify" style={{ color: colors.teal, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 999, padding: "0.4rem 1rem" }}>Verifica →</Link>
            </>
          }
        />

        {/* ── HERO / MANIFESTO ─────────────────────────────────────────── */}
        <section style={{ maxWidth: 920, margin: "0 auto", padding: "clamp(3.5rem, 12vw, 7rem) 1.5rem clamp(2.5rem, 8vw, 4rem)", textAlign: "center" }}>
          <div className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(107,33,232,0.10)", border: "1px solid rgba(107,33,232,0.25)", borderRadius: 999, padding: "0.35rem 0.95rem", marginBottom: "clamp(1.5rem, 5vw, 2.25rem)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.violet} strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span style={{ color: colors.violetLight, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.16em" }}>IL FILTRO DI TUTELA UMANA · DATI DEMO</span>
          </div>

          <h1 className="reveal" style={{ fontSize: "clamp(2.4rem, 8.5vw, 5rem)", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.02em", margin: "0 auto", maxWidth: 16 + "ch", animationDelay: "0.08s" }}>
            Presto, generare un volto{" "}
            <span style={{ color: colors.crimson }}>senza consenso</span>{" "}
            sarà <span className="text-gradient">impossibile</span>.
          </h1>

          <p className="reveal" style={{ color: colors.muted, fontSize: "clamp(1rem, 3.5vw, 1.2rem)", lineHeight: 1.65, maxWidth: 560, margin: "clamp(1.25rem, 4vw, 1.75rem) auto 0", animationDelay: "0.16s" }}>
            Noi siamo il filtro tra ogni intelligenza artificiale e ogni volto umano.
            Ogni identità ha un consenso <strong style={{ color: colors.text }}>verificabile</strong>.
            Ogni generazione <strong style={{ color: colors.text }}>paga la persona reale</strong>.
          </p>

          <div className="reveal" style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", margin: "clamp(2rem, 6vw, 2.75rem) 0 0", animationDelay: "0.24s" }}>
            <Link href="/match" style={{ ...buttonPrimary, padding: "0.9rem 1.7rem", fontSize: "0.95rem", boxShadow: "0 8px 40px rgba(107,33,232,0.35)" }}>Esplora il registro</Link>
            <Link href="#come-funziona" style={{ ...buttonSecondary, padding: "0.9rem 1.7rem", fontSize: "0.95rem", background: "rgba(255,255,255,0.04)" }}>Come funziona</Link>
          </div>

          <p className="reveal" style={{ color: colors.faint, fontSize: "0.82rem", margin: "clamp(1.5rem, 5vw, 2rem) 0 0", animationDelay: "0.32s" }}>
            {avatars.length} volti già nel registro · ogni token è verificabile pubblicamente
          </p>
        </section>

        {/* ── IL LOOP DEL CONSENSO ─────────────────────────────────────── */}
        <section id="come-funziona" style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(2rem, 6vw, 3.5rem) 1.5rem", scrollMarginTop: "5rem" }}>
          <p style={{ color: colors.faint, fontSize: "0.72rem", letterSpacing: "0.18em", textAlign: "center", margin: "0 0 0.6rem" }}>IL LOOP DEL CONSENSO</p>
          <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2.2rem)", fontWeight: 700, textAlign: "center", letterSpacing: "-0.01em", margin: "0 0 clamp(1.75rem, 5vw, 2.5rem)" }}>
            Quattro passi, un patto.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {[
              { n: "01", t: "Consenso", d: "Una persona reale rivendica il proprio volto, verifica l'identità e dichiara gli usi autorizzati.", c: colors.violet },
              { n: "02", t: "Generazione", d: "Chi crea sceglie un volto consenziente. Senza consenso, niente generazione.", c: colors.crimson },
              { n: "03", t: "Royalty", d: "Ogni generazione paga la persona reale: l'80% a lei, accumulo e payout.", c: colors.teal },
              { n: "04", t: "Certificato", d: "Ogni contenuto esce con un token verificabile da chiunque, per sempre.", c: colors.violetLight },
            ].map((s) => (
              <div key={s.n} className="glass glass-hover" style={{ borderRadius: 18, padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.9rem" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: s.c + "22", border: `1px solid ${s.c}55`, color: s.c, fontSize: "0.78rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</span>
                  <p style={{ color: colors.text, fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>{s.t}</p>
                </div>
                <p style={{ color: colors.muted, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <p style={{ color: colors.muted, fontSize: "0.88rem", textAlign: "center", margin: "clamp(1.5rem, 5vw, 2rem) 0 0" }}>
            Hai un&apos;immagine generata? <Link href="/verify" style={{ color: colors.teal, textDecoration: "none", fontWeight: 600 }}>Verifica il suo certificato →</Link>
          </p>
        </section>

        {/* ── REGISTRO ─────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(2rem, 6vw, 3.5rem) 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <p style={{ color: colors.faint, fontSize: "0.72rem", letterSpacing: "0.18em", margin: 0 }}>{avatars.length} VOLTI NEL REGISTRO</p>
            <Link href="/match" style={{ color: colors.violetLight, fontSize: "0.85rem", textDecoration: "none" }}>Cerca per caratteristiche →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {avatars.map((av) => (
              <AvatarCard
                key={av.handle}
                handle={av.handle}
                alias={av.alias}
                portrait_url={av.portrait_url}
                tier={av.tier as Tier}
                usage_count={av.usage_count}
                revoked_at={av.revoked_at}
              />
            ))}
          </div>
        </section>

        {/* ── CHIUSURA / CHIAMATA ──────────────────────────────────────── */}
        <section style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(2.5rem, 8vw, 5rem) 1.5rem clamp(4rem, 10vw, 7rem)" }}>
          <div className="glass" style={{ borderRadius: 28, padding: "clamp(2.25rem, 7vw, 4rem) clamp(1.5rem, 5vw, 3rem)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 80% at 50% 0%, rgba(107,33,232,0.18), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: "clamp(2rem, 7vw, 3.4rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 1rem" }}>
                Il tuo volto è <span className="text-gradient">tuo</span>.
              </h2>
              <p style={{ color: colors.muted, fontSize: "clamp(1rem, 3.5vw, 1.15rem)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto 2rem" }}>
                Rivendicalo nel registro. Decidi come può essere usato. Vieni pagato ogni volta.
              </p>
              <Link href="/signup" style={{ ...buttonPrimary, padding: "0.95rem 2rem", fontSize: "1rem", boxShadow: "0 8px 40px rgba(107,33,232,0.4)" }}>Rivendica il tuo volto</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${colors.border}`, padding: "2rem 1.5rem", maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: gradient }} />
            <span style={{ fontSize: "0.78rem", letterSpacing: "0.15em", fontWeight: 700, color: colors.muted }}>HUMAN2AI</span>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <Link href="/match" style={{ color: colors.faint, fontSize: "0.82rem", textDecoration: "none" }}>Registro</Link>
            <Link href="/pricing" style={{ color: colors.faint, fontSize: "0.82rem", textDecoration: "none" }}>Prezzi</Link>
            <Link href="/trasparenza" style={{ color: colors.faint, fontSize: "0.82rem", textDecoration: "none" }}>Trasparenza</Link>
            <Link href="/verify" style={{ color: colors.faint, fontSize: "0.82rem", textDecoration: "none" }}>Verifica</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
