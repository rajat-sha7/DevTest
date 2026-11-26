"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { sectionTransition, type SectionMotion } from "@/lib/section-transition";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpenText,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Flag,
  Lightbulb,
  Link2,
  LoaderCircle,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Terminal,
  X,
} from "lucide-react";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";
import { cleanTitle, contentFor } from "@/lib/coding-round-content";
import { LogoMark } from "@/components/Logo";
import { CodeEditor } from "@/components/playground/CodeEditor";
import { CodePanel } from "@/components/devqna/CodePanel";
import { NotesBox } from "@/components/devqna/NotesBox";
import { DataSafetyBanner } from "@/components/devqna/DataSafetyBanner";
import { ConfirmDialog, type Ask } from "@/components/playground/ConfirmDialog";
import { Stopwatch, type StopwatchHandle } from "@/components/coding/Stopwatch";
import { ChallengePicker, type PickerItem } from "@/components/coding/ChallengePicker";
import { flushStudy, useStudy } from "@/hooks/useStudy";
import { onPageLeave } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { compileProblems, detectRequirements, isUntouched, type Problem } from "@/lib/coding-round-checks";

/* The data repeats each prompt with a different number; the workspace shows every distinct challenge once. */
const CHALLENGES = CODING_ROUND_QUESTIONS.filter((q, i, a) => a.findIndex((x) => cleanTitle(x.question) === cleanTitle(q.question)) === i);
const PICKER_ITEMS: PickerItem[] = CHALLENGES.map((q) => ({
  id: q.id,
  title: cleanTitle(q.question),
  topic: q.topic,
  difficulty: q.difficulty,
  minutes: contentFor(q.question).minutes,
}));

const TOPIC_CHIP: Record<string, string> = { "Next.js": "bg-white", React: "bg-sky-300" };
const LEVEL_CHIP: Record<string, string> = { Medium: "bg-amber-300", Hard: "bg-rose-400", Expert: "bg-fuchsia-400" };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface Session {
  id: string;
  manual: number[];
  hints: number;
  revealed: boolean;
  submitted: boolean;
}
const fresh = (id: string): Session => ({ id, manual: [], hints: 0, revealed: false, submitted: false });

function Workspace() {
  const params = useSearchParams();
  const urlQ = params.get("q");
  const study = useStudy();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string>(CHALLENGES.some((c) => c.id === urlQ) ? (urlQ as string) : CHALLENGES[0].id);
  const [session, setSession] = useState<Session>(() => fresh(selectedId));
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"code" | "reference" | "notes">("code");
  const [pane, setPane] = useState<"problem" | "code">("problem");
  const [fontSize, setFontSize] = useState(14);
  const [picker, setPicker] = useState(false);
  const [review, setReview] = useState<{ seconds: number } | null>(null);
  const [lookFor, setLookFor] = useState(false);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved">("idle");
  const [ask, setAsk] = useState<Ask | null>(null);

  const sw = useRef<StopwatchHandle>(null);
  const started = useRef(false);

  const ch = CHALLENGES.find((c) => c.id === selectedId) ?? CHALLENGES[0];
  const content = useMemo(() => contentFor(ch.question), [ch.question]);
  const title = cleanTitle(ch.question);
  const idx = CHALLENGES.findIndex((c) => c.id === ch.id);
  const sess = session.id === ch.id ? session : fresh(ch.id);
  const patch = useCallback((p: Partial<Session>) => setSession((s) => ({ ...(s.id === ch.id ? s : fresh(ch.id)), ...p })), [ch.id]);

  /* ---------- your code: loaded from the saved draft, saved as you type ---------- */
  const pending = useRef<{ id: string; text: string; starter: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyRef = useRef(study);
  studyRef.current = study;

  const commitDraft = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    if (!p.text.trim() || p.text === p.starter) studyRef.current.clearDraft(p.id);
    else studyRef.current.setDraft(p.id, p.text);
    flushStudy();
    setDraftState("saved");
  }, []);

  useEffect(() => {
    const off = onPageLeave(commitDraft);
    return () => {
      off();
      commitDraft();
    };
  }, [commitDraft]);

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!study.ready || loadedFor.current === ch.id) return;
    loadedFor.current = ch.id;
    setCode(study.drafts[ch.id] ?? content.starter);
    setDraftState(study.drafts[ch.id] ? "saved" : "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.ready, ch.id]);

  const onCode = (v: string) => {
    setCode(v);
    pending.current = { id: ch.id, text: v, starter: content.starter };
    setDraftState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(commitDraft, 600);
    if (!started.current && !sess.submitted) {
      started.current = true;
      sw.current?.start();
    }
  };

  /* ---------- choosing a challenge ---------- */
  const switchTo = useCallback(
    (id: string, motion: SectionMotion = "swap") => {
      if (id === selectedId) return;
      commitDraft();
      started.current = false;
      sectionTransition(() => {
        setSession(fresh(id));
        setSelectedId(id);
        setTab("code");
        setPane("problem");
        setLookFor(false);
        setReview(null);
      }, motion);
    },
    [selectedId, commitDraft]
  );

  // with no link, open on the first challenge you have not mastered yet
  const picked = useRef(false);
  useEffect(() => {
    if (!study.ready || picked.current) return;
    picked.current = true;
    if (!CHALLENGES.some((c) => c.id === urlQ)) {
      const next = CHALLENGES.find((c) => !study.done.has(c.id));
      if (next && next.id !== selectedId) switchTo(next.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.ready]);

  useEffect(() => {
    window.history.replaceState(null, "", `/coding-round?q=${ch.id}`);
  }, [ch.id]);

  const go = (d: -1 | 1) => {
    const t = CHALLENGES[idx + d];
    if (t) switchTo(t.id, d === 1 ? "forward" : "back");
  };

  /* ---------- requirements: detected from your code, or ticked by hand ---------- */
  const deferred = useDeferredValue(code);
  const detected = useMemo(
    () => detectRequirements(deferred, content.starter, content.requirements.map((r) => r.pattern)),
    [deferred, content]
  );
  const checked = content.requirements.map((_, i) => detected[i] || sess.manual.includes(i));
  const checkedCount = checked.filter(Boolean).length;

  /* ---------- compile check: runs shortly after you stop typing ---------- */
  const [problems, setProblems] = useState<Problem[]>([]);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setChecking(true);
    const t = setTimeout(() => {
      compileProblems(code)
        .then((p) => live && (setProblems(p), setCheckFailed(false)))
        .catch(() => live && setCheckFailed(true))
        .finally(() => live && setChecking(false));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [code]);
  const compiles = !checkFailed && problems.length === 0;
  const untouched = isUntouched(code, content.starter);

  // put the caret on a problem's line and scroll it into view
  const jumpTo = (line: number, col = 1) => {
    if (tab !== "code") setTab("code");
    if (pane !== "code") setPane("code");
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('[data-vt-pane="cr-code"] textarea');
      if (!ta) return;
      const lines = ta.value.split("\n");
      const at = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + Math.min(col - 1, lines[line - 1]?.length ?? 0);
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(at, at);
      const box = ta.closest<HTMLElement>(".overflow-auto");
      const lh = Math.round(fontSize * 1.7);
      box?.scrollTo({ top: Math.max(0, (line - 1) * lh - box.clientHeight / 3), behavior: "smooth" });
    });
  };

  const toggleManual = (i: number) =>
    patch({ manual: sess.manual.includes(i) ? sess.manual.filter((x) => x !== i) : [...sess.manual, i] });

  /* ---------- review ---------- */
  const wasRunning = useRef(false);
  const openReview = () => {
    wasRunning.current = !!sw.current?.running();
    sw.current?.pause();
    setReview({ seconds: sw.current?.seconds() ?? 0 });
  };
  // "Keep working" (or closing the dialog) picks the clock back up if it was running
  const closeReview = () => {
    setReview(null);
    if (wasRunning.current) sw.current?.start();
  };

  const canNail = compiles && !untouched;
  const finish = (result: "nailed" | "needswork") => {
    if (result === "nailed" && !canNail) return;
    const secs = review?.seconds ?? 0;
    if (result === "nailed") {
      if (!study.done.has(ch.id)) study.toggleDone(ch.id);
      if (secs > 0) study.recordTime(ch.id, secs);
      toast({ title: "Marked as mastered", description: secs ? `Finished in ${fmt(secs)}.` : undefined });
    } else {
      study.flagReview(ch.id);
      toast({ title: "Added to your review list" });
    }
    patch({ submitted: true, revealed: true });
    setReview(null);
    setTab("reference");
  };

  const askReveal = () =>
    setAsk({
      title: "Reveal the reference solution?",
      message: "You learn the most by finishing your own attempt first. Reveal it anyway if you are stuck.",
      confirmLabel: "Reveal",
      tone: "info",
      icon: <Eye className="w-5 h-5" />,
      onConfirm: () => patch({ revealed: true }),
    });
  const askUseReference = () =>
    setAsk({
      title: "Replace your code?",
      message: "Your current code in the editor will be replaced by the reference solution.",
      confirmLabel: "Replace",
      tone: "danger",
      onConfirm: () => {
        onCode(content.solution);
        setTab("code");
      },
    });
  const askReset = () =>
    setAsk({
      title: "Reset to the starter code?",
      message: "Your code for this challenge goes back to the starting template. This cannot be undone.",
      confirmLabel: "Reset",
      tone: "danger",
      icon: <RotateCcw className="w-5 h-5" />,
      onConfirm: () => onCode(content.starter),
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/coding-round?q=${ch.id}`);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  /* ---------- keyboard: one listener, always reads the latest values ---------- */
  const latest = useRef({ go, openReview, closeReview, review });
  latest.current = { go, openReview, closeReview, review };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && latest.current.review) {
        latest.current.closeReview();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPicker((p) => !p);
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        latest.current.go(1);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        latest.current.go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isDone = study.done.has(ch.id);
  const isSaved = study.saved.has(ch.id);
  const isReview = study.review.has(ch.id);
  const best = study.times[ch.id];
  const doneCount = CHALLENGES.filter((c) => study.done.has(c.id)).length;
  const hintsLeft = content.hints.length - sess.hints;

  const tabBtn = (t: typeof tab, label: string, icon: React.ReactNode) => (
    <button
      key={t}
      onClick={() => t !== tab && sectionTransition(() => setTab(t), "swap", ["cr-code"])}
      aria-pressed={tab === t}
      className={cn("px-3 py-1.5 rounded-md font-code text-xs flex items-center gap-1.5 transition-colors", tab === t ? "bg-white text-[#0b1020] font-bold" : "text-slate-300 hover:text-white")}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-[#fff8ec] text-[#0b1020] overflow-hidden">
      <DataSafetyBanner study={study} />

      {/* ---------------- top bar ---------------- */}
      <header data-site-header className="shrink-0 bg-[#0b1020] text-white border-b-2 border-[#0b1020]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5">
          <Link href="/" aria-label="Home" className="shrink-0 hover:-rotate-6 transition-transform">
            <LogoMark className="w-9 h-9" />
          </Link>

          <button
            onClick={() => setPicker(true)}
            className="flex-1 sm:flex-none sm:w-[360px] lg:w-[440px] min-w-0 h-10 px-3 rounded-xl border-2 border-white/25 hover:border-yellow-300 transition-colors flex items-center gap-2 text-left"
            aria-label="Choose a challenge"
          >
            <Search className="w-4 h-4 text-white/50 shrink-0" />
            <span className="truncate text-sm font-bold">
              <span className="text-yellow-300 tabular-nums">{String(idx + 1).padStart(2, "0")}</span> {title}
            </span>
            <kbd className="hidden md:inline ml-auto font-code text-[10px] font-bold text-white/60 border border-white/25 rounded px-1.5 py-0.5 shrink-0">Ctrl K</kbd>
          </button>

          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous challenge" title="Previous (Alt + Left)" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button onClick={() => go(1)} disabled={idx === CHALLENGES.length - 1} aria-label="Next challenge" title="Next (Alt + Right)" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="order-4 w-full sm:w-auto sm:order-none sm:ml-auto flex items-center gap-4 justify-between sm:justify-end">
            <Stopwatch key={ch.id} ref={sw} targetSeconds={content.minutes * 60} />
            <span className="hidden xl:flex items-center gap-1.5 text-xs font-bold text-white/60">
              <Target className="w-3.5 h-3.5" /> {doneCount} done
            </span>
          </div>

          <button
            onClick={openReview}
            className="order-3 sm:order-none h-10 px-4 rounded-xl bg-yellow-300 text-[#0b1020] border-2 border-yellow-300 font-extrabold flex items-center gap-2 hover:bg-white transition-colors shrink-0"
          >
            <Check className="w-4 h-4" strokeWidth={3} /> Submit
          </button>
        </div>
      </header>

      {/* mobile / tablet: one pane at a time */}
      <div className="lg:hidden shrink-0 flex gap-2 px-3 pt-3">
        {(["problem", "code"] as const).map((p) => (
          <button
            key={p}
            onClick={() => p !== pane && sectionTransition(() => setPane(p))}
            aria-pressed={pane === p}
            className={cn("flex-1 h-10 rounded-xl border-2 border-[#0b1020] font-extrabold text-sm capitalize", pane === p ? "bg-[#0b1020] text-white" : "bg-white")}
          >
            {p === "problem" ? "Problem" : "Your code"}
          </button>
        ))}
      </div>

      {/* ---------------- workspace ---------------- */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 p-3 lg:p-4">
        {/* problem */}
        <section data-vt-pane="cr-problem" className={cn("min-h-0 overflow-y-auto custom-scrollbar rounded-2xl border-2 border-[#0b1020] bg-white p-5 md:p-6", pane === "problem" ? "block" : "hidden lg:block")}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className={cn("px-2.5 py-1 rounded-full border-2 border-[#0b1020]", TOPIC_CHIP[ch.topic])}>{ch.topic}</span>
            <span className={cn("px-2.5 py-1 rounded-full border-2 border-[#0b1020]", LEVEL_CHIP[ch.difficulty])}>{ch.difficulty}</span>
            <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-sky-100">~{content.minutes} min</span>
            {isDone && (
              <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-emerald-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" strokeWidth={3} /> Mastered
              </span>
            )}
            {isReview && (
              <span className="px-2.5 py-1 rounded-full border-2 border-[#0b1020] bg-pink-300 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5" /> Review
              </span>
            )}
            {best ? <span className="text-emerald-700">best {fmt(best)}</span> : null}
          </div>

          <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight leading-[1.15]">{title}</h1>
          <p className="mt-3 text-slate-700 leading-relaxed">
            Build this in the editor, the way you would in a live interview. The requirements below tick themselves as your code covers them. Aim for about {content.minutes} minutes.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => study.toggleSaved(ch.id)} aria-pressed={isSaved} className={cn("h-9 px-3 rounded-lg border-2 border-[#0b1020] text-sm font-bold flex items-center gap-1.5", isSaved ? "bg-yellow-200" : "bg-white hover:bg-yellow-100")}>
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-yellow-400")} /> {isSaved ? "Saved" : "Save"}
            </button>
            <button onClick={copyLink} className="h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white hover:bg-sky-100 text-sm font-bold flex items-center gap-1.5">
              <Link2 className="w-4 h-4" /> Copy link
            </button>
            <Link href="/questions-answers" className="h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white hover:bg-yellow-100 text-sm font-bold flex items-center gap-1.5">
              <BookOpenText className="w-4 h-4" /> Study the theory
            </Link>
          </div>

          {/* requirements */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Requirements</h2>
              <span className="text-xs font-bold tabular-nums">
                {checkedCount} of {content.requirements.length}
              </span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-slate-100 border border-[#0b1020]/30 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${(checkedCount / content.requirements.length) * 100}%` }} />
            </div>
            <ul className="mt-3 space-y-2">
              {content.requirements.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => toggleManual(i)}
                    aria-pressed={checked[i]}
                    className={cn("w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-colors", checked[i] ? "border-[#0b1020] bg-emerald-50" : "border-[#0b1020]/20 hover:border-[#0b1020]/50")}
                  >
                    <span className={cn("mt-0.5 w-5 h-5 rounded-md border-2 border-[#0b1020] flex items-center justify-center shrink-0", checked[i] ? "bg-emerald-400" : "bg-white")}>
                      {checked[i] && <Check className="w-3.5 h-3.5" strokeWidth={3.5} />}
                    </span>
                    <span className="flex-1 text-sm leading-snug font-semibold">{r.text}</span>
                    {detected[i] && (
                      <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-violet-200 border border-[#0b1020] px-2 py-0.5 flex items-center gap-1" title="Found in your code">
                        <Sparkles className="w-3 h-3" /> in code
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Items tick themselves when your code includes them. You can also tick them by hand.</p>
          </div>

          {/* hints */}
          <div className="mt-8">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Hints</h2>
            <ol className="mt-3 space-y-2">
              {content.hints.slice(0, sess.hints).map((h, i) => (
                <li key={i} className="flex gap-3 p-3 rounded-xl bg-yellow-50 border-2 border-yellow-300 text-sm leading-snug animate-in fade-in slide-in-from-top-1 duration-200">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>{h}</span>
                </li>
              ))}
            </ol>
            {hintsLeft > 0 ? (
              <button onClick={() => patch({ hints: sess.hints + 1 })} className="mt-3 h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white hover:bg-yellow-100 text-sm font-bold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" /> Show hint {sess.hints + 1} of {content.hints.length}
              </button>
            ) : (
              <p className="mt-2 text-xs text-slate-500">That was every hint.</p>
            )}
          </div>

          {/* what interviewers look for */}
          <div className="mt-8">
            <button onClick={() => setLookFor((v) => !v)} aria-expanded={lookFor} className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 hover:text-[#0b1020]">
              What interviewers look for <ChevronDown className={cn("w-4 h-4 transition-transform", lookFor && "rotate-180")} />
            </button>
            {lookFor && (
              <ul className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {content.lookFor.map((l) => (
                  <li key={l} className="flex gap-2 text-sm leading-snug">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" strokeWidth={3} /> {l}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* editor / reference / notes */}
        <section data-vt-pane="cr-code" className={cn("min-h-0 flex-col rounded-2xl overflow-hidden border-2 border-[#0b1020] bg-[#0b1020] text-white shadow-[6px_6px_0_#2b4bff]", pane === "code" ? "flex" : "hidden lg:flex")}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#161c33] border-b border-white/10">
            <div className="flex items-center gap-1">
              {tabBtn("code", "solution.tsx", <Terminal className="w-3.5 h-3.5" />)}
              {tabBtn("reference", "reference", sess.revealed ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />)}
              {tabBtn("notes", "notes", null)}
            </div>
            {tab === "code" && (
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className={cn("font-semibold", draftState === "saving" ? "text-slate-400" : "text-emerald-300")}>
                  {draftState === "saving" ? "saving..." : draftState === "saved" ? "draft saved" : ""}
                </span>
                <div className="flex items-center rounded-md border border-white/20 overflow-hidden">
                  <button onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="px-2 py-0.5 hover:bg-white/10" aria-label="Smaller text">
                    A-
                  </button>
                  <span className="px-1.5 tabular-nums text-slate-400">{fontSize}</span>
                  <button onClick={() => setFontSize((s) => Math.min(22, s + 1))} className="px-2 py-0.5 hover:bg-white/10" aria-label="Larger text">
                    A+
                  </button>
                </div>
                <button onClick={askReset} className="flex items-center gap-1 hover:text-white" title="Back to the starter code">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            )}
          </div>

          {tab === "code" && (
            <>
              <div className="flex-1 min-h-0 overflow-auto">
                <CodeEditor value={code} onChange={onCode} lang="ts" fontSize={fontSize} errorLine={checking ? null : problems[0]?.line} onRun={openReview} />
              </div>
              {/* status bar: live compile result, then shortcuts */}
              <div className="min-h-8 px-3 py-1.5 bg-[#161c33] border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-x-4 gap-y-1 flex-wrap" aria-live="polite">
                {checkFailed ? (
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> Could not load the compiler, checks paused
                  </span>
                ) : checking && problems.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> Checking...
                  </span>
                ) : problems.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} /> Compiles
                  </span>
                ) : (
                  <button
                    onClick={() => jumpTo(problems[0].line, problems[0].col)}
                    title={problems.map((p) => `Line ${p.line}: ${p.message}`).join("\n")}
                    className="min-w-0 flex items-center gap-1.5 text-pink-300 font-semibold hover:text-pink-200 text-left"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {problems.length > 1 ? `${problems.length} problems · ` : ""}Line {problems[0].line}: {problems[0].message}
                    </span>
                  </button>
                )}
                <span className="ml-auto hidden md:flex gap-x-4">
                  <span>Ctrl/Cmd + Enter submit</span>
                  <span>Ctrl/Cmd + / comment</span>
                  <span>Draft saves automatically</span>
                </span>
              </div>
            </>
          )}

          {tab === "reference" && (
            <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 text-[#0b1020] bg-[#fff8ec]">
              {sess.revealed ? (
                <div className="-mt-6">
                  <CodePanel code={content.solution} lang="ts" title="Reference solution" />
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button onClick={askUseReference} className="h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white hover:bg-yellow-100 text-sm font-bold flex items-center gap-1.5">
                      <Copy className="w-4 h-4" /> Put it in my editor
                    </button>
                  </div>
                  <h3 className="mt-8 text-xs font-extrabold uppercase tracking-widest text-slate-500">Compare with your answer</h3>
                  <ul className="mt-3 space-y-2">
                    {content.lookFor.map((l) => (
                      <li key={l} className="flex gap-2 text-sm leading-snug">
                        <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" strokeWidth={3} /> {l}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-3">
                  <span className="w-14 h-14 rounded-full bg-yellow-300 border-2 border-[#0b1020] flex items-center justify-center">
                    <Lock className="w-6 h-6" />
                  </span>
                  <h2 className="text-xl font-extrabold">The reference solution is locked</h2>
                  <p className="text-slate-600 max-w-sm">Finish your own attempt first. Submitting unlocks it, or you can reveal it now.</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    <button onClick={openReview} className="h-10 px-4 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold shadow-[3px_3px_0_#0b1020]">
                      Submit my attempt
                    </button>
                    <button onClick={askReveal} className="h-10 px-4 rounded-xl border-2 border-[#0b1020] bg-white font-bold hover:bg-yellow-100">
                      Reveal anyway
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 text-[#0b1020] bg-[#fff8ec]">
              <div className="-mt-12">
                <NotesBox key={`note-${ch.id}`} value={study.notes[ch.id] ?? ""} onCommit={(t) => study.setNote(ch.id, t)} />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---------------- submit / self review ---------------- */}
      {review && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && closeReview()}>
          <div className="absolute inset-0 bg-[#0b1020]/60 backdrop-blur-[2px]" aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Review your attempt" className="relative w-full max-w-md rounded-2xl border-2 border-[#0b1020] bg-white p-6 shadow-[8px_8px_0_#0b1020] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">How did it go?</h2>
                <p className="text-sm text-slate-600 mt-1">Be honest. This is only for you.</p>
              </div>
              <button onClick={closeReview} aria-label="Close" className="w-8 h-8 rounded-lg border-2 border-[#0b1020] flex items-center justify-center hover:bg-yellow-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                [fmt(review.seconds), `of ${content.minutes}:00`],
                [`${checkedCount}/${content.requirements.length}`, "requirements"],
                [String(sess.hints), sess.hints === 1 ? "hint used" : "hints used"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl border-2 border-[#0b1020] bg-[#fff8ec] py-3">
                  <dt className="text-2xl font-extrabold tabular-nums leading-none">{v}</dt>
                  <dd className="mt-1 text-[11px] font-bold text-slate-500">{l}</dd>
                </div>
              ))}
            </dl>

            {/* automatic checks */}
            <ul className="mt-5 space-y-2 text-sm">
              {[
                {
                  ok: !untouched,
                  label: untouched ? "You have not changed the starter code yet" : "You wrote your own solution",
                },
                {
                  ok: compiles,
                  label: checkFailed
                    ? "Could not check that your code compiles"
                    : compiles
                      ? "Your code compiles"
                      : `${problems.length} syntax ${problems.length === 1 ? "problem" : "problems"}, first on line ${problems[0]?.line}`,
                  action: !compiles && !checkFailed ? () => (closeReview(), jumpTo(problems[0].line, problems[0].col)) : undefined,
                },
                {
                  ok: checkedCount === content.requirements.length,
                  label: `${checkedCount} of ${content.requirements.length} requirements covered`,
                  soft: true,
                },
              ].map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 border-[#0b1020] flex items-center justify-center shrink-0",
                      c.ok ? "bg-emerald-300" : c.soft ? "bg-amber-200" : "bg-pink-300"
                    )}
                  >
                    {c.ok ? <Check className="w-3 h-3" strokeWidth={4} /> : <span className="text-[11px] font-extrabold leading-none">!</span>}
                  </span>
                  <span className="flex-1 font-semibold leading-snug">{c.label}</span>
                  {c.action && (
                    <button onClick={c.action} className="text-xs font-extrabold underline underline-offset-2 hover:text-[#2b4bff]">
                      Show me
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => finish("nailed")}
                disabled={!canNail}
                title={canNail ? undefined : untouched ? "Write your solution first" : "Fix the syntax problems first"}
                className="h-12 rounded-xl bg-emerald-300 border-2 border-[#0b1020] font-extrabold flex items-center justify-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" strokeWidth={3} /> Nailed it
              </button>
              <button onClick={() => finish("needswork")} className="h-12 rounded-xl bg-pink-300 border-2 border-[#0b1020] font-extrabold flex items-center justify-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform">
                <Flag className="w-5 h-5" /> Needs more work
              </button>
              <button onClick={closeReview} className="h-10 rounded-xl font-bold text-slate-600 hover:bg-slate-100">
                Keep working
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {canNail ? "Either choice unlocks the reference solution." : "\"Nailed it\" unlocks once your code compiles and differs from the starter. \"Needs more work\" still unlocks the reference."}
            </p>
          </div>
        </div>
      )}

      <ChallengePicker
        open={picker}
        onClose={() => setPicker(false)}
        items={PICKER_ITEMS}
        currentId={ch.id}
        done={study.done}
        saved={study.saved}
        review={study.review}
        drafts={study.drafts}
        times={study.times}
        onPick={switchTo}
      />
      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

export default function CodingRoundPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#fff8ec]">
          <LogoMark className="w-14 h-14 text-xl rounded-xl shadow-[4px_4px_0_#0b1020] animate-bounce" />
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
