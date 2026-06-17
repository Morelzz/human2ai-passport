import { listPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

// ── Feed RSS del blog (/feed.xml) ──
// Serve a: indicizzazione più rapida, aggregatori di notizie, lettori RSS,
// e in futuro automazioni di distribuzione (newsletter, social).
// Route handler statico-rigenerato: si aggiorna a ogni deploy/build.

export const revalidate = 3600; // riallineato ogni ora

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const BASE = siteUrl();
  const posts = await listPosts();

  const items = posts
    .map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date + "T15:00:00+02:00").toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
      <category>${escapeXml(p.category)}</category>${p.cover ? `\n      <enclosure url="${escapeXml(p.cover)}" type="image/png" length="0" />` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SEMBLIC, il blog</title>
    <link>${BASE}/blog</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>AI, diritto d'immagine, consenso e provenienza: la voce di SEMBLIC sull'era dei volti generati.</description>
    <language>it-IT</language>
    <image>
      <url>${BASE}/logo-shield.png</url>
      <title>SEMBLIC, il blog</title>
      <link>${BASE}/blog</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
