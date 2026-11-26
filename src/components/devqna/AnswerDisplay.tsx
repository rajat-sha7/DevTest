"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  Link2,
  Loader2,
  Lightbulb,
  RefreshCcw,
  Search,
  Sparkles,
  Timer,
} from "lucide-react";
import { Question, TOPICS } from "@/lib/questions";
import { generateExplanationAndExample, GenerateExplanationAndExampleOutput } from "@/ai/flows/generate-explanation-and-example";
import { CodePanel, type CodeLang } from "@/components/devqna/CodePanel";
import { Markdown as BaseMarkdown } from "@/components/devqna/Markdown";
import { NotesBox } from "@/components/devqna/NotesBox";
import { ListenControls } from "@/components/devqna/ListenControls";
import { playgroundLink } from "@/lib/playground/share";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AnswerDisplayProps {
  question: Question;
  isDone: boolean;
  isSaved: boolean;
  isReview: boolean;
  note: string;
  practice: boolean;
  onToggleDone: () => void;
  onToggleSaved: () => void;
  onToggleReview: () => void;
  onNote: (text: string) => void;
  /** practice mode self rating; the page moves on to the next question */
  onRate: (result: "got" | "review") => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const DIFF_CHIP = {
  Easy: "bg-emerald-300",
  Medium: "bg-amber-300",
  Hard: "bg-rose-400",
} as const;

const LANGUAGE_NAME: Record<string, string> = {
  nextjs: "Next.js",
  react: "React.js",
  javascript: "JavaScript",
  "html-css": "HTML/CSS",
  "react-hooks": "React Hooks",
};


function detectLang(code: string, topic: string): CodeLang {
  const t = code.trimStart();
  if (t.startsWith("<")) return "html";
  if (topic === "html-css" && !/\b(const|let|function|=>)\b/.test(code)) return "css";
  if (topic === "javascript") return "js";
  return "ts";
}

/** What the playground can actually run for this question, if anything. */
function playgroundHref(q: Question): string | null {
  if (!q.code) return null;
  if (q.topic === "javascript") {
    // examples that touch the page run in the live preview; everything else runs in the console
    if (/\b(document|window|localStorage|sessionStorage|navigator|location|history)\b\s*[.[(]|\bnew Worker\(/.test(q.code))
      return playgroundLink("web", { html: "", css: "body { font-family: system-ui, sans-serif; padding: 16px; }", wjs: q.code });
    if (!/^\s*(import|export)\s/m.test(q.code)) return playgroundLink("js", { js: q.code });
    return null;
  }
  if (q.topic === "html-css" && q.code.trimStart().startsWith("<"))
    return playgroundLink("web", { html: q.code, css: "body { font-family: system-ui, sans-serif; padding: 16px; }", wjs: "" });
  return null;
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.tagName === "BUTTON" || el.isContentEditable);
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;


/* Markdown is parsed once per answer, not on every timer tick or keystroke. */
const Markdown = memo(BaseMarkdown);

/** Own state, so only this tiny component re-renders every second. */
const ElapsedTimer = memo(function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{fmt(seconds)}</>;
});

export function AnswerDisplay({
  question,
  isDone,
  isSaved,
  isReview,
  note,
  practice,
  onToggleDone,
  onToggleSaved,
  onToggleReview,
  onNote,
  onRate,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: AnswerDisplayProps) {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState(!practice);
  const [seconds, setSeconds] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ai, setAi] = useState<GenerateExplanationAndExampleOutput | null>(null);

  // practice mode hides the answer until you reveal it
  useEffect(() => {
    setRevealed(!practice);
  }, [practice, question.id]);

  // Space / Enter reveals, 1 and 2 rate (practice mode)
  useEffect(() => {
    if (!practice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && e.key === "1") onRate("got");
      else if (revealed && e.key === "2") onRate("review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [practice, revealed, onRate]);

  const topicLabel = TOPICS.find((t) => t.id === question.topic)?.label ?? question.topic;
  const readMin = useMemo(() => Math.max(1, Math.round(question.answer.split(/\s+/).length / 200)), [question.answer]);
  const runHref = useMemo(() => playgroundHref(question), [question]);
  const codeLang = question.code ? detectLang(question.code, question.topic) : "ts";

  const copy = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const copyLink = () => {
    const url = `${location.origin}/questions-answers?topic=${question.topic}&q=${question.id}`;
    copy(url, "Link copied");
  };

  const generate = async () => {
    setIsGenerating(true);
    setAi(null);
    try {
      setAi(
        await generateExplanationAndExample({
          concept: question.question,
          context: question.answer,
          programmingLanguage: LANGUAGE_NAME[question.topic] ?? "JavaScript",
        })
      );
    } catch (e) {
      console.error("AI generation error:", e);
      toast({
        title: "Deep-dive unavailable",
        description: "The AI service could not be reached. Check your API key or try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const action =
    "h-10 px-3.5 rounded-xl border-2 border-[#0b1020] text-sm font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5";

  return (
    <article className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-16">
      {/* meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-white">{topicLabel}</span>
        <span className={cn("px-2.5 py-1 rounded-full border-2 border-[#0b1020]", DIFF_CHIP[question.difficulty])}>{question.difficulty}</span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3.5 h-3.5" /> {readMin} min read
        </span>
        {isDone && (
          <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-emerald-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" strokeWidth={3} /> Mastered
          </span>
        )}
        {isReview && (
          <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-pink-300 flex items-center gap-1">
            <Flag className="w-3.5 h-3.5" /> Needs review
          </span>
        )}
      </div>

      <h1 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight text-[#0b1020] leading-[1.15]">{question.question}</h1>

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          onClick={onToggleDone}
          aria-pressed={isDone}
          className={cn(action, isDone ? "bg-emerald-300 shadow-[3px_3px_0_#0b1020]" : "bg-yellow-300 shadow-[3px_3px_0_#0b1020]")}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          {isDone ? "Mastered" : "Mark as mastered"}
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">m</kbd>
        </button>
        <button onClick={onToggleSaved} aria-pressed={isSaved} className={cn(action, isSaved ? "bg-yellow-200" : "bg-white hover:bg-yellow-100")}>
          <Bookmark className={cn("w-4 h-4", isSaved && "fill-yellow-400")} />
          {isSaved ? "Saved" : "Save"}
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">b</kbd>
        </button>
        <button onClick={onToggleReview} aria-pressed={isReview} className={cn(action, isReview ? "bg-pink-300" : "bg-white hover:bg-pink-100")}>
          <Flag className={cn("w-4 h-4", isReview && "fill-pink-500")} />
          {isReview ? "In review" : "Needs review"}
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">r</kbd>
        </button>
        <button onClick={copyLink} className={cn(action, "bg-white hover:bg-sky-100")}>
          <Link2 className="w-4 h-4" /> Copy link
        </button>
      </div>

      {/* answer */}
      {!revealed ? (
        <section className="mt-10 rounded-3xl border-2 border-dashed border-[#0b1020]/40 bg-white p-8 md:p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-sky-200 border-2 border-[#0b1020] flex items-center justify-center">
            <Timer className="w-6 h-6" />
          </div>
          <p className="mt-5 text-2xl font-extrabold">Say your answer out loud.</p>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">
            Explain it the way you would in an interview, then check yourself against the answer.
          </p>
          <p className="mt-5 font-code text-3xl font-bold tabular-nums"><ElapsedTimer /></p>
          <button
            onClick={() => setRevealed(true)}
            className="mt-6 h-12 px-7 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold text-base shadow-[4px_4px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
          >
            <Eye className="w-5 h-5" /> Reveal answer
            <kbd className="hidden md:inline text-[11px] font-code bg-[#0b1020]/10 rounded px-1.5">Space</kbd>
          </button>
        </section>
      ) : (
        <>
          {/* read the question and answer aloud */}
          <ListenControls key={question.id} id={question.id} title={question.question} answer={question.answer} className="mt-4" />

          <section className="mt-10 text-base md:text-lg leading-relaxed text-slate-700">
            <Markdown text={question.answer} />
          </section>

          {question.code && <CodePanel code={question.code} lang={codeLang} title="Example" runnable={runHref} />}

          {practice && (
            <section className="mt-10 rounded-2xl border-2 border-[#0b1020] bg-white p-5 md:p-6 shadow-[5px_5px_0_#0b1020]">
              <p className="font-extrabold text-lg">How did that go?</p>
              <p className="text-sm text-slate-600 mt-1">Be honest. It decides what comes back in your review list.</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onRate("got")}
                  className="h-12 px-6 rounded-xl bg-emerald-300 border-2 border-[#0b1020] font-extrabold flex items-center justify-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform"
                >
                  <Check className="w-5 h-5" strokeWidth={3} /> Got it
                  <kbd className="hidden md:inline text-[11px] font-code bg-[#0b1020]/10 rounded px-1.5">1</kbd>
                </button>
                <button
                  onClick={() => onRate("review")}
                  className="h-12 px-6 rounded-xl bg-pink-300 border-2 border-[#0b1020] font-extrabold flex items-center justify-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform"
                >
                  <Flag className="w-5 h-5" /> Need to review
                  <kbd className="hidden md:inline text-[11px] font-code bg-[#0b1020]/10 rounded px-1.5">2</kbd>
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <NotesBox key={question.id} value={note} onCommit={onNote} />

      {/* AI deep dive */}
      <section className="mt-12 pt-10 border-t-2 border-[#0b1020]/10">
        {!ai && !isGenerating ? (
          <div className="rounded-2xl border-2 border-[#0b1020] bg-violet-200 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[5px_5px_0_#0b1020]">
            <div>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Go deeper
              </h2>
              <p className="mt-1 text-slate-800 max-w-lg">
                Get an extended explanation, related concepts, search queries and a production-style example for this topic.
              </p>
            </div>
            <button
              onClick={generate}
              className="h-12 px-6 rounded-xl bg-[#0b1020] text-white font-extrabold shrink-0 hover:-translate-y-0.5 transition-transform"
            >
              Generate deep-dive
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Deep-dive
              </h2>
              {ai && (
                <button
                  onClick={generate}
                  disabled={isGenerating}
                  className="h-9 px-3 rounded-lg border-2 border-[#0b1020] text-sm font-bold flex items-center gap-1.5 hover:bg-[#0b1020] hover:text-white transition-colors"
                >
                  <RefreshCcw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} /> Regenerate
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-16 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#0b1020]/30 bg-white">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-bold text-slate-600">Writing the deep-dive...</p>
              </div>
            ) : (
              ai && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <p className="text-base md:text-lg leading-relaxed text-slate-700 border-l-4 border-violet-300 pl-4 whitespace-pre-line">
                    {ai.explanation}
                  </p>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="rounded-2xl border-2 border-[#0b1020] bg-white p-5">
                      <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
                        <Lightbulb className="w-4 h-4" /> Related
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {ai.relatedConcepts.map((c) => (
                          <span key={c} className="px-3 py-1 rounded-full bg-sky-200 border-2 border-[#0b1020] text-sm font-bold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-[#0b1020] bg-white p-5">
                      <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
                        <Search className="w-4 h-4" /> Read more
                      </h3>
                      <ul className="space-y-2">
                        {ai.researchQueries.map((q) => (
                          <li key={q}>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-slate-50 hover:bg-yellow-100 text-sm font-semibold transition-colors"
                            >
                              <span>{q}</span>
                              <ExternalLink className="w-4 h-4 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <CodePanel code={ai.codeExample} lang={detectLang(ai.codeExample, question.topic)} title="Example" />
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* prev / next */}
      <nav className="mt-14 pt-6 border-t-2 border-[#0b1020]/10 flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="h-12 px-5 rounded-xl border-2 border-[#0b1020] font-bold flex items-center gap-2 hover:bg-[#0b1020] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">k</kbd>
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="h-12 px-5 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold flex items-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">j</kbd>
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>
    </article>
  );
}
