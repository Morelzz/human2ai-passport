// AUDIT SCHEMA — confronta cio' che il CODICE usa (tabelle/colonne/bucket
// nelle chiamate supabase-js) con cio' che ESISTE davvero su Supabase,
// sondando ogni colonna dal vivo (l'OpenAPI di PostgREST puo' essere stantia).
// Nato dal bug ownership.sql: una migrazione mai applicata faceva fallire
// IN SILENZIO la query del hub creatore. Questo script stana tutta la classe.
//
// Uso:  node --env-file=.env.local scripts/audit-db-schema.mjs
// Esce con codice 1 se trova mancanze (usabile come gate pre-deploy).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Mancano le env Supabase"); process.exit(1); }
const db = createClient(URL_, KEY);

// ---------- 1. Cio' che il codice usa ----------
const ROOTS = ["app", "lib", "components", "worker"];
const used = {};            // tabella -> Map(colonna -> Set(file))
const tablesSeen = new Map(); // tabella -> Set(file)
const bucketsSeen = new Map();// bucket  -> Set(file)
const touch = (table, col, file) => {
  if (!col || col === "*" || col === "id") return; // id c'e' sempre, * non e' una colonna
  used[table] ??= new Map();
  if (!used[table].has(col)) used[table].set(col, new Set());
  used[table].get(col).add(file);
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

// Spezza una stringa .select() rispettando le parentesi delle relazioni annidate
function splitTop(s) {
  const parts = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((x) => x.trim());
}

function parseSelect(table, sel, file) {
  for (let tok of splitTop(sel)) {
    tok = tok.trim();
    if (!tok) continue;
    const rel = tok.match(/^([a-zA-Z0-9_]+)(?:!.+?)?\(([\s\S]*)\)$/); // relazione annidata: tabella(cols)
    if (rel) { tablesSeen.set(rel[1], (tablesSeen.get(rel[1]) ?? new Set()).add(file)); parseSelect(rel[1], rel[2], file); continue; }
    if (tok.includes(":")) tok = tok.split(":").pop().trim(); // alias:colonna
    tok = tok.replace(/::\w+$/, "").trim(); // cast
    if (/^[a-zA-Z0-9_]+$/.test(tok)) touch(table, tok, file);
  }
}

// Toglie i letterali stringa (con escape) per non leggere parole nei testi
function stripStrings(s) {
  return s.replace(/`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
}

const files = ROOTS.flatMap((r) => { try { return walk(join(process.cwd(), r)); } catch { return []; } });
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const short = f.replace(process.cwd(), "").replace(/\\/g, "/").replace(/^\//, "");
  const re = /\.from\(\s*["'`]([a-zA-Z0-9_-]+)["'`]\s*\)/g;
  let m;
  const hits = [];
  while ((m = re.exec(src))) {
    // .storage.from("bucket") e' un BUCKET, non una tabella
    const before = src.slice(Math.max(0, m.index - 40), m.index);
    hits.push({ table: m[1], at: m.index, isBucket: /storage\s*\.?\s*$/.test(before) || /\.storage\b[^;]*$/.test(before) });
  }
  for (let i = 0; i < hits.length; i++) {
    const { table, at, isBucket } = hits[i];
    if (isBucket) { bucketsSeen.set(table, (bucketsSeen.get(table) ?? new Set()).add(short)); continue; }
    tablesSeen.set(table, (tablesSeen.get(table) ?? new Set()).add(short));
    const chain = src.slice(at, hits[i + 1]?.at ?? at + 1200);
    for (const sm of chain.matchAll(/\.select\(\s*["'`]([\s\S]*?)["'`]/g)) parseSelect(table, sm[1], short);
    for (const fm of chain.matchAll(/\.(?:eq|neq|is|gt|gte|lt|lte|like|ilike|contains|order)\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g)) {
      if (!fm[1].includes(".")) touch(table, fm[1], short); // "rel.col" ambiguo: skip
    }
    for (const im of chain.matchAll(/\.(?:insert|update|upsert)\(\s*(?:\[\s*)?\{([\s\S]*?)\}/g)) {
      for (const km of stripStrings(im[1]).matchAll(/(?:^|[,{\s(])([a-zA-Z0-9_]+)\s*:/g)) touch(table, km[1], short);
    }
  }
}

// ---------- 2. Sonda dal vivo: ogni colonna usata esiste davvero? ----------
let problems = 0;
console.log(`Codice: ${tablesSeen.size} tabelle e ${bucketsSeen.size} bucket usati in ${files.length} file\n`);

for (const [table, where] of [...tablesSeen.entries()].sort()) {
  const head = await db.from(table).select("id", { head: true, count: "exact" }).limit(1);
  if (head.error && /find the table|does not exist|relation/i.test(head.error.message)) {
    problems++;
    console.log(`❌ TABELLA MANCANTE: "${table}"  (usata in: ${[...where].join(", ")})`);
    continue;
  }
  for (const [col, files2] of [...(used[table] ?? new Map()).entries()].sort()) {
    const probe = await db.from(table).select(col, { head: true }).limit(1);
    if (probe.error && /column/i.test(probe.error.message)) {
      problems++;
      console.log(`❌ COLONNA MANCANTE: ${table}.${col}  (usata in: ${[...files2].join(", ")})`);
    }
  }
}

// ---------- 3. Bucket storage ----------
const { data: bks } = await db.storage.listBuckets();
const have = new Set((bks ?? []).map((b) => b.name));
for (const [bucket, where] of [...bucketsSeen.entries()].sort()) {
  if (!have.has(bucket)) {
    problems++;
    console.log(`❌ BUCKET MANCANTE: "${bucket}"  (usato in: ${[...where].join(", ")})`);
  }
}

if (!problems) console.log("✅ Nessuna discrepanza: tutto cio' che il codice tocca esiste su Supabase.");
else console.log(`\n${problems} mancanze trovate.`);
process.exit(problems ? 1 : 0);
