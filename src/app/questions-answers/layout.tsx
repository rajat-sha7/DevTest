import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";

const title = "Questions & Answers";
const description =
  "Browse frontend interview questions for Next.js, React, React Hooks, JavaScript and HTML/CSS. Filter by difficulty, read clear answers and run the code.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/questions-answers" },
  ...socialMeta(`${title} | ${SITE.name}`, description, "/questions-answers"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": abs("/questions-answers"),
              url: abs("/questions-answers"),
              name: title,
              description,
              isPartOf: { "@id": abs("/#website") },
              inLanguage: "en",
            },
            {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE.name, item: abs("/") },
          { "@type": "ListItem", position: 2, name: "Questions & Answers", item: abs("/questions-answers") },
        ],
      },
            {
              "@type": "Course",
              name: "Frontend interview questions",
              description:
                "Self-paced practice for Next.js, React, JavaScript and HTML/CSS interviews, from easy warm-ups to hard questions.",
              provider: { "@id": abs("/#organization") },
              isAccessibleForFree: true,
              inLanguage: "en",
              educationalLevel: "Beginner to advanced",
              about: ["Next.js", "React", "React Hooks", "JavaScript", "HTML", "CSS"],
              hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "PT0S" },
            },
          ],
        }}
      />
      {children}
    </>
  );
}
