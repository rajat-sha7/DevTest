import Link from "next/link";
import { ALL_QUESTIONS, TOPICS, type Question } from "@/lib/questions";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";
import { LogoMark } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs } from "@/lib/site";
import { freeOffer, graph, ids, ogImage, webPage } from "@/lib/schema";
import { Hero3D } from "@/components/landing/hero3d";
import { FillBar, HeroCarousel, Marquee, Reveal, type HeroItem } from "@/components/landing/motion";

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
    <div className="min-h-screen bg-[#fff8ec] text-slate-900">
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
                  <Link
                    href="/questions-answers"
                    className={`group flex flex-col h-full rounded-2xl p-5 sm:p-6 border-2 border-[#0b1020] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 ${c.bg} ${c.text}`}
                    style={hardShadow(5)}
                  >
                    <h3 className="text-2xl font-extrabold">{t.label}</h3>
                    <p className={`mt-2 leading-relaxed ${c.sub}`}>{BLURB[t.id]}</p>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {[0, 3, 7].map((i) => (
                        <li key={i} className="flex gap-2.5 font-medium leading-snug">
                          <span className="mt-0.5 shrink-0">→</span>
                          <span className="line-clamp-2">{t.list[i].question}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="mt-6 font-bold">
                      Start {t.label}{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}

            <Reveal delay={400} className="h-full">
              <Link
                href="/coding-round"
                className="group flex flex-col h-full rounded-2xl p-5 sm:p-6 border-2 border-[#0b1020] bg-[#2b4bff] text-white transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1"
                style={hardShadow(5)}
              >
                <h3 className="text-2xl font-extrabold">Coding round</h3>
                <p className="mt-2 text-blue-50 leading-relaxed">Hands-on tasks like the ones in live screening calls.</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {rounds.map((r) => (
                    <li key={r.id} className="flex gap-2.5 font-medium leading-snug">
                      <span className="mt-0.5 shrink-0">→</span>
                      <span className="line-clamp-2">{r.question}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 font-bold">
                  Open coding round{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span>
                </span>
              </Link>
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
                  href="/questions-answers"
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
            <ol className="mt-9 space-y-8">
              {[
                ["Choose a topic and difficulty", "Start easy to refresh the basics, or jump straight to Hard if your interview is close."],
                ["Read the answer, then run the code", "Every answer has an example. Open it in the playground and change it."],
                ["Mark what you know", "Progress is saved in your browser, so you always see what is left."],
              ].map(([h, b], i) => (
                <li key={h}>
                  <Reveal delay={i * 120} className="flex gap-5">
                    <span className="w-11 h-11 rounded-full bg-yellow-300 text-[#0b1020] text-lg font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <h3 className="text-xl font-bold">{h}</h3>
                      <p className="mt-1 text-slate-300 leading-relaxed">{b}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Start gentle. Finish sharp.</h2>
            <div className="mt-9 space-y-6">
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <div key={d}>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-lg">{d}</span>
                    <span className="text-slate-300">
                      {d === "Easy" ? "Refresh the basics" : d === "Medium" ? "Build confidence" : "Interview-level depth"}
                    </span>
                  </div>
                  <FillBar
                    percent={(counts[d] / total) * 100}
                    track="bg-white/15"
                    className={d === "Easy" ? "bg-emerald-400" : d === "Medium" ? "bg-yellow-300" : "bg-pink-400"}
                  />
                </div>
              ))}
            </div>
            <Link
              href="/playground"
              className="mt-10 inline-block px-6 py-3.5 rounded-xl border-2 border-white font-bold hover:bg-white hover:text-[#0b1020] transition-colors"
            >
              Open the JS playground
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="bg-yellow-300 border-y-2 border-[#0b1020]">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-12 md:py-20 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">Interview coming up?</h2>
            <p className="mt-3 text-lg md:text-xl font-medium">Answer your first question in under a minute.</p>
          </div>
          <Link
            href="/questions-answers"
            className="md:self-auto shrink-0 px-8 py-4 rounded-xl text-center bg-[#0b1020] text-white text-base sm:text-lg font-extrabold hover:-translate-y-1 transition-transform"
            style={{ boxShadow: "5px 5px 0 #2b4bff" }}
          >
            Start practising →
          </Link>
        </div>
      </section>

      <footer className="bg-[#0b1020] text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8 flex flex-col sm:flex-row sm:justify-between gap-3 text-sm">
          <span>© {new Date().getFullYear()} DevQnA</span>
          <div className="flex gap-6">
            <Link href="/questions-answers" className="hover:text-white">Questions</Link>
            <Link href="/coding-round" className="hover:text-white">Coding round</Link>
            <Link href="/playground" className="hover:text-white">Playground</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
