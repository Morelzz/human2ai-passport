import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/blog";

// Sitemap: rotte pubbliche statiche + articoli del blog (letti dai file).
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/match", "/catalogo", "/scansione", "/scansione/prenota", "/prezzi", "/trasparenza", "/verify", "/sviluppatori", "/faq", "/blog", "/academy", "/partner", "/studio", "/enterprise", "/contatti", "/privacy", "/termini", "/cookie"]
    .map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));

  const posts = (await listPosts()).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
