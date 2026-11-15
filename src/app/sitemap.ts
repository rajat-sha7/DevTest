import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { docData } from "@/app/docData";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/questions-answers", 0.9, "weekly"),
    page("/coding-round", 0.8),
    page("/playground", 0.8),
    page("/docbar", 0.5),
    ...Object.keys(docData).map((t) => page(`/docbar/${encodeURIComponent(t)}`, 0.4)),
  ];
}
