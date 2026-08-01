import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/blog";
import { getPublicAvatars } from "@/lib/registry";
import { siteUrl } from "@/lib/site";

// Sitemap: rotte pubbliche statiche + articoli del blog (dai file) + passaporti
// pubblici (dal registro): sono le pagine piu' numerose del sito, ognuna con
// metadata e og:image dedicati.
const BASE = siteUrl();

// Le pagine legali cambiano di rado: segnale piu' credibile per i motori.
const YEARLY = new Set(["/privacy", "/termini", "/cookie"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/match", "/catalogo", "/scansione", "/scansione/prenota", "/prezzi", "/trasparenza", "/verify", "/sviluppatori", "/faq", "/blog", "/academy", "/partner", "/studio", "/enterprise", "/enterprise/register", "/contatti", "/ward", "/tutela", "/report", "/badge", "/signup", "/privacy", "/termini", "/cookie"]
    .map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: (YEARLY.has(p) ? "yearly" : "weekly") as "yearly" | "weekly",
      priority: p === "" ? 1 : 0.7,
    }));

  const posts = (await listPosts()).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Passaporti pubblici (solo approved, mai i protection-only: getPublicAvatars
  // applica gia' il filtro default-deny).
  let passports: MetadataRoute.Sitemap = [];
  try {
    passports = (await getPublicAvatars()).map((a) => ({
      url: `${BASE}/passport/${a.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB non raggiungibile (es. build senza env): la sitemap resta valida senza.
  }

  return [...staticRoutes, ...posts, ...passports];
}
