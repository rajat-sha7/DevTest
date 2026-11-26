import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SITE, socialMeta } from "@/lib/site";
import { breadcrumb, graph, ids, webPage } from "@/lib/schema";
import { ALL_QUESTIONS, TOPICS } from "@/lib/questions";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";

const PATH = "/about";
const title = "About";
const seoTitle = "About DevQnA";
const description =
  "DevQnA is a free frontend interview prep site: clear answers with runnable code for Next.js, React, JavaScript and HTML/CSS, timed coding tasks and an in-browser playground. No account needed.";

export const metadata: Metadata = {
  title: seoTitle,
  description,
  alternates: { canonical: PATH },
  ...socialMeta(`${seoTitle} | ${SITE.name}`, description, PATH),
};

const INK = "#0b1020";
const shadow = (n = 5) => ({ boxShadow: `${n}px ${n}px 0 ${INK}` });

export default function AboutPage() {
  const total = ALL_QUESTIONS.length;
  const stats = [
    { n: total, label: "interview questions", bg: "bg-white" },
    { n: TOPICS.length, label: "topics, easy to hard", bg: "bg-sky-300" },
    { n: CODING_ROUND_QUESTIONS.length, label: "timed coding tasks", bg: "bg-pink-300" },
    { n: 0, label: "accounts or sign-ups needed", bg: "bg-yellow-300" },
  ];

  const offers = [
    {
      title: "Questions & Answers",
      href: "/questions-answers",
      body: "Every answer starts with a one-line summary, then explains the why, the gotchas and an interview tip, with a code example you can run.",
      bg: "bg-sky-300",
    },
    {
      title: "Coding round",
      href: "/coding-round",
      body: "Timed, hands-on Next.js and React tasks like the ones used in live screening calls, with requirements and a worked solution.",
      bg: "bg-pink-300",
    },
    {
      title: "Playground",
      href: "/playground",
      body: "Run JavaScript, TypeScript and HTML/CSS right in the browser. Open any runnable example from an answer and change it.",
      bg: "bg-violet-300",
    },
  ];

  const principles = [
    ["Short answer first", "You should be able to say the core idea in one breath, then go deeper if the interviewer asks."],
    ["Code you can run", "Reading about closures is not the same as breaking one. Examples are meant to be edited."],
    ["Current, not legacy", "Answers cover today's tools: the App Router, React 19, modern CSS like :has(), container queries and nesting."],
    ["Private by default", "No account and no tracking of your answers. Progress, bookmarks and notes stay in your own browser."],
  ];

  const schema = graph(
    webPage({ path: PATH, name: seoTitle, description, type: "AboutPage", mainEntity: ids.organization }),
    breadcrumb(PATH, [{ name: title, path: PATH }])
  );

  return (
    <div className="min-h-screen bg-[#fff8ec] text-slate-900">
      <JsonLd data={schema} />
      <AnnouncementBar />

      <header data-site-header className="sticky top-0 z-20 bg-[#2b4bff]/95 backdrop-blur border-b-2 border-[#0b1020] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <LogoMark />
            DevQnA
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm sm:text-[15px] font-medium">
            <Link href="/coding-round" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 hidden sm:block">Coding round</Link>
            <Link href="/playground" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 hidden sm:block">Playground</Link>
            <Link
              href="/questions-answers"
              className="ml-1 px-3 sm:px-4 py-2 rounded-lg bg-yellow-300 whitespace-nowrap text-[#0b1020] font-bold border-2 border-[#0b1020] hover:-translate-y-0.5 transition-transform"
              style={shadow(3)}
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* intro */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 pt-12 sm:pt-16 pb-10">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-slate-500">
            <Link href="/" className="hover:text-[#0b1020]">Home</Link> <span aria-hidden>/</span>{" "}
            <span aria-current="page" className="text-[#0b1020]">About</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.04] max-w-3xl">
            Interview prep that explains the <span className="bg-yellow-300 px-1.5 border-2 border-[#0b1020] rounded-lg">why</span>.
          </h1>
          <p className="mt-5 text-lg md:text-xl text-slate-700 max-w-2xl leading-relaxed">
            {SITE.name} is a free place to practice frontend interview questions. It covers{" "}
            {TOPICS.map((t) => t.label).join(", ").replace(/, ([^,]*)$/, " and $1")}, with clear answers, runnable code,
            timed coding tasks and a playground to try things out.
          </p>

          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl border-2 border-[#0b1020] p-4 sm:p-5 ${s.bg}`} style={shadow(4)}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">{s.n}</dd>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* what's inside */}
        <section className="border-y-2 border-[#0b1020] bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 py-12 md:py-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">What you get</h2>
            <div className="mt-8 grid md:grid-cols-3 gap-5">
              {offers.map((o) => (
                <Link
                  key={o.title}
                  href={o.href}
                  className={`group flex flex-col rounded-2xl border-2 border-[#0b1020] p-5 sm:p-6 transition-all hover:-translate-x-1 hover:-translate-y-1 ${o.bg}`}
                  style={shadow(5)}
                >
                  <h3 className="text-xl font-extrabold">{o.title}</h3>
                  <p className="mt-2 flex-1 leading-relaxed text-slate-800">{o.body}</p>
                  <span className="mt-5 font-bold">
                    Open <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* principles */}
        <section className="max-w-6xl mx-auto px-4 sm:px-5 py-12 md:py-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How we write answers</h2>
          <ul className="mt-8 grid sm:grid-cols-2 gap-5">
            {principles.map(([h, b], i) => (
              <li key={h} className="flex gap-4 rounded-2xl border-2 border-[#0b1020] bg-white p-5" style={shadow(4)}>
                <span className="w-10 h-10 shrink-0 rounded-full bg-yellow-300 border-2 border-[#0b1020] font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{h}</h3>
                  <p className="mt-1 text-slate-700 leading-relaxed">{b}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* privacy */}
        <section className="bg-[#0b1020] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 py-12 md:py-16 grid md:grid-cols-[1fr_1.3fr] gap-8 items-start">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your data stays with you</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                There is no account to create. What you mark as mastered, bookmark or write in notes is saved in your
                browser&apos;s local storage on this device, and is never sent to a server.
              </p>
              <p>
                Clearing your browser data removes it, so the Q&amp;A page lets you <strong className="text-white">export a backup</strong> as a
                JSON file and import it again on any device.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-yellow-300 border-b-2 border-[#0b1020]">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 py-12 md:py-16 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready when you are.</h2>
              <p className="mt-2 text-lg font-medium">{total} questions, from warm-ups to interview-level depth.</p>
            </div>
            <Link
              href="/questions-answers"
              className="shrink-0 px-7 py-4 rounded-xl text-center bg-[#0b1020] text-white text-lg font-extrabold transition-transform hover:-translate-y-1"
              style={{ boxShadow: "5px 5px 0 #2b4bff" }}
            >
              Start practicing →
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#0b1020] text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8 flex flex-col sm:flex-row sm:justify-between gap-3 text-sm">
          <span>© {new Date().getFullYear()} {SITE.name} · devqna.online</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/questions-answers" className="hover:text-white">Questions</Link>
            <Link href="/coding-round" className="hover:text-white">Coding round</Link>
            <Link href="/playground" className="hover:text-white">Playground</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
