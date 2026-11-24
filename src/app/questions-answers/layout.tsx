import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, freeOffer, graph, ids, webPage } from "@/lib/schema";
import { ALL_QUESTIONS, TOPICS } from "@/lib/questions";

const title = "Questions & Answers";
const seoTitle = "Frontend Interview Questions & Answers";
const description =
  `${ALL_QUESTIONS.length.toLocaleString("en-US")} frontend interview questions for Next.js, React, React Hooks, JavaScript and HTML/CSS. Filter by difficulty, read clear answers and run the code in your browser.`;
const keywords = ["frontend interview questions", "react interview questions", "next.js interview questions", "javascript interview questions", "react hooks interview questions", "html css interview questions", "interview questions with answers"];

export const metadata: Metadata = {
  title: seoTitle,
  description,
  keywords,
  alternates: { canonical: "/questions-answers" },
  ...socialMeta(`${seoTitle} | ${SITE.name}`, description, "/questions-answers"),
};

const PATH = "/questions-answers";
const resourceId = `${abs(PATH)}#questions`;

const schema = graph(
  webPage({ path: PATH, name: seoTitle, description, type: "CollectionPage", mainEntity: resourceId, about: TOPICS.map((t) => t.label) }),
  breadcrumb(PATH, [{ name: title, path: PATH }]),
  {
    "@type": "LearningResource",
    "@id": resourceId,
    name: "Frontend interview questions and answers",
    description:
      "Self-paced practice for Next.js, React, React Hooks, JavaScript and HTML/CSS interviews, from easy warm-ups to hard questions, each with a clear answer and runnable code.",
    url: abs(PATH),
    learningResourceType: ["Practice questions", "Interview preparation"],
    educationalLevel: ["Beginner", "Intermediate", "Advanced"],
    audience: { "@type": "Audience", audienceType: "Frontend developers preparing for technical interviews" },
    teaches: TOPICS.map((t) => t.label),
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: freeOffer(),
    provider: { "@id": ids.organization },
    publisher: { "@id": ids.organization },
    hasPart: TOPICS.map((t) => ({
      "@type": "LearningResource",
      name: `${t.label} interview questions`,
      url: `${abs(PATH)}?topic=${t.id}`,
      learningResourceType: "Practice questions",
      teaches: t.label,
      isAccessibleForFree: true,
      numberOfItems: ALL_QUESTIONS.filter((q) => q.topic === t.id).length,
    })),
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
