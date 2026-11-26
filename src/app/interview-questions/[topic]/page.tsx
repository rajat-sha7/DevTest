import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, graph, webPage } from "@/lib/schema";
import { BASE, DIFFICULTIES, TOPIC_IDS, TOPIC_INFO, isTopic, questionPath, questionsIn, topicPath } from "@/lib/question-pages";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ topic: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => TOPIC_IDS.map((topic) => ({ topic }));

const DIFF_CHIP = { Easy: "bg-emerald-300", Medium: "bg-amber-300", Hard: "bg-rose-400" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params;
  if (!isTopic(topic)) return {};
  const { label, blurb } = TOPIC_INFO[topic];
  const count = questionsIn(topic).length;
  const title = `${count} ${label} Interview Questions and Answers`;
  const path = topicPath(topic);
  return {
    title,
    description: `${blurb} Detailed answers with code, from easy to hard.`.slice(0, 300),
    alternates: { canonical: path },
    ...socialMeta(`${title} | ${SITE.name}`, blurb, path),
  };
}

export default async function TopicPage({ params }: Props) {
  const { topic } = await params;
  if (!isTopic(topic)) notFound();
  const { label, blurb } = TOPIC_INFO[topic];
  const qs = questionsIn(topic);
  const path = topicPath(topic);
  const title = `${label} interview questions and answers`;
  const listId = `${abs(path)}#questions`;

  const schema = graph(
    webPage({ path, name: title, description: blurb, type: "CollectionPage", mainEntity: listId, about: [label] }),
    breadcrumb(path, [
      { name: "Interview questions", path: BASE },
      { name: label, path },
    ]),
    {
      "@type": "ItemList",
      "@id": listId,
      name: title,
      numberOfItems: qs.length,
      itemListElement: qs.map((q, i) => ({ "@type": "ListItem", position: i + 1, name: q.question, url: abs(questionPath(q)) })),
    }
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8ec] text-slate-900">
      <JsonLd data={schema} />
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-5 pt-10 sm:pt-14 pb-16">
        <Breadcrumbs trail={[{ name: "Interview questions", href: BASE }, { name: label }]} />
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-3xl">
          {qs.length} {label} interview questions and answers
        </h1>
        <p className="mt-4 text-lg text-slate-700 max-w-2xl leading-relaxed">{blurb}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/questions-answers?topic=${topic}`}
            className="h-11 px-5 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold flex items-center shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform"
          >
            Practice {label} in the study app
          </Link>
          <nav aria-label="Jump to difficulty" className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <a key={d} href={`#${d.toLowerCase()}`} className="h-11 px-4 rounded-xl border-2 border-[#0b1020] bg-white font-bold flex items-center hover:bg-yellow-100">
                {d} ({qs.filter((q) => q.difficulty === d).length})
              </a>
            ))}
          </nav>
        </div>

        {DIFFICULTIES.map((d) => {
          const group = qs.filter((q) => q.difficulty === d);
          if (!group.length) return null;
          return (
            <section key={d} id={d.toLowerCase()} className="mt-12 scroll-mt-24">
              <h2 className="flex items-center gap-3 text-2xl font-extrabold">
                <span className={cn("px-3 py-1 rounded-full border-2 border-[#0b1020] text-sm", DIFF_CHIP[d])}>{d}</span>
                {group.length} {d.toLowerCase()} {label} questions
              </h2>
              <ol className="mt-4 grid gap-2 md:grid-cols-2">
                {group.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={questionPath(q)}
                      className="h-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#0b1020]/15 bg-white hover:border-[#0b1020] hover:bg-yellow-50 transition-colors"
                    >
                      <span className="font-code text-xs font-bold text-slate-400 mt-0.5 tabular-nums w-8 shrink-0">{qs.indexOf(q) + 1}</span>
                      <span className="font-semibold leading-snug">{q.question}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
