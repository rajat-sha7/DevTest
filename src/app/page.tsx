import Link from "next/link";
import { ALL_QUESTIONS, TOPICS, type Question } from "@/lib/questions";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";
import { cleanTitle } from "@/lib/coding-round-content";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs } from "@/lib/site";
import { freeOffer, graph, ids, ogImage, webPage } from "@/lib/schema";
import { Hero3D } from "@/components/landing/hero3d";
import { CountUp, HeroCarousel, Marquee, Reveal, type HeroItem } from "@/components/landing/motion";
import { DifficultyMeter, Steps, type LevelStat } from "@/components/landing/how-it-works";

const INK = "#0b1020";

// chips used on dark / white surfaces: solid, vivid, dark text
const CHIP: Record<string, string> = {
  nextjs: "bg-white text-slate-900",
  react: "bg-sky-300 text-slate-900",
  javascript: "bg-yellow-300 text-slate-900",
  "html-css": "bg-pink-300 text-slate-900",
  "react-hooks": "bg-violet-300 text-slate-900",
};

// whole-card colours for the topic grid
const CARD: Record<string, { bg: string; text: string; sub: string }> = {
  nextjs: { bg: "bg-[#0b1020]", text: "text-white", sub: "text-white/75" },
  react: { bg: "bg-sky-300", text: "text-slate-900", sub: "text-slate-800" },
  javascript: { bg: "bg-yellow-300", text: "text-slate-900", sub: "text-slate-800" },
  "html-css": { bg: "bg-pink-300", text: "text-slate-900", sub: "text-slate-800" },
  "react-hooks": { bg: "bg-violet-300", text: "text-slate-900", sub: "text-slate-800" },
};

const DIFF: Record<string, string> = {
  Easy: "bg-emerald-300 text-slate-900",
  Medium: "bg-amber-300 text-slate-900",
  Hard: "bg-rose-400 text-slate-900",
  Expert: "bg-rose-400 text-slate-900",
};

const BLURB: Record<string, string> = {
  nextjs: "App Router, rendering modes, caching, middleware, server actions.",
  react: "Components, state, reconciliation, performance and patterns.",
  javascript: "Closures, the event loop, promises, prototypes, modern syntax.",
  "html-css": "Semantic markup, layout, specificity, responsive design, a11y.",
  "react-hooks": "Every built-in hook, plus the new React 19 ones.",
};

function summary(md: string, max = 150) {
  const text = md
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && !l.trim().startsWith("-"))
    .join(" ")
    .replace(/[*`_>]/g, "")
    .trim();
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text;
}

const byTopic = (id: string) => ALL_QUESTIONS.filter((q) => q.topic === id);
const pick = (id: string, i: number): Question => byTopic(id)[i];
const qHref = (q: Question) => `/questions-answers?topic=${q.topic}&q=${q.id}`;
/** The coding round lists each task once (by title), so link to the first task with that title. */
const roundHref = (question: string) => {
  const first = CODING_ROUND_QUESTIONS.find((x) => cleanTitle(x.question) === cleanTitle(question));
  return first ? `/coding-round?q=${first.id}` : "/coding-round";
};

const hardShadow = (n = 5) => ({ boxShadow: `${n}px ${n}px 0 ${INK}` });

export default function LandingPage() {
  const total = ALL_QUESTIONS.length;
  const topics = TOPICS.map((t) => ({ ...t, list: byTopic(t.id) }));
  const featured = [pick("nextjs", 0), pick("react", 4), pick("javascript", 8), pick("react-hooks", 3)];
  const heroItems: HeroItem[] = [pick("react-hooks", 3), pick("nextjs", 0), pick("javascript", 8), pick("react", 4)].map((q) => ({
    id: q.id,
    topicLabel: TOPICS.find((t) => t.id === q.topic)?.label ?? "",
    topicChip: CHIP[q.topic],
    difficulty: q.difficulty,
    diffChip: DIFF[q.difficulty],
    question: q.question,
    summary: summary(q.answer, 200),
    code: (q.code ?? "").split("\n").slice(0, 8).join("\n"),
  }));
  const words = ["Server Components", "Closures", "useEffect", "Event loop", "Suspense", "Flexbox", "Promises", "Caching", "Hydration", "Specificity", "useOptimistic", "Middleware", "Prototypes", "Server Actions", "Reconciliation", "Accessibility"];
  const rounds = [CODING_ROUND_QUESTIONS[1], CODING_ROUND_QUESTIONS[2], CODING_ROUND_QUESTIONS[5]];
  const counts = { Easy: 0, Medium: 0, Hard: 0 } as Record<string, number>;
  ALL_QUESTIONS.forEach((q) => counts[q.difficulty]++);
  const levels: LevelStat[] = (["Easy", "Medium", "Hard"] as const).map((level) => ({
    level,
    count: counts[level],
    byTopic: TOPICS.map((t) => ({ id: t.id, label: t.label, count: byTopic(t.id).filter((q) => q.difficulty === level).length })).filter((t) => t.count > 0),
  }));
  // examples the playground can open directly (same rules as the Q&A "Run" button)
  const runnable = ALL_QUESTIONS.filter((q) =>
    q.topic === "javascript" ? !!q.code && !/^\s*(import|export)\s/m.test(q.code) : q.topic === "html-css" && !!q.code?.trimStart().startsWith("<")
  ).length;
  const steps = [
    { title: "Choose a topic and difficulty", body: `${TOPICS.length} topics, each split into Easy, Medium and Hard. Refresh the basics, or jump straight to Hard if your interview is close.` },
    { title: "Read the answer, then run the code", body: `Every answer comes with a code example, and ${runnable} JavaScript and HTML/CSS examples open in the playground in one click.` },
    { title: "Mark what you know", body: "Mastered, review later or bookmarked: progress is saved in your browser, so you always see what is left." },
  ];

  const appId = abs("/#app");
  const schema = graph(
    webPage({ path: "/", name: SITE.title, description: SITE.description, breadcrumb: false, mainEntity: appId, about: TOPICS.map((t) => t.label) }),
    {
      "@type": "WebApplication",
      "@id": appId,
      name: SITE.name,
      alternateName: `${SITE.name} - ${SITE.tagline}`,
      url: abs("/"),
      description: SITE.description,
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Interview preparation",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. Works in any modern browser.",
      inLanguage: "en",
      isAccessibleForFree: true,
      offers: freeOffer(),
      image: ogImage(),
      publisher: { "@id": ids.organization },
      featureList: [
        `${total} interview questions across ${TOPICS.map((t) => t.label).join(", ")}`,
        "Easy, Medium and Hard difficulty levels",
        "Runnable code examples for every answer",
        `${CODING_ROUND_QUESTIONS.length} timed Next.js and React coding tasks with worked solutions`,
        "In-browser JavaScript, TypeScript and HTML/CSS playground",
        "Progress tracking and bookmarks saved in your browser, no account needed",
      ],
    },
    {
      "@type": "ItemList",
      "@id": abs("/#sections"),
      name: `${SITE.name} sections`,
      itemListElement: [
        { name: "Questions & Answers", path: "/questions-answers" },
        { name: "Coding round", path: "/coding-round" },
        { name: "Playground", path: "/playground" },
      ].map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: abs(s.path) })),
    }
  );

  return (
    <div id="top" className="min-h-screen bg-[#fff8ec] text-slate-900">
      <JsonLd data={schema} />
      {/* ---------- Hero ---------- */}
      <div
        className="relative bg-[#2b4bff] text-white"
        style={{
          backgroundImage: "radial-gradient(rgb(255 255 255 / .16) 1.3px, transparent 1.3px)",
          backgroundSize: "26px 26px",
        }}
      >
        <header className="sticky top-0 z-20 bg-[#2b4bff]/95 backdrop-blur border-b-2 border-[#0b1020]">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-xl tracking-tight flex items-center gap-2">
              <LogoMark />
              DevQnA
            </Link>
            <nav className="flex items-center gap-0 sm:gap-2 text-sm sm:text-[15px] font-medium">
              <a href="#topics" className="px-3 py-2 rounded-lg hover:bg-white/15 hidden md:block">Topics</a>
              <Link href="/coding-round" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 whitespace-nowrap">Coding round</Link>
              <Link href="/playground" className="px-3 py-2 rounded-lg hover:bg-white/15 hidden sm:block">Playground</Link>
              <details className="relative md:hidden">
                <summary
                  aria-label="More links"
                  className="list-none cursor-pointer w-10 h-10 rounded-lg hover:bg-white/15 flex items-center justify-center text-xl leading-none [&::-webkit-details-marker]:hidden"
                >
                  ☰
                </summary>
                <div className="absolute right-0 top-12 w-48 rounded-xl bg-white text-[#0b1020] border-2 border-[#0b1020] p-1.5 shadow-[4px_4px_0_#0b1020]">
                  <a href="#topics" className="block px-3 py-2.5 rounded-lg font-semibold hover:bg-yellow-200">Topics</a>
                  <Link href="/playground" className="block px-3 py-2.5 rounded-lg font-semibold hover:bg-yellow-200">Playground</Link>
                  <Link href="/questions-answers" className="block px-3 py-2.5 rounded-lg font-semibold hover:bg-yellow-200">All questions</Link>
                </div>
              </details>
              <Link
                href="/questions-answers"
                className="ml-1 px-3 sm:px-4 py-2 rounded-lg bg-yellow-300 whitespace-nowrap text-[#0b1020] font-bold border-2 border-[#0b1020] hover:-translate-y-0.5 transition-transform"
                style={hardShadow(3)}
              >
                Start free
              </Link>
            </nav>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 sm:px-5 pt-8 pb-14 sm:pt-12 md:pt-16 md:pb-24 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-12 lg:gap-14 items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-[#0b1020] text-white rounded-full px-3.5 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Now covers React 19 &amp; Next.js 15
            </p>
            <h1 className="mt-5 sm:mt-6 text-[2.5rem] leading-[1.06] sm:text-5xl md:text-6xl font-extrabold leading-[1.04] tracking-tight">
              Crack the frontend questions you&apos;ll{" "}
              <span
                className="inline-block bg-yellow-300 text-[#0b1020] px-3 -rotate-1 border-2 border-[#0b1020]"
                style={hardShadow(4)}
              >
                actually
              </span>{" "}
              be asked.
            </h1>
            <p className="mt-5 sm:mt-7 text-base sm:text-lg md:text-xl text-blue-50 leading-relaxed max-w-xl">
              Clear answers and runnable code for Next.js, React, JavaScript and CSS, plus timed coding tasks. Free, no account needed.
            </p>
            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/questions-answers"
                className="px-7 py-4 rounded-xl text-center bg-yellow-300 text-[#0b1020] text-base sm:text-lg font-extrabold border-2 border-[#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                style={hardShadow(5)}
              >
                Start practising →
              </Link>
              <Link
                href="/coding-round"
                className="px-7 py-4 rounded-xl text-center border-2 border-white text-base sm:text-lg font-bold hover:bg-white hover:text-[#2b4bff] transition-colors"
              >
                Try a coding task
              </Link>
            </div>
            <ul className="mt-7 sm:mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm sm:text-base font-medium text-blue-50">
              {["Easy to hard", "Runnable code in every answer", "Saves your progress"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-yellow-300 text-[#0b1020] text-xs font-black flex items-center justify-center">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <Hero3D>
            <HeroCarousel items={heroItems} />
          </Hero3D>
        </section>
      </div>

      <Marquee words={words} />

      {/* ---------- Topics ---------- */}
      <section id="topics">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Pick your battle.</h2>
              <p className="mt-3 text-base sm:text-lg text-slate-700">Every topic runs from easy warm-ups to hard interview questions.</p>
            </div>
            <Link href="/questions-answers" className="font-bold underline decoration-4 decoration-yellow-300 underline-offset-4 hover:decoration-[#2b4bff]">
              Browse everything →
            </Link>
          </div>

          <div className="mt-8 sm:mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((t, idx) => {
              const c = CARD[t.id];
              return (
                <Reveal key={t.id} delay={idx * 80} className="h-full">
                  <div
                    className={`group relative flex flex-col h-full rounded-2xl p-5 sm:p-6 border-2 border-[#0b1020] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 focus-within:-translate-x-1 focus-within:-translate-y-1 ${c.bg} ${c.text}`}
                    style={hardShadow(5)}
                  >
                    <h3 className="text-2xl font-extrabold">{t.label}</h3>
                    <p className={`mt-2 leading-relaxed ${c.sub}`}>{BLURB[t.id]}</p>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {[0, 3, 7].map((i) => (
                        <li key={i}>
                          {/* sits above the card-wide link so it opens this exact question */}
                          <Link
                            href={qHref(t.list[i])}
                            className="relative z-10 flex gap-2.5 font-medium leading-snug rounded hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <span className="mt-0.5 shrink-0" aria-hidden>→</span>
                            <span className="line-clamp-2">{t.list[i].question}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/questions-answers?topic=${t.id}`}
                      className="mt-6 font-bold rounded after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-4 focus-visible:after:outline-offset-4 focus-visible:after:outline-yellow-300"
                    >
                      Start {t.label}{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1.5" aria-hidden>→</span>
                    </Link>
                  </div>
                </Reveal>
              );
            })}

            <Reveal delay={400} className="h-full">
              <div
                className="group relative flex flex-col h-full rounded-2xl p-5 sm:p-6 border-2 border-[#0b1020] bg-[#2b4bff] text-white transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 focus-within:-translate-x-1 focus-within:-translate-y-1"
                style={hardShadow(5)}
              >
                <h3 className="text-2xl font-extrabold">Coding round</h3>
                <p className="mt-2 text-blue-50 leading-relaxed">Hands-on tasks like the ones in live screening calls.</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {rounds.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={roundHref(r.question)}
                        className="relative z-10 flex gap-2.5 font-medium leading-snug rounded hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <span className="mt-0.5 shrink-0" aria-hidden>→</span>
                        <span className="line-clamp-2">{r.question}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/coding-round"
                  className="mt-6 font-bold rounded after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-4 focus-visible:after:outline-offset-4 focus-visible:after:outline-yellow-300"
                >
                  Open coding round{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1.5" aria-hidden>→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Warm-up ---------- */}
      <section className="border-y-2 border-[#0b1020] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Warm up with these.</h2>
          <p className="mt-3 text-base sm:text-lg text-slate-700">Short answer first. Open the full explanation when you want more.</p>
          <div className="mt-8 sm:mt-10 grid md:grid-cols-2 gap-6">
            {featured.map((q, idx) => (
              <Reveal key={q.id} delay={(idx % 2) * 100} className="h-full">
                <Link
                  href={qHref(q)}
                  className="block h-full rounded-2xl p-5 sm:p-6 bg-[#fff8ec] border-2 border-[#0b1020] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1"
                  style={hardShadow(5)}
                >
                  <div className="flex gap-2 text-xs font-bold">
                    <span className={`px-2.5 py-1 rounded-full border border-[#0b1020] ${CHIP[q.topic]}`}>
                      {TOPICS.find((t) => t.id === q.topic)?.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full border border-[#0b1020] ${DIFF[q.difficulty]}`}>{q.difficulty}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold leading-snug">{q.question}</h3>
                  <p className="mt-2 text-slate-700 leading-relaxed">{summary(q.answer, 170)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-[#0b1020] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20 grid lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Three steps.</h2>
            <Steps steps={steps} />
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Start gentle. Finish sharp.</h2>
            <p className="mt-3 text-slate-300">
              {total} questions across {TOPICS.length} topics. Pick a level to jump straight in.
            </p>
            <DifficultyMeter stats={levels} total={total} />
            <Link
              href="/playground"
              className="group mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border-2 border-white font-bold hover:bg-white hover:text-[#0b1020] transition-colors"
            >
              Open the playground
              <span className="text-slate-400 font-medium group-hover:text-slate-600">JS · TS · HTML/CSS</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden bg-yellow-300 border-y-2 border-[#0b1020]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(rgb(11 16 32 / .18) 1.3px, transparent 1.3px)", backgroundSize: "22px 22px" }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20 grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <p className="inline-block px-3 py-1 rounded-full bg-[#0b1020] text-yellow-300 text-xs font-bold tracking-widest uppercase">Free · no account</p>
            <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.02]">Interview coming up?</h2>
            <p className="mt-4 text-lg md:text-xl font-medium max-w-xl">
              Answer your first question in under a minute. Short answer first, runnable code right after.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/questions-answers"
                className="group px-7 py-4 rounded-xl text-center bg-[#0b1020] text-white text-base sm:text-lg font-extrabold border-2 border-[#0b1020] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={{ boxShadow: "5px 5px 0 #2b4bff" }}
              >
                Start practicing <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/coding-round"
                className="px-7 py-4 rounded-xl text-center bg-white text-[#0b1020] text-base sm:text-lg font-extrabold border-2 border-[#0b1020] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                style={hardShadow(5)}
              >
                Try a timed coding task
              </Link>
            </div>
            <div className="mt-7">
              <p className="text-sm font-bold">Jump straight to a topic</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/questions-answers?topic=${t.id}`}
                    className={`px-3.5 py-1.5 rounded-full border-2 border-[#0b1020] text-sm font-bold transition-transform hover:-translate-y-0.5 ${CHIP[t.id]}`}
                  >
                    {t.label} <span className="font-medium opacity-70 tabular-nums">{t.list.length}</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { n: total, label: "interview questions", bg: "bg-white" },
                { n: CODING_ROUND_QUESTIONS.length, label: "timed coding tasks", bg: "bg-sky-300" },
                { n: topics.length, label: "topics, easy to hard", bg: "bg-pink-300" },
                { n: runnable, label: "examples you can run", bg: "bg-violet-300" },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl border-2 border-[#0b1020] p-4 sm:p-5 transition-transform hover:-translate-y-1 ${s.bg}`}
                  style={hardShadow(4)}
                >
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-3xl sm:text-4xl font-black tracking-tight">
                    <CountUp to={s.n} />
                  </dd>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="relative bg-[#0b1020] text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 pt-12 pb-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-white font-extrabold text-xl tracking-tight">
                <LogoMark />
                DevQnA
              </Link>
              <p className="mt-3 max-w-xs leading-relaxed">
                Frontend interview prep with clear answers, runnable code and timed coding rounds.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 border border-white/15 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                No account. Progress stays in your browser.
              </p>
            </div>

            <nav aria-label="Topics">
              <h3 className="text-white font-bold">Practice</h3>
              <ul className="mt-3 space-y-2">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link href={`/questions-answers?topic=${t.id}`} className="hover:text-white transition-colors">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Tools">
              <h3 className="text-white font-bold">Tools</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/questions-answers" className="hover:text-white transition-colors">All questions</Link></li>
                <li><Link href="/coding-round" className="hover:text-white transition-colors">Coding round</Link></li>
                <li><Link href="/playground" className="hover:text-white transition-colors">Playground</Link></li>
                <li><Link href="/docbar" className="hover:text-white transition-colors">Docs</Link></li>
              </ul>
            </nav>

            <nav aria-label="By difficulty">
              <h3 className="text-white font-bold">By difficulty</h3>
              <ul className="mt-3 space-y-2">
                {levels.map((l) => {
                  const top = [...l.byTopic].sort((a, b) => b.count - a.count)[0];
                  return (
                    <li key={l.level}>
                      <Link
                        href={`/questions-answers?${top ? `topic=${top.id}&` : ""}difficulty=${l.level}`}
                        className="hover:text-white transition-colors"
                      >
                        {l.level} <span className="tabular-nums text-slate-500">({l.count})</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
            <span>© {new Date().getFullYear()} DevQnA · devqna.online</span>
            <a href="#top" className="group inline-flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white">
              Back to top <span className="inline-block transition-transform group-hover:-translate-y-0.5" aria-hidden>↑</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
