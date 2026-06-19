import type { WardData } from "./demo";

// Vault: l'archivio prove. Per ogni match il dossier (screenshot, html, WHOIS,
// hash ancorato). Lega al Compliance Vault (futuro). Dati demo.
const HASHLOCK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);

export function Vault({ data }: { data: WardData }) {
  return (
    <section className="screen on" id="s-vault">
      <div className="h-row"><h2>Evidence Vault</h2><span className="sub">a prova di manomissione</span></div>
      {data.vault.map((e) => (
        <div className="ev" key={e.id}>
          <div className="ev-top"><span className="d">{e.dom}</span><span className="score c">{(e.score / 100).toFixed(2)}</span></div>
          <div className="ev-hash">{HASHLOCK} {e.hash}, ancorato {e.anchoredAt}</div>
          <div className="ev-tags">{e.tags.map((t, i) => <span key={i}>{t}</span>)}</div>
        </div>
      ))}
    </section>
  );
}
