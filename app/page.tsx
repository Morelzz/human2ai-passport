import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { Tier } from "@/lib/types";
import AvatarCard from "./AvatarCard";

export default async function Home() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("avatars")
    .select("handle, alias, portrait_url, tier, usage_count, revoked_at")
    .eq("is_demo", true)
    .order("consent_start");

  const avatars = data ?? [];

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </div>
        <Link href="/verify" style={{ color: "#00A896", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 999, padding: "0.4rem 1rem" }}>
          Verifica un contenuto →
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "5rem 1.5rem 3rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(107,33,232,0.1)", border: "1px solid rgba(107,33,232,0.25)", borderRadius: 999, padding: "0.3rem 0.9rem", marginBottom: "1.5rem" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B21E8" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ color: "#6B21E8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em" }}>REGISTRO VOLTI — DATI DEMO</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 auto 1.25rem", maxWidth: 700 }}>
          Il tuo volto è{" "}
          <span style={{ color: "#6B21E8" }}>un diritto</span>.
          <br />
          Ora è{" "}
          <span style={{ color: "#00A896" }}>verificabile</span>.
        </h1>

        <p style={{ color: "#6b7280", fontSize: "1.1rem", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          Human2AI è il registro fidato delle identità AI consenzienti.
          Ogni volto ha un token. Ogni token è verificabile da chiunque.
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
