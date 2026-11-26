"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  Code2,
  Home as HomeIcon,
  Keyboard,
  Flame,
  Layers,
  Menu,
  Search,
  Shuffle,
  SlidersHorizontal,
  Timer,
  X,
} from "lucide-react";
import {
  ALL_QUESTIONS,
  HTML_CSS_QUESTIONS,
  JS_QUESTIONS,
  NEXTJS_QUESTIONS,
  REACT_HOOKS_QUESTIONS,
  REACT_QUESTIONS,
  TOPICS,
  type Difficulty,
  type Question,
  type Topic,
} from "@/lib/questions";
import { LogoMark } from "@/components/Logo";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { TopicSelector } from "@/components/devqna/TopicSelector";
import { QuestionItem } from "@/components/devqna/QuestionItem";
import { AnswerDisplay } from "@/components/devqna/AnswerDisplay";
import { StudyOverview, type TopicStat } from "@/components/devqna/StudyOverview";
import { ShortcutsDialog } from "@/components/devqna/ShortcutsDialog";
import { ConfirmDialog, type Ask } from "@/components/playground/ConfirmDialog";
import { useStudy } from "@/hooks/useStudy";
import { useToast } from "@/hooks/use-toast";
import { downloadText } from "@/lib/download";
import { DataSafetyBanner } from "@/components/devqna/DataSafetyBanner";
import { cn } from "@/lib/utils";

const BY_TOPIC: Record<Topic, Question[]> = {
  nextjs: NEXTJS_QUESTIONS,
  react: REACT_QUESTIONS,
  javascript: JS_QUESTIONS,
  "html-css": HTML_CSS_QUESTIONS,
  "react-hooks": REACT_HOOKS_QUESTIONS,
};

const TONE: Record<string, string> = {
  nextjs: "bg-slate-300",
  react: "bg-sky-300",
  javascript: "bg-yellow-300",
  "html-css": "bg-pink-300",
  "react-hooks": "bg-violet-300",
};

const TINT: Record<string, string> = {
  nextjs: "bg-slate-100",
  react: "bg-sky-100",
  javascript: "bg-yellow-100",
  "html-css": "bg-pink-100",
  "react-hooks": "bg-violet-100",
};

type Status = "all" | "todo" | "done" | "saved" | "review";
type Sort = "default" | "easy" | "hard" | "az" | "unfinished";

const RANK: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

const isTopic = (t: string | null): t is Topic => !!t && t in BY_TOPIC;

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

const select =
  "h-10 w-full rounded-xl border-2 border-[#0b1020] bg-white px-3 text-sm font-bold text-[#0b1020] outline-none focus:bg-yellow-50 cursor-pointer";

function DashboardContent() {
  const params = useSearchParams();
  const urlTopic = params.get("topic");
  const urlQ = params.get("q");
  const urlDifficulty = params.get("difficulty");
  const study = useStudy();
  const { toast } = useToast();

  const [topic, setTopic] = useState<Topic>(isTopic(urlTopic) ? urlTopic : "nextjs");
  const [selectedId, setSelectedId] = useState<string | null>(urlQ);
  const [view, setView] = useState<"study" | "overview">("study");
  const [query, setQuery] = useState("");
  const [dq, setDq] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "All">(
    urlDifficulty === "Easy" || urlDifficulty === "Medium" || urlDifficulty === "Hard" ? urlDifficulty : "All"
  );
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("default");
  const [sidebar, setSidebar] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resumed = useRef(false);

  /* ---------- layout ---------- */
  useEffect(() => {
    const onResize = () => setSidebar(window.innerWidth >= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDq(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- resume where you left off ---------- */
  useEffect(() => {
    if (!study.ready || resumed.current) return;
    resumed.current = true;
    if (!urlTopic && !urlQ && study.last && isTopic(study.last.topic)) {
      setTopic(study.last.topic);
      setSelectedId(study.last.id);
    }
  }, [study.ready, study.last, urlTopic, urlQ]);

  /* ---------- the list ---------- */
  const base = BY_TOPIC[topic];

  const list = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const out = base.filter((q) => {
      if (difficulty !== "All" && q.difficulty !== difficulty) return false;
      if (status === "todo" && study.done.has(q.id)) return false;
      if (status === "done" && !study.done.has(q.id)) return false;
      if (status === "saved" && !study.saved.has(q.id)) return false;
      if (status === "review" && !study.review.has(q.id)) return false;
      if (needle && !q.question.toLowerCase().includes(needle) && !q.answer.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === "easy") out.sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty]);
    else if (sort === "hard") out.sort((a, b) => RANK[b.difficulty] - RANK[a.difficulty]);
    else if (sort === "az") out.sort((a, b) => a.question.localeCompare(b.question));
    else if (sort === "unfinished") out.sort((a, b) => Number(study.done.has(a.id)) - Number(study.done.has(b.id)));
    return out;
  }, [base, dq, difficulty, status, sort, study.done, study.saved, study.review]);

  // the open question stays on screen even if a filter would hide it (e.g. after you master it)
  const current = useMemo(() => (selectedId ? base.find((q) => q.id === selectedId) ?? null : null), [base, selectedId]);

  useEffect(() => {
    if (view === "study" && !current && list.length) setSelectedId(list[0].id);
  }, [view, current, list]);

  const pos = current ? list.findIndex((q) => q.id === current.id) : -1;
  const hasPrev = pos > 0;
  const hasNext = list.length > 0 && pos < list.length - 1;

  /* ---------- remember + share the position ---------- */
  useEffect(() => {
    if (view !== "study" || !current) return;
    study.setLast(topic, current.id);
    window.history.replaceState(null, "", `/questions-answers?topic=${topic}&q=${current.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, topic, current?.id]);

  // keep the active question vertically centred in the sidebar list
  const centerActive = useCallback((smooth: boolean) => {
    const box = document.getElementById("question-list");
    const el = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!box || !el) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const top = box.scrollTop + (r.top - b.top) - (b.height - r.height) / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }, []);

  const firstCenter = useRef(true);
  useEffect(() => {
    const t = setTimeout(() => {
      centerActive(!firstCenter.current);
      firstCenter.current = false;
    }, 30);
    return () => clearTimeout(t);
  }, [current?.id, view, sidebar, list, centerActive]);

  const toTop = () => document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
  const closeDrawer = () => window.innerWidth < 768 && setSidebar(false);

  const goto = useCallback((id: string) => {
    setSelectedId(id);
    setView("study");
    toTop();
    closeDrawer();
  }, []);

  const open = useCallback((t: Topic, id: string, resetFilters = true) => {
    setTopic(t);
    setSelectedId(id);
    setView("study");
    if (resetFilters) {
      setQuery("");
      setDifficulty("All");
      setStatus("all");
    }
    toTop();
    closeDrawer();
  }, []);

  /* ---------- follow links that change ?topic / ?q / ?difficulty while already on this page ---------- */
  // (initial values are read by useState above; this handles later client-side navigations,
  //  e.g. Qubi's "See the answer" or footer links clicked from within the Q&A page)
  const lastUrl = useRef(`${urlTopic}|${urlQ}|${urlDifficulty}`);
  useEffect(() => {
    const key = `${urlTopic}|${urlQ}|${urlDifficulty}`;
    if (key === lastUrl.current) return;
    lastUrl.current = key;
    const t = isTopic(urlTopic) ? urlTopic : topic;
    if (urlQ) open(t, urlQ);
    else if (isTopic(urlTopic)) {
      setTopic(urlTopic);
      setSelectedId(null);
      setView("study");
      toTop();
    }
    if (urlDifficulty === "Easy" || urlDifficulty === "Medium" || urlDifficulty === "Hard") setDifficulty(urlDifficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTopic, urlQ, urlDifficulty, open]);

  const next = useCallback(() => {
    const target = pos === -1 ? list[0] : list[pos + 1];
    if (target) goto(target.id);
  }, [pos, list, goto]);
  const prev = useCallback(() => {
    if (pos > 0) goto(list[pos - 1].id);
  }, [pos, list, goto]);

  const random = useCallback(() => {
    const pool = list.filter((q) => !study.done.has(q.id));
    const from = pool.length ? pool : list;
    if (!from.length) return;
    goto(from[Math.floor(Math.random() * from.length)].id);
  }, [list, study.done, goto]);

  const randomAnywhere = () => {
    const pool = ALL_QUESTIONS.filter((q) => !study.done.has(q.id));
    const from = pool.length ? pool : ALL_QUESTIONS;
    const q = from[Math.floor(Math.random() * from.length)];
    open(q.topic, q.id);
  };

  const rate = useCallback(
    (result: "got" | "review") => {
      if (!current) return;
      if (result === "got") {
        if (!study.done.has(current.id)) study.toggleDone(current.id);
      } else study.flagReview(current.id);
      next();
    },
    [current, study, next]
  );

  /* ---------- keyboard (one listener for the page's lifetime) ---------- */
  const latest = useRef({ view, current, next, prev, random, study });
  latest.current = { view, current, next, prev, random, study };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) searchRef.current?.blur();
        return;
      }
      if (isTyping(e.target)) return;
      const { view, current, next, prev, random, study } = latest.current;
      switch (e.key) {
        case "/":
          e.preventDefault();
          if (window.innerWidth < 768) setSidebar(true);
          searchRef.current?.focus();
          break;
        case "?":
          setHelp(true);
          break;
        case "j":
        case "ArrowRight":
          if (view === "study") next();
          break;
        case "k":
        case "ArrowLeft":
          if (view === "study") prev();
          break;
        case "m":
          if (current && view === "study") study.toggleDone(current.id);
          break;
        case "b":
          if (current && view === "study") study.toggleSaved(current.id);
          break;
        case "r":
          if (current && view === "study") study.toggleReview(current.id);
          break;
        case "p":
          study.setPractice(!study.practice);
          break;
        case "g":
          random();
          break;
        case "o":
          setView((v) => (v === "overview" ? "study" : "overview"));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- derived numbers ---------- */
  const stats: TopicStat[] = useMemo(
    () =>
      TOPICS.map((t) => {
        const qs = BY_TOPIC[t.id as Topic];
        const done = qs.filter((q) => study.done.has(q.id)).length;
        return { id: t.id, label: t.label, done, percent: qs.length ? Math.round((done / qs.length) * 100) : 0, tone: TONE[t.id] };
      }),
    [study.done]
  );
  const percent = useMemo(() => Object.fromEntries(stats.map((s) => [s.id, s.percent])), [stats]);
  const topicPercent = percent[topic] ?? 0;

  const counts = useMemo(
    () => ({
      done: base.filter((q) => study.done.has(q.id)).length,
      saved: base.filter((q) => study.saved.has(q.id)).length,
      review: base.filter((q) => study.review.has(q.id)).length,
    }),
    [base, study.done, study.saved, study.review]
  );

  const filtersOn = !!dq.trim() || difficulty !== "All" || status !== "all";
  const clearFilters = () => {
    setQuery("");
    setDifficulty("All");
    setStatus("all");
  };

  /* ---------- overview actions ---------- */
  const openFiltered = (set: Set<string>, s: Status) => {
    const q = ALL_QUESTIONS.find((x) => set.has(x.id));
    if (!q) return;
    open(q.topic, q.id);
    setStatus(s);
  };

  const exportData = () => downloadText("devqna-progress.json", study.exportJson());
  const importData = (text: string) => {
    if (study.importJson(text)) toast({ title: "Backup merged into your progress", description: "Nothing you already had was removed." });
    else toast({ title: "That file could not be read", description: "Pick a backup exported from DevQnA.", variant: "destructive" });
  };
  const askRestore = () => {
    const b = study.backup;
    if (!b) return;
    setAsk({
      title: "Restore your saved copy?",
      message: `It has ${b.done} mastered, ${b.saved} saved, ${b.review} to review and ${b.notes} notes. It is merged with what you have now, so newer progress is kept too.`,
      confirmLabel: "Restore",
      tone: "info",
      onConfirm: () => {
        const ok = study.restoreBackup();
        toast({ title: ok ? "Copy restored" : "Could not restore the copy", variant: ok ? undefined : "destructive" });
      },
    });
  };
  const askReset = () =>
    setAsk({
      title: "Reset all progress?",
      message: "This clears mastered questions, bookmarks, review flags, notes and your streak on this device. A copy is kept so you can restore it from the overview if you change your mind.",
      confirmLabel: "Reset everything",
      tone: "danger",
      onConfirm: () => {
        study.resetAll();
        toast({ title: "Progress reset" });
      },
    });

  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;

  const chip = (s: Status, label: string, n?: number) => (
    <button
      key={s}
      onClick={() => setStatus(s)}
      aria-pressed={status === s}
      className={cn(
        "px-2.5 py-1 rounded-full border-2 border-[#0b1020] text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0",
        status === s ? "bg-[#0b1020] text-white" : "bg-white hover:bg-yellow-100"
      )}
    >
      {label}
      {n ? <span className={cn("text-[10px] tabular-nums rounded-full px-1.5", status === s ? "bg-yellow-300 text-[#0b1020]" : "bg-slate-100")}>{n}</span> : null}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#fff8ec] text-[#0b1020] overflow-hidden">
      {sidebar && (
        <div className="fixed inset-0 bg-[#0b1020]/40 backdrop-blur-[2px] z-[45] md:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* ---------------- sidebar ---------------- */}
      <aside
        className={cn(
          "bg-white border-r-2 border-[#0b1020] flex flex-col shrink-0 z-50 fixed md:relative h-full left-0 top-0 transition-all duration-300 ease-in-out w-[88vw] max-w-[380px] md:w-[380px]",
          sidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        <div className="p-4 md:p-5 border-b-2 border-[#0b1020] space-y-3.5 shrink-0">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <LogoMark className="w-9 h-9 shadow-[2px_2px_0_#0b1020] group-hover:-rotate-6 transition-transform" />
              <span className="text-lg font-extrabold tracking-tight">DevQnA</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/playground" title="Playground" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-yellow-100">
                <Code2 className="w-4 h-4" />
              </Link>
              <Link href="/" title="Home" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-yellow-100">
                <HomeIcon className="w-4 h-4" />
              </Link>
              <button onClick={() => setSidebar(false)} aria-label="Close menu" className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-yellow-100">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <TopicSelector
            currentTopic={topic}
            percent={percent}
            onTopicChange={(t) => {
              setTopic(t);
              setSelectedId(null);
              setQuery("");
              setView("study");
            }}
          />

          {/* current topic + progress */}
          <div className={cn("rounded-2xl border-2 border-[#0b1020] p-3.5 transition-colors duration-300", TINT[topic])}>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">Studying</div>
                <div className="text-xl font-extrabold leading-tight truncate">{topicLabel}</div>
              </div>
              <div className="font-extrabold tabular-nums leading-none">
                <span className="text-3xl">{topicPercent}</span>
                <span className="text-base">%</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white border-2 border-[#0b1020] overflow-hidden">
              <div className={cn("h-full border-r-2 border-[#0b1020] transition-[width] duration-500", TONE[topic])} style={{ width: `${topicPercent}%`, borderRightWidth: topicPercent ? 2 : 0 }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
              <span>{counts.done} mastered</span>
              {study.streak > 0 ? (
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-300" />
                  {study.streak} day streak
                </span>
              ) : (
                <span className="text-slate-500 font-semibold">Master one to start a streak</span>
              )}
            </div>
          </div>

          {/* status filters + more filters */}
          <div>
            <div className="flex items-center gap-2">
              <ScrollRow wrapperClassName="flex-1 min-w-0" className="flex gap-1.5 py-1 -my-1 px-0.5">
                {chip("all", "All")}
                {chip("todo", "To do")}
                {chip("done", "Mastered", counts.done)}
                {chip("review", "Review", counts.review)}
                {chip("saved", "Saved", counts.saved)}
              </ScrollRow>
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-label="More filters"
                title="Difficulty and sort"
                className={cn(
                  "relative shrink-0 h-8 w-9 rounded-full border-2 border-[#0b1020] flex items-center justify-center transition-colors",
                  filtersOpen ? "bg-yellow-300" : "bg-white hover:bg-yellow-100"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(difficulty !== "All" || sort !== "default") && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-400 border-2 border-[#0b1020]" />
                )}
              </button>
            </div>

            {filtersOpen && (
              <div className="mt-3 rounded-xl border-2 border-[#0b1020] bg-[#fff8ec] p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Difficulty</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        aria-pressed={difficulty === d}
                        className={cn(
                          "px-2.5 py-1 rounded-full border-2 border-[#0b1020] text-xs font-bold flex items-center gap-1.5 transition-colors",
                          difficulty === d ? "bg-[#0b1020] text-white" : "bg-white hover:bg-yellow-100"
                        )}
                      >
                        {d !== "All" && (
                          <span className={cn("w-2 h-2 rounded-full border border-[#0b1020]", d === "Easy" ? "bg-emerald-300" : d === "Medium" ? "bg-amber-300" : "bg-rose-400")} />
                        )}
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Sort by</div>
                  <select aria-label="Sort" className={select} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    <option value="default">Original order</option>
                    <option value="unfinished">Unfinished first</option>
                    <option value="easy">Easy to hard</option>
                    <option value="hard">Hard to easy</option>
                    <option value="az">A to Z</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {filtersOn && (
          <div className="px-4 py-2 bg-yellow-100 border-b-2 border-[#0b1020] flex items-center justify-between text-sm font-bold shrink-0">
            <span>
              {list.length} {list.length === 1 ? "match" : "matches"}
            </span>
            <button onClick={clearFilters} className="underline underline-offset-2 hover:text-[#2b4bff]">
              Clear filters
            </button>
          </div>
        )}

        <div id="question-list" className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-[#fffdf8]">
          {list.length ? (
            <div className="space-y-1.5">
              {list.map((q) => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  query={dq}
                  isActive={current?.id === q.id && view === "study"}
                  isDone={study.done.has(q.id)}
                  isSaved={study.saved.has(q.id)}
                  isReview={study.review.has(q.id)}
                  hasNote={!!study.notes[q.id]}
                  onSelect={goto}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <Search className="w-10 h-10 mx-auto text-slate-300" />
              <p className="mt-3 font-extrabold">Nothing matches.</p>
              <p className="text-sm text-slate-500 mt-1">Try a different word, or loosen the filters.</p>
              {filtersOn && (
                <button onClick={clearFilters} className="mt-4 h-10 px-4 rounded-xl bg-yellow-300 border-2 border-[#0b1020] text-sm font-extrabold">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <DataSafetyBanner study={study} />
        <header data-site-header className="h-14 sm:h-16 border-b-2 border-[#0b1020] flex items-center justify-between px-3 sm:px-5 gap-2 sm:gap-3 shrink-0 bg-white z-40">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebar((s) => !s)}
              aria-label={sidebar ? "Hide questions" : "Show questions"}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-yellow-100 shrink-0"
            >
              {sidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Layers className="w-4 h-4 shrink-0" />
              <span className="font-bold text-[#0b1020] shrink-0">{view === "overview" ? "Overview" : topicLabel}</span>
              {view === "study" && current && (
                <>
                  <span className="opacity-40 hidden lg:inline">/</span>
                  <span className="truncate hidden lg:inline">{current.question}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="relative w-[120px] sm:w-[190px] md:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value && !sidebar && window.innerWidth >= 768) setSidebar(true);
                }}
                placeholder="Search"
                aria-label="Search questions"
                className="w-full h-10 pl-9 pr-8 rounded-full border-2 border-[#0b1020] bg-[#fff8ec] text-sm outline-none focus:bg-white"
              />
              {query ? (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0b1020]">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 font-code text-[10px] font-bold text-slate-400 border border-slate-300 rounded px-1">/</kbd>
              )}
            </div>

            <button
              onClick={() => study.setPractice(!study.practice)}
              aria-pressed={study.practice}
              title="Practice mode (p): hide the answer until you reveal it"
              className={cn(
                "h-10 px-3 rounded-full border-2 border-[#0b1020] text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0",
                study.practice ? "bg-yellow-300 shadow-[2px_2px_0_#0b1020]" : "bg-white hover:bg-yellow-100"
              )}
            >
              <Timer className="w-4 h-4" />
              <span className="hidden md:inline">Practice</span>
            </button>
            <button
              onClick={random}
              title="Random question (g)"
              aria-label="Random question"
              className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center hover:bg-yellow-100"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView((v) => (v === "overview" ? "study" : "overview"))}
              title="Overview (o)"
              aria-label="Overview"
              aria-pressed={view === "overview"}
              className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", view === "overview" ? "bg-[#0b1020] text-white" : "hover:bg-yellow-100")}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHelp(true)}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center hover:bg-yellow-100"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div id="main-content" className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {view === "overview" ? (
              <StudyOverview
                stats={stats}
                streak={study.streak}
                today={study.todayCount}
                reviewCount={study.review.size}
                savedCount={study.saved.size}
                hasLast={!!study.last}
                onOpenTopic={(id) => {
                  setTopic(id as Topic);
                  setSelectedId(null);
                  setView("study");
                }}
                onContinue={() => study.last && isTopic(study.last.topic) && open(study.last.topic, study.last.id)}
                onRandom={randomAnywhere}
                onReview={() => openFiltered(study.review, "review")}
                onSaved={() => openFiltered(study.saved, "saved")}
                onExport={exportData}
                onImport={importData}
                onReset={askReset}
                onRestore={askRestore}
                save={study.save}
                backup={study.backup}
              />
            ) : current ? (
              <AnswerDisplay
                key={current.id}
                question={current}
                isDone={study.done.has(current.id)}
                isSaved={study.saved.has(current.id)}
                isReview={study.review.has(current.id)}
                note={study.notes[current.id] ?? ""}
                practice={study.practice}
                onToggleDone={() => study.toggleDone(current.id)}
                onToggleSaved={() => study.toggleSaved(current.id)}
                onToggleReview={() => study.toggleReview(current.id)}
                onNote={(t) => study.setNote(current.id, t)}
                onRate={rate}
                onNext={next}
                onPrev={prev}
                hasNext={hasNext}
                hasPrev={hasPrev}
              />
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center gap-3">
                <Search className="w-12 h-12 text-slate-300" />
                <h2 className="text-2xl font-extrabold">No question to show</h2>
                <p className="text-slate-600 max-w-sm">Nothing matches your filters. Clear them to see the whole topic.</p>
                <button onClick={clearFilters} className="mt-2 h-11 px-5 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold shadow-[3px_3px_0_#0b1020]">
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#fff8ec]">
          <LogoMark className="w-14 h-14 text-xl rounded-xl shadow-[4px_4px_0_#0b1020] animate-bounce" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
