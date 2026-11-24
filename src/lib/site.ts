import type { Metadata } from "next";

/**
 * Single source of truth for brand + SEO values.
 * Set NEXT_PUBLIC_SITE_URL in production (defaults to https://devqna.online)
 * so canonical URLs, the sitemap and social cards point at the real site.
 */
export const SITE = {
  name: "DevQnA",
  tagline: "Frontend interview prep",
  title: "DevQnA | Frontend interview prep",
  description:
    "Practice Next.js, React, JavaScript and HTML/CSS interview questions with clear answers and runnable code, plus timed coding tasks and a live JavaScript, TypeScript and HTML playground. Free, no account needed.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://devqna.online").replace(/\/+$/, ""),
  locale: "en_US",
  themeColor: "#2b4bff",
  keywords: [
    "frontend interview questions",
    "react interview questions",
    "next.js interview questions",
    "javascript interview questions",
    "html css interview questions",
    "react hooks",
    "coding interview practice",
    "javascript playground",
    "typescript playground",
  ],
} as const;

export const abs = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Page-level `openGraph` / `twitter` replace the root ones instead of merging,
 * so every page builds its social tags (and share image) through this helper.
 */
export function socialMeta(
  title: string,
  description: string,
  path: string,
  type: "website" | "article" = "website"
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type,
      title,
      description,
      url: path,
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE.name} - ${SITE.tagline}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/twitter-image"] },
  };
}
