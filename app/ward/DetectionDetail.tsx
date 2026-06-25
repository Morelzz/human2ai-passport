import { useState } from "react";
import type { WardDetection } from "./demo";

// Dettaglio di una detection sullo STESSO scheletro, con 3 comportamenti decisi
// dal campo `sensitivity` (regole A2.6/A2.7):
//  - standard: tutto visibile + azioni.
//  - sensitive: preview SFOCATA di default + banner care + route StopNCII; reveal a scelta.
//  - minor: preview LOCKED mai mostrata, nessun reveal, dettagli nascosti,
//    banner child-safety con riferimento segnalazione, azione non disponibile.
const BACK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>);
const EYE_OFF = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><path d="M3 3l18 18" /></svg>);
const LOCK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);
const HEART = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-9.5-9C1 8.5 3 5 6.5 5 9 5 10.5 7 12 8.5 13.5 7 15 5 17.5 5 21 5 23 8.5 21.5 12 19 16.5 12 21 12 21z" /></svg>);
const SHIELD = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" /><path d="M12 9v4m0 3v.01" /></svg>);
const BOLT = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L4.5 13H11l-1 9 9-12h-6.5L13 2z" /></svg>);
const ATOM = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v4m0 10v4M3 12h4m10 0h4" /><circle cx="12" cy="12" r="3" /></svg>);
const CHK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>);
const HASHLOCK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);

const isHttpUrl = (s: string) => /^https?:\/\//.test(s);

export function DetectionDetail({ detection: d, onBack, real }: { detection: WardDetection; onBack: () => void; real: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const isMinor = d.sensitivity === "minor";
  const isSensitive = d.sensitivity === "sensitive";
  // L'immagine reale (dal vivo via proxy): solo coi dati reali, standard subito,
  // sensibile solo dopo il reveal (cosi' i byte sensibili non arrivano prima del
  // consenso), minore mai. In demo resta il segnaposto.
  const showImg = real && !isMinor && (!isSensitive || revealed) && imgOk;
  const previewCls = "preview"
    + (isMinor ? " locked" : isSensitive && !revealed ? " blurred" : "")
    + (revealed ? " revealed" : "");

  return (
    <section className="screen on" id="s-detail">
      <button type="button" className="det-back" onClick={onBack}>{BACK} Detections</button>

      {/* preview: per il MINORE niente immagine/glyph e nessun reveal, mai */}
      <div className={previewCls}>
        {showImg && <img className="preview-img" src={`/api/ward/preview/${d.id}`} alt="" onError={() => setImgOk(false)} />}
        <div className="chrome"><i /><i /><i /><span className="u">{isMinor ? "[host riservato]" : d.url}</span></div>
        {!isMinor && !showImg && <><span className="glyph" /><span className="scan" /></>}
        {isSensitive && (
          <div className="veil blur">
            <div className="vic">{EYE_OFF}</div>
            <div className="vt">Potrebbe essere esplicito o angosciante</div>
            <div className="vs">Non sei obbligato a guardare. Nemesis puo&apos; agire senza che tu veda nulla.</div>
            <div className="vbtns">
              <button type="button" className="vb muted" onClick={onBack}>Mantieni nascosto</button>
              <button type="button" className="vb" onClick={() => setRevealed(true)}>Mostra comunque</button>
            </div>
          </div>
        )}
        {isMinor && (
          <div className="veil lock">
            <div className="vic">{LOCK}</div>
            <div className="vt">Bloccato, non mostrabile</div>
            <div className="vs">Segnalato come potenzialmente riguardante un minore. Non salvato nel tuo vault. Instradato alle autorita&apos; competenti.</div>
          </div>
        )}
      </div>

      {/* titolo */}
      <div className="trow">
        <div className="dom">{isMinor ? "Bloccato, escalation" : d.dom}</div>
        {isMinor
          ? <div className="sc muted">n/d<small>score</small></div>
          : <div className="sc c">{(d.score / 100).toFixed(2)}<small>match</small></div>}
      </div>
      <span className={`threat det-threat ${isMinor ? "lock" : isSensitive ? "sens" : "c"}`}>
        {isMinor ? "Bloccato, escalation" : isSensitive ? "Non autorizzato, sensibile" : "Non autorizzato"}
      </span>

      {/* banner di cura / sicurezza */}
      {isSensitive && (
        <div className="banner care">
          <div className="bh">{HEART}<b>Ci pensiamo noi</b></div>
          <p>Sembra contenuto intimo non consensuale. Nemesis puo&apos; perseguirne la rimozione senza che tu debba vederlo.</p>
          <div className="route">Percorso consigliato: <b>fast-track StopNCII</b> + takedown Nemesis</div>
          <span className="support">Ottieni supporto</span>
        </div>
      )}
      {isMinor && (
        <div className="banner safety">
          <div className="bh">{SHIELD}<b>Protocollo child-safety attivo</b></div>
          <p>Questa detection e&apos; stata segnalata automaticamente come potenzialmente riguardante un minore. Non viene mostrata, non viene salvata, e non e&apos; azionabile qui. Semblic ha conservato il minimo necessario e l&apos;ha instradata alle autorita&apos; competenti.</p>
          <div className="route">Riferimento segnalazione: <b>{d.reportRef}</b></div>
        </div>
      )}

      {/* dettagli: NASCOSTI per il minore */}
      {!isMinor && (
        <>
          <div className="sec">Perche&apos; ha fatto match</div>
          <div className="why">
            <div className="score-line"><div className="bar"><i style={{ width: `${d.score}%` }} /></div><span className="pct">{d.score}%</span></div>
            <p>{d.why}</p>
            <span className="verdict">{ATOM}<span>{d.aiVerdict}</span></span>
          </div>

          <div className="sec">Sorgente</div>
          <div className="info">
            <div className="li"><span className="k">Immagine</span>
              {isHttpUrl(d.url)
                ? <a className="v mono lnk" href={d.url} target="_blank" rel="noopener noreferrer nofollow">{d.url}</a>
                : <span className="v mono">{d.url}</span>}
            </div>
            {d.pageUrl && (
              <div className="li"><span className="k">Pagina</span>
                <a className="v lnk" href={d.pageUrl} target="_blank" rel="noopener noreferrer nofollow">{d.pageUrl}</a>
              </div>
            )}
            <div className="li"><span className="k">Host</span><span className="v">{d.host}</span></div>
            <div className="li"><span className="k">Trovato via</span><span className="v">Google Vision, web detection</span></div>
          </div>

          <div className="sec">Registrazione, WHOIS</div>
          <div className="info">
            <div className="li"><span className="k">Registrar</span><span className="v">{d.registrar}</span></div>
            <div className="li"><span className="k">Paese</span><span className="v">{d.country}</span></div>
            <div className="li"><span className="k">Creato</span><span className="v mono">{d.created}</span></div>
          </div>

          <div className="sec">Prove, a prova di manomissione</div>
          <div className="doss">
            {d.evidence.map((ev, i) => {
              const last = i === d.evidence.length - 1;
              return (
                <div className="di" key={i}>{last ? HASHLOCK : CHK} {ev}{last ? <span className="hash">{d.hash}</span> : null}</div>
              );
            })}
          </div>
        </>
      )}

      {/* azioni */}
      <div className="det-actbar">
        {isMinor ? (
          <button type="button" className="pr status">{SHIELD} Segnalato alle autorita&apos;</button>
        ) : isSensitive ? (
          <>
            <button type="button" className="pr">{BOLT} Rimozione fast-track</button>
            <div className="sec-row">
              <button type="button" className="se">Colpisci con Nemesis</button>
              <button type="button" className="se">Non sono io</button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="pr">{BOLT} Colpisci con Nemesis</button>
            <div className="sec-row">
              <button type="button" className="se">Non sono io</button>
              <button type="button" className="se">Uso autorizzato</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
