import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, freeOffer, graph, ids, webPage } from "@/lib/schema";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";

const title = "Coding round";
const seoTitle = "Next.js & React Coding Round Practice";
const description =
  "Timed, hands-on Next.js and React coding tasks like the ones used in live screening interviews, each with requirements and a worked solution.";
const keywords = ["react coding interview", "next.js coding challenge", "frontend coding round", "live coding interview practice", "react machine coding round"];

export const metadata: Metadata = {
  title: seoTitle,
  description,
  keywords,
  alternates: { canonical: "/coding-round" },
  ...socialMeta(`${seoTitle} | ${SITE.name}`, description, "/coding-round"),
};

const PATH = "/coding-round";
const resourceId = `${abs(PATH)}#tasks`;

const schema = graph(
  webPage({ path: PATH, name: seoTitle, description, mainEntity: resourceId, about: ["Next.js", "React"] }),
  breadcrumb(PATH, [{ name: title, path: PATH }]),
  {
    "@type": "LearningResource",
    "@id": resourceId,
    name: "Next.js and React coding round",
    description,
    url: abs(PATH),
    learningResourceType: ["Coding exercise", "Interview preparation"],
    educationalLevel: ["Intermediate", "Advanced"],
    interactivityType: "active",
    audience: { "@type": "Audience", audienceType: "Frontend developers preparing for live coding interviews" },
    teaches: ["Next.js", "React"],
    numberOfItems: CODING_ROUND_QUESTIONS.length,
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: freeOffer(),
    provider: { "@id": ids.organization },
    publisher: { "@id": ids.organization },
  }
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
