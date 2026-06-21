import Link from "next/link";

// Entry pubblico di Ward (spec C2 + ward-homepage-flow.html): tre pannelli con
// cui il visitatore sceglie come iniziare. Reso dentro .ward-app (layout /ward),
// quindi eredita font e token Ward. Presentazionale: nessun dato utente, nessuna
// chiamata di rete. E' lo stato "locked" del cancello (vedi app/ward/page.tsx).
const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
);

export function WardEntry() {
  return (
    <div className="ward-entry">
      <Link href="/" className="we-top">
        <span className="mk">S</span>
        <span className="wm">Semblic <span>Ward</span></span>
      </Link>

      <div className="we-intro">
        <span className="we-eyebrow">Proteggi il tuo volto</span>
        <h1>Tre modi per cominciare</h1>
        <p>Guarda il sistema in azione, oppure attiva subito la protezione sul tuo volto.</p>
      </div>

      <div className="we-panels">
        {/* Provala (demo) */}
        <Link href="/ward/demo" className="we-panel demo">
          <span className="we-badge demo">DEMO</span>
          <span className="we-ic demo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.5-3.5" /></svg>
          </span>
          <h3>Provala</h3>
          <p className="we-desc">Guarda Ward lavorare su dati simulati. Nessuna iscrizione, nessuna foto, non scansiona te.</p>
          <span className="we-go">Apri la demo {CHEVRON}</span>
        </Link>

        {/* Hai gia un avatar */}
        <Link href="/signup/avatar?existing=1" className="we-panel exist">
          <span className="we-ic exist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>
          </span>
          <h3>Hai già un avatar</h3>
          <p className="we-desc">Sei già su Semblic? Il tuo volto è già registrato. Attivi Ward con il solo consenso, niente foto da rifare.</p>
          <span className="we-go">Attiva la protezione {CHEVRON}</span>
        </Link>

        {/* Proteggiti ora (consigliato) */}
        <Link href="/signup/avatar/protected" className="we-panel protect">
          <span className="we-badge reco">CONSIGLIATO</span>
          <span className="we-ic protect">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2.5l7.5 3.2v5.1c0 4.8-3.2 8.3-7.5 9.7-4.3-1.4-7.5-4.9-7.5-9.7V5.7L12 2.5z" /><path d="M9 12l2 2 4-4.2" /></svg>
          </span>
          <h3>Proteggiti ora</h3>
          <p className="we-desc">Crea la tua identità protetta. Ti certifichi una volta e aggiungi le foto del viso, poi entri in Ward.</p>
          <span className="we-steps">verifica (KYC) gratis<br />3 foto del volto<br />consenso, Ward attivo</span>
          <span className="we-go">Inizia {CHEVRON}</span>
        </Link>
      </div>
    </div>
  );
}
