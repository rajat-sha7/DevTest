import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, graph, webPage } from "@/lib/schema";
import { ALL_QUESTIONS } from "@/lib/questions";
import { BASE, TOPIC_IDS, TOPIC_INFO, questionPath, questionsIn, topicPath } from "@/lib/question-pages";

const total = ALL_QUESTIONS.length.toLocaleString("en-US");
const title = "Frontend Interview Questions and Answers";
const description = `${total} frontend interview questions with detailed answers and code examples, covering Next.js, React, React Hooks, JavaScript and HTML/CSS, from easy to hard.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: BASE },
  ...socialMeta(`${title} | ${SITE.name}`, description, BASE),
};

export default function InterviewQuestionsIndex() {
  const listId = `${abs(BASE)}#topics`;
  const schema = graph(
    webPage({ path: BASE, name: title, description, type: "CollectionPage", mainEntity: listId }),
    breadcrumb(BASE, [{ name: "Interview questions", path: BASE }]),
    {
      "@type": "ItemList",
      "@id": listId,
      name: "Interview question topics",
      itemListElement: TOPIC_IDS.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${TOPIC_INFO[t].label} interview questions`,
        url: abs(topicPath(t)),
      })),
    }
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8ec] text-slate-900">
      <JsonLd data={schema} />
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-5 pt-10 sm:pt-14 pb-16">
        <Breadcrumbs trail={[{ name: "Interview questions" }]} />
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-3xl">{title}</h1>
        <p className="mt-4 text-lg text-slate-700 max-w-2xl leading-relaxed">
          {total} questions with clear, current answers and a code example for each. Pick a topic to browse, or open the{" "}
          <Link href="/questions-answers" className="font-semibold text-[#2b4bff] underline underline-offset-2">study app</Link>{" "}
          to practice with progress tracking.
        </p>

        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {TOPIC_IDS.map((t) => {
            const qs = questionsIn(t);
            return (
              <li key={t} className="rounded-2xl border-2 border-[#0b1020] bg-white p-6 shadow-[5px_5px_0_#0b1020] flex flex-col">
                <h2 className="text-2xl font-extrabold">
                  <Link href={topicPath(t)} className="hover:text-[#2b4bff]">
                    {TOPIC_INFO[t].label} interview questions
                  </Link>
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">{qs.length} questions</p>
                <p className="mt-3 text-slate-700 leading-relaxed">{TOPIC_INFO[t].blurb}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {qs.slice(0, 4).map((q) => (
                    <li key={q.id}>
                      <Link href={questionPath(q)} className="hover:text-[#2b4bff] hover:underline underline-offset-2">
                        {q.question}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={topicPath(t)} className="mt-5 self-start inline-flex items-center gap-1.5 font-extrabold text-[#2b4bff] hover:gap-2.5 transition-all">
                  All {qs.length} {TOPIC_INFO[t].label} questions <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
