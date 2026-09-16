// Articolo determinativo maschile plurale davanti a un numero scritto in cifre:
// si sceglie dal suono del numero letto ("gli otto", "gli undici", "i dodici").
// Suonano con vocale: 8 e tutto cio' che si legge otto-/ottanta-/ottocento-
// (prima cifra 8) e undici (11) o undicimila (11 000 - 11 999).
export function articoloPlurale(n: number): "i" | "gli" {
  const s = String(Math.trunc(Math.abs(n)));
  if (s.startsWith("8")) return "gli";
  if (s.startsWith("11") && (s.length === 2 || s.length === 5)) return "gli";
  return "i";
}
