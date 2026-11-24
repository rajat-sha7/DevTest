import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";
import { docData } from "@/app/docData";

/**
 * Generated once at build time. `lastModified` is the latest git commit that
 * touched the files behind each page, so it only changes when the page does.
 * If git history is unavailable at build (e.g. a shallow source upload),
 * lastmod is omitted rather than faked with the build time.
 */
export const dynamic = "force-static";

const SHARED = ["src/app/layout.tsx", "src/lib/site.ts", "src/lib/schema.ts"];
const QUESTIONS = ["src/lib/questions.ts", "src/lib/answers", "content/answers"];

function lastCommit(paths: string[]): Date | undefined {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}

type Entry = MetadataRoute.Sitemap[number];

function page(
  path: string,
  sources: string[],
  priority: number,
  changeFrequency: Entry["changeFrequency"],
  images?: string[]
): Entry {
  const lastModified = lastCommit([...sources, ...SHARED]);
  return {
    url: abs(path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    ...(images?.length ? { images } : {}),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    page("/", ["src/app/page.tsx", "src/components/landing", ...QUESTIONS], 1, "weekly", [abs("/opengraph-image")]),
    page("/questions-answers", ["src/app/questions-answers", "src/components/devqna", ...QUESTIONS], 0.9, "weekly"),
    page("/coding-round", ["src/app/coding-round", "src/lib/coding-round-questions.ts", "src/lib/coding-round-content.ts"], 0.8, "monthly"),
    page("/playground", ["src/app/playground", "src/lib/playground"], 0.8, "monthly"),
    page("/docbar", ["src/app/docbar", "src/app/docData.ts"], 0.5, "monthly"),
    ...Object.keys(docData).map((topic) =>
      page(`/docbar/${encodeURIComponent(topic)}`, ["src/app/docbar", "src/app/docData.ts"], 0.4, "monthly")
    ),
  ];
}
