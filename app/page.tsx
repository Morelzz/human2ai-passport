import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { Tier } from "@/lib/types";
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
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/match" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>
            Trova un volto
          </Link>
          <Link href="/pricing" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>
            Prezzi
          </Link>
          {firstName ? (
            <Link href="/account" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#f0f0f5", fontSize: "0.85rem", textDecoration: "none", background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 999, padding: "0.4rem 0.9rem", fontWeight: 600 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)", flexShrink: 0 }} />
              {firstName}
            </Link>
          ) : (
            <Link href="/login" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>
              Accedi
            </Link>
          )}
          <Link href="/verify" style={{ color: "#00A896", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 999, padding: "0.4rem 1rem" }}>
            Verifica un contenuto →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "5rem 1.5rem 3rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(107,33,232,0.1)", border: "1px solid rgba(107,33,232,0.25)", borderRadius: 999, padding: "0.3rem 0.9rem", marginBottom: "1.5rem" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B21E8" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ color: "#6B21E8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em" }}>REGISTRO VOLTI — DATI DEMO</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 auto 1.25rem", maxWidth: 720 }}>
          Il tuo volto è{" "}
          <span style={{ color: "#00A896" }}>tuo</span>.
          <br />
          <span style={{ color: "#6B21E8" }}>Verificabile, autorizzato, pagato.</span>
        </h1>

        <p style={{ color: "#6b7280", fontSize: "1.1rem", maxWidth: 560, margin: "0 auto 2rem", lineHeight: 1.7 }}>
          Human2AI è il registro fidato delle identità AI consenzienti. Ogni volto ha un
          token verificabile, ogni uso passa dal consenso, e ogni generazione paga la persona reale.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/match" style={{ background: "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", borderRadius: 10, padding: "0.8rem 1.5rem" }}>
            Trova un volto
          </Link>
          <Link href="/pricing" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#f0f0f5", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", borderRadius: 10, padding: "0.8rem 1.5rem" }}>
            Vedi i prezzi
          </Link>
        </div>
      </section>

      {/* Come funziona — il loop della tesi */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        <p style={{ color: "#374151", fontSize: "0.75rem", letterSpacing: "0.12em", marginBottom: "1.5rem", textAlign: "center" }}>COME FUNZIONA</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { n: "01", t: "Consenso", d: "Una persona reale rivendica il proprio volto, verifica l'identità e dichiara gli usi autorizzati.", c: "#6B21E8" },
            { n: "02", t: "Generazione", d: "Chi crea sceglie un volto consenziente. Senza consenso, niente generazione.", c: "#B8005C" },
            { n: "03", t: "Royalty", d: "Ogni generazione paga la persona reale: royalty all'80%, accumulo e payout.", c: "#00A896" },
            { n: "04", t: "Certificato", d: "Ogni contenuto esce con un token verificabile da chiunque, sempre.", c: "#6B21E8" },
          ].map((s) => (
            <div key={s.n} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.4rem" }}>
              <span style={{ color: s.c, fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.1em" }}>{s.n}</span>
              <p style={{ color: "#f0f0f5", fontSize: "1rem", fontWeight: 700, margin: "0.5rem 0 0.4rem" }}>{s.t}</p>
              <p style={{ color: "#6b7280", fontSize: "0.83rem", lineHeight: 1.55, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", margin: "1.5rem 0 0" }}>
          Hai un&apos;immagine generata? <Link href="/verify" style={{ color: "#00A896", textDecoration: "none", fontWeight: 600 }}>Verifica il suo certificato →</Link>
        </p>
      </section>

      {/* Griglia avatar */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem 6rem" }}>
        <p style={{ color: "#374151", fontSize: "0.75rem", letterSpacing: "0.12em", marginBottom: "1.5rem" }}>
          {avatars.length} AVATAR NEL REGISTRO
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
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
    </div>
  );
}
