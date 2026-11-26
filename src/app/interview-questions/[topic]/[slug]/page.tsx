import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Markdown } from "@/components/devqna/Markdown";
import { CodePanel } from "@/components/devqna/CodePanel";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, graph, ids, webPage } from "@/lib/schema";
import {
  BASE,
  TOPIC_INFO,
  allQuestionParams,
  codeLang,
  findQuestion,
  prevNext,
  questionPath,
  relatedQuestions,
  studyAppPath,
  summary,
  topicPath,
} from "@/lib/question-pages";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ topic: string; slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = allQuestionParams;

const DIFF_CHIP = { Easy: "bg-emerald-300", Medium: "bg-amber-300", Hard: "bg-rose-400" } as const;
const LEVEL = { Easy: "Beginner", Medium: "Intermediate", Hard: "Expert" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic, slug } = await params;
  const q = findQuestion(topic, slug);
  if (!q) return {};
  const label = TOPIC_INFO[q.topic].label;
  // short questions get the topic added, which is what people search for ("... react interview question")
  const title = q.question.length <= 48 ? `${q.question} (${label} Interview Question)` : q.question;
  const description = summary(q);
  const path = questionPath(q);
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialMeta(q.question, description, path, "article"),
  };
}

export default async function QuestionPage({ params }: Props) {
  const { topic, slug } = await params;
  const q = findQuestion(topic, slug);
  if (!q) notFound();

  const label = TOPIC_INFO[q.topic].label;
  const path = questionPath(q);
  const description = summary(q);
  const { prev, next } = prevNext(q);
  const related = relatedQuestions(q);
  const articleId = `${abs(path)}#article`;

  const schema = graph(
    webPage({ path, name: q.question, description, mainEntity: articleId, about: [label] }),
    breadcrumb(path, [
      { name: "Interview questions", path: BASE },
      { name: label, path: topicPath(q.topic) },
      { name: q.question, path },
    ]),
    {
      "@type": "TechArticle",
      "@id": articleId,
      headline: q.question.slice(0, 110),
      description,
      url: abs(path),
      mainEntityOfPage: { "@id": ids.page(path) },
      about: { "@type": "Thing", name: label },
      keywords: [`${label} interview questions`, `${label} interview`, q.difficulty.toLowerCase()].join(", "),
      proficiencyLevel: LEVEL[q.difficulty],
      educationalLevel: LEVEL[q.difficulty],
      learningResourceType: "Interview question",
      inLanguage: "en",
      isAccessibleForFree: true,
      author: { "@id": ids.organization },
      publisher: { "@id": ids.organization },
      isPartOf: { "@id": ids.website },
    }
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8ec] text-slate-900">
      <JsonLd data={schema} />
      <SiteHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-5 pt-8 sm:pt-12 pb-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          <Breadcrumbs
            trail={[
              { name: "Interview questions", href: BASE },
              { name: label, href: topicPath(q.topic) },
              { name: q.question },
            ]}
          />
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold">
            <Link href={topicPath(q.topic)} className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-white hover:bg-yellow-100">
              {label}
            </Link>
            <span className={cn("px-2.5 py-1 rounded-full border-2 border-[#0b1020]", DIFF_CHIP[q.difficulty])}>{q.difficulty}</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.12]">{q.question}</h1>

          <div className="mt-6 text-[17px] leading-relaxed text-slate-800">
            <Markdown text={q.answer} />
          </div>

          {q.code && (
            <section className="mt-8" aria-label="Code example">
              <CodePanel code={q.code} lang={codeLang(q)} title="Code example" />
            </section>
          )}

          <div className="mt-10 rounded-2xl border-2 border-[#0b1020] bg-yellow-300 p-5 sm:p-6 shadow-[5px_5px_0_#0b1020] flex flex-col sm:flex-row sm:items-center gap-4">
            <GraduationCap className="w-9 h-9 shrink-0" />
            <div className="flex-1">
              <p className="font-extrabold text-lg leading-tight">Practice this question</p>
              <p className="text-sm mt-1">Open it in the study app to track progress, take notes, listen to the answer and work through the rest of the {label} set.</p>
            </div>
            <Link
              href={studyAppPath(q)}
              className="h-11 px-5 rounded-xl bg-[#0b1020] text-white font-extrabold flex items-center justify-center gap-2 shrink-0 hover:bg-[#2b4bff] transition-colors"
            >
              Open in study app <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <nav aria-label="More questions" className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={questionPath(prev)} className="p-4 rounded-xl border-2 border-[#0b1020] bg-white hover:bg-yellow-50">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Previous</span>
                <span className="mt-1 block font-bold leading-snug">{prev.question}</span>
              </Link>
            ) : <span className="hidden sm:block" />}
            {next && (
              <Link href={questionPath(next)} className="p-4 rounded-xl border-2 border-[#0b1020] bg-white hover:bg-yellow-50 sm:text-right">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1 sm:justify-end">Next <ArrowRight className="w-3.5 h-3.5" /></span>
                <span className="mt-1 block font-bold leading-snug">{next.question}</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className="lg:sticky lg:top-24 self-start">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Related {label} questions</h2>
          <ul className="mt-3 space-y-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={questionPath(r)} className="block p-3 rounded-xl border-2 border-[#0b1020]/15 bg-white text-sm font-semibold leading-snug hover:border-[#0b1020] hover:bg-yellow-50">
                  {r.question}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={topicPath(q.topic)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#2b4bff]">
            All {label} questions <ArrowRight className="w-4 h-4" />
          </Link>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
