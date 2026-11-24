import type { MetadataRoute } from "next";
import { SITE, abs } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/_favicon_test.html", "/api/"] }],
    sitemap: abs("/sitemap.xml"),
    host: SITE.url,
  };
}
