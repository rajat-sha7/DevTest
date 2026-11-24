import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name} - ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fff8ec",
    theme_color: SITE.themeColor,
    categories: ["education", "productivity", "developer tools"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Questions & Answers", short_name: "Q&A", url: "/questions-answers", description: "Practice interview questions by topic" },
      { name: "Coding round", short_name: "Coding", url: "/coding-round", description: "Timed Next.js and React tasks" },
      { name: "Playground", short_name: "Playground", url: "/playground", description: "Run JS, TS and HTML/CSS" },
    ],
  };
}
