// Sfondo cinematografico condiviso: bagliori + grana (fissi, sotto il contenuto).
// Va inserito come primo figlio di un wrapper `relative`; il contenuto va in un
// secondo figlio con `relative z-[2]`.
export function CineBackground() {
  return (
    <>
      <div className="cine-bg" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}
