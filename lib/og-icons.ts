// Icone ✓/✕ per le OG card come SVG inline (data URI). Il font Geist non contiene
// i glifi ✓ (U+2713) / ✕ (U+2715) e il dynamic-font loading di next/og verso
// Google non e' affidabile (400 in locale, tofu nel render): disegnarle come
// <img src=svg> le rende deterministiche su qualsiasi runtime.

function iconUri(pathD: string, color: string): string {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

export const checkIcon = (color: string) => iconUri("M20 6 9 17l-5-5", color);
export const crossIcon = (color: string) => iconUri("M6 6 18 18M18 6 6 18", color);
