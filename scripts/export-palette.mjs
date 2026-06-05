// Esporta la palette colori di Human2AI in PNG + HTML + JSON + CSS.
// Uso: node scripts/export-palette.mjs  -> scrive in ./palette/
import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";

const PALETTE = [
  { group: "Brand", colors: [
    { name: "Deep Violet", role: "Primario", hex: "#6B21E8" },
    { name: "Crimson Empathy", role: "Secondario", hex: "#B8005C" },
    { name: "Precision Teal", role: "Accento", hex: "#00A896" },
  ]},
  { group: "Brand · varianti", colors: [
    { name: "Violet Light", role: "Hover/link", hex: "#8B47F0" },
    { name: "Teal Bright", role: "Gradiente", hex: "#00D4BE" },
    { name: "Crimson Bright", role: "Gradiente", hex: "#E0006F" },
    { name: "Signal Green", role: "Stato attivo", hex: "#00C864" },
  ]},
  { group: "Superfici (Obsidian)", colors: [
    { name: "Obsidian Base", role: "Sfondo", hex: "#0A0A0F" },
    { name: "Obsidian Panel", role: "Pannello", hex: "#0D0D14" },
    { name: "Obsidian Card", role: "Card", hex: "#12121A" },
    { name: "Obsidian Raised", role: "Rilievo", hex: "#1C1C28" },
  ]},
  { group: "Testo & neutrali", colors: [
    { name: "Text Primary", role: "Testo", hex: "#F0F0F5" },
    { name: "Text Secondary", role: "Testo 2", hex: "#9CA3AF" },
    { name: "Text Muted", role: "Attenuato", hex: "#6B7280" },
    { name: "Text Faint", role: "Tenue", hex: "#374151" },
    { name: "Text Disabled", role: "Disabilitato", hex: "#4B5563" },
    { name: "Teal Ink", role: "Su teal", hex: "#06231F" },
  ]},
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const enrich = (c) => {
  const rgb = hexToRgb(c.hex); const hsl = rgbToHsl(rgb);
  return { ...c, hex: c.hex.toUpperCase(), rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` };
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const groups = PALETTE.map((g) => ({ group: g.group, colors: g.colors.map(enrich) }));
const flat = groups.flatMap((g) => g.colors);

mkdirSync("F:/human2ai-passport/palette", { recursive: true });

// --- JSON ---
writeFileSync("F:/human2ai-passport/palette/human2ai-palette.json", JSON.stringify({ name: "Human2AI", aesthetic: "Obsidian Intelligence", groups }, null, 2));

// --- CSS ---
const css = `:root {\n${flat.map((c) => `  --h2ai-${slug(c.name)}: ${c.hex};`).join("\n")}\n}\n`;
writeFileSync("F:/human2ai-passport/palette/human2ai-palette.css", css);

// --- HTML swatch sheet ---
const htmlGroups = groups.map((g) => `
  <h2>${g.group}</h2>
  <div class="row">
    ${g.colors.map((c) => `
    <div class="sw">
      <div class="chip" style="background:${c.hex}"></div>
      <div class="meta"><b>${c.name}</b><span class="role">${c.role}</span>
        <code>${c.hex}</code><code>${c.rgb}</code><code>${c.hsl}</code></div>
    </div>`).join("")}
  </div>`).join("");
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Human2AI — Palette</title>
<style>
  body{margin:0;background:#0a0a0f;color:#f0f0f5;font-family:Arial,Helvetica,sans-serif;padding:48px}
  h1{font-size:28px;margin:0 0 4px} .sub{color:#6b7280;margin:0 0 32px;letter-spacing:.1em;font-size:12px}
  h2{color:#9ca3af;font-size:13px;letter-spacing:.1em;margin:28px 0 12px;text-transform:uppercase}
  .row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
  .sw{background:#12121a;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden}
  .chip{height:90px} .meta{padding:12px 14px;display:flex;flex-direction:column;gap:2px}
  .meta b{font-size:14px} .role{color:#6b7280;font-size:11px;margin-bottom:6px}
  code{color:#9ca3af;font-size:11px;font-family:monospace}
</style></head><body>
  <h1>Human2AI — Palette</h1><p class="sub">OBSIDIAN INTELLIGENCE</p>
  ${htmlGroups}
</body></html>`;
writeFileSync("F:/human2ai-passport/palette/human2ai-palette.html", html);

// --- PNG (immagine condivisibile) via SVG ---
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const COLS = 4, CW = 300, CH = 150, PAD = 50, GAP = 18, HEAD = 46;
let y = 120; const rects = [];
for (const g of groups) {
  rects.push(`<text x="${PAD}" y="${y}" fill="#9ca3af" font-size="20" font-weight="700" font-family="Arial" letter-spacing="2">${esc(g.group.toUpperCase())}</text>`);
  y += 18;
  for (let i = 0; i < g.colors.length; i++) {
    const c = g.colors[i];
    const col = i % COLS, rowStart = Math.floor(i / COLS);
    const x = PAD + col * (CW + GAP);
    const cy = y + rowStart * (CH + GAP);
    rects.push(`
      <rect x="${x}" y="${cy}" width="${CW}" height="${CH}" rx="14" fill="#12121a" stroke="rgba(255,255,255,0.08)"/>
      <rect x="${x}" y="${cy}" width="${CW}" height="70" rx="14" fill="${c.hex}"/>
      <rect x="${x}" y="${cy+40}" width="${CW}" height="30" fill="${c.hex}"/>
      <text x="${x+16}" y="${cy+96}" fill="#f0f0f5" font-size="17" font-weight="700" font-family="Arial">${esc(c.name)}</text>
      <text x="${x+16}" y="${cy+116}" fill="#6b7280" font-size="12" font-family="Arial">${esc(c.role)}</text>
      <text x="${x+16}" y="${cy+138}" fill="#9ca3af" font-size="13" font-family="monospace">${esc(c.hex)} &#183; ${esc(c.rgb)}</text>`);
  }
  const rows = Math.ceil(g.colors.length / COLS);
  y += rows * (CH + GAP) + HEAD;
}
const H = y + 20;
const W = PAD * 2 + COLS * CW + (COLS - 1) * GAP;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <circle cx="${PAD+13}" cy="56" r="13" fill="#6B21E8"/>
  <text x="${PAD+36}" y="62" fill="#f0f0f5" font-size="26" font-weight="800" font-family="Arial" letter-spacing="3">HUMAN2AI — PALETTE</text>
  <text x="${PAD}" y="92" fill="#6b7280" font-size="14" font-family="Arial" letter-spacing="2">OBSIDIAN INTELLIGENCE</text>
  ${rects.join("")}
</svg>`;
writeFileSync("F:/human2ai-passport/palette/human2ai-palette.svg", svg);
await sharp(Buffer.from(svg)).png().toFile("F:/human2ai-passport/palette/human2ai-palette.png");

console.log(`Esportati ${flat.length} colori in F:/human2ai-passport/palette/ (PNG ${W}x${H}, HTML, JSON, CSS)`);
