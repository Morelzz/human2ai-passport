import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// ──────────────────────────────────────────────────────────────────────────
// A3 — BLOG su file (EXPANSION_V3). NIENTE CMS: un articolo = un file .mdx in
// content/blog/, commit, online. Il filename (senza estensione) è lo slug.
// Frontmatter atteso:
//   title, description, date (YYYY-MM-DD), author?, tags? (lista)
// Il corpo è markdown (titoli, liste, citazioni, link, codice). SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

const BLOG_DIR = join(process.cwd(), "content", "blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  author: string;
  tags: string[];
  /** Categoria editoriale (es. "Regolamentazione", "Finanza", "Politica"). */
  category: string;
  /** Percorso copertina (es. /blog/slug-cover.jpg in public/). Vuoto = niente cover. */
  cover: string;
  /** Testo alternativo della copertina (accessibilità). */
  coverAlt: string;
}

export interface Post extends PostMeta {
  html: string; // corpo renderizzato (contenuto fidato: vive nel repo)
}

function toMeta(slug: string, data: Record<string, unknown>): PostMeta {
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? "").slice(0, 10),
    author: String(data.author ?? "Redazione HUMAN2AI"),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    category: String(data.category ?? "AI & Società"),
    cover: String(data.cover ?? ""),
    coverAlt: String(data.coverAlt ?? data.title ?? ""),
  };
}

/** Tutti gli articoli (solo metadati), dal più recente. [] se la cartella manca. */
export async function listPosts(): Promise<PostMeta[]> {
  let files: string[];
  try {
    files = (await readdir(BLOG_DIR)).filter((f) => /\.(mdx?|markdown)$/i.test(f));
  } catch {
    return [];
  }
  const posts: PostMeta[] = [];
  for (const f of files) {
    try {
      const raw = await readFile(join(BLOG_DIR, f), "utf8");
      const { data } = matter(raw);
      posts.push(toMeta(f.replace(/\.(mdx?|markdown)$/i, ""), data));
    } catch {
      /* file malformato: saltato */
    }
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** Un articolo completo (metadati + HTML). null se non esiste. */
export async function getPost(slug: string): Promise<Post | null> {
  // Lo slug arriva dall'URL: niente path traversal.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  for (const ext of [".mdx", ".md", ".markdown"]) {
    try {
      const raw = await readFile(join(BLOG_DIR, slug + ext), "utf8");
      const { data, content } = matter(raw);
      const html = await marked.parse(content, { gfm: true, breaks: false });
      return { ...toMeta(slug, data), html };
    } catch {
      /* prova estensione successiva */
    }
  }
  return null;
}
