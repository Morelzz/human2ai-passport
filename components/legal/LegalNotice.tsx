// F1 — banner discreto su OGNI pagina legale finché Morelz non conferma la
// validazione dell'avvocato. VINCOLO del brief: non rimuovere prima di allora.
export function LegalNotice() {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#f0b429]/30 bg-[#f0b429]/[0.06] px-4 py-3">
      <span aria-hidden className="mt-0.5 text-sm">⚖️</span>
      <p className="m-0 text-[0.78rem] leading-relaxed text-[#d9a72e]">
        <span className="font-bold">Documento in revisione legale: versione preliminare.</span>{" "}
        Questa bozza descrive fedelmente le pratiche della piattaforma ma non è ancora stata
        validata da un avvocato. I punti segnati <span className="font-mono text-[0.72rem]">[DA AVVOCATO]</span> sono volutamente aperti.
      </p>
    </div>
  );
}
