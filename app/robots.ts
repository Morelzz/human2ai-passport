import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const BASE = siteUrl();

// Robots: tutto pubblico tranne API e area account; sitemap dichiarata.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
