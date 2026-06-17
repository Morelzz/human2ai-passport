// Avatar locale deterministico: gradiente brand + iniziale, come data-URI SVG.
// Sostituisce i ritratti DiceBear esterni (dipendenza esterna + lenta su mobile).
// Stesso handle → sempre stesso avatar. Nessuna chiamata di rete.

const PALETTES: [string, string][] = [
  ["#F2A93B", "#EE7A70"],
  ["#7FAE96", "#F2A93B"],
  ["#EE7A70", "#7FAE96"],
  ["#F2A93B", "#7FAE96"],
  ["#F2A93B", "#EE7A70"],
  ["#7FAE96", "#F2A93B"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarArt(handle: string, alias?: string): string {
  const h = hashString(handle || "x");
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const initial = ((alias || handle || "?").trim()[0] || "?").toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='100' height='100' fill='url(#g)'/>` +
    `<text x='50' y='50' font-family='system-ui,sans-serif' font-size='44' font-weight='700' ` +
    `fill='#F2E9D8' text-anchor='middle' dominant-baseline='central'>${initial}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
