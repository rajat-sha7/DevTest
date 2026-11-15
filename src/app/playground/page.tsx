"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Download,
  Lightbulb,
  Play,
  RotateCcw,
  Share2,
  Square,
  Trophy,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { CodeEditor, type Lang } from "@/components/playground/CodeEditor";
import { ConsolePanel, type Entry } from "@/components/playground/ConsolePanel";
import { ConfirmDialog, type Ask } from "@/components/playground/ConfirmDialog";
import { fromB64, toB64 } from "@/lib/playground/share";
import { readRaw, writeRaw, type WriteResult } from "@/lib/storage";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { runInWorker, type TestResult, type WorkerMsg } from "@/lib/playground/runner";
import {
  CHALLENGES,
  DEFAULT_BUFFERS,
  JS_EXAMPLES,
  TS_EXAMPLES,
  WEB_EXAMPLES,
  type Buffers,
  type Challenge,
  type FileKey,
  type Mode,
} from "@/lib/playground/content";

/* ----------------------------- helpers ----------------------------- */

const STORE = "pg-v2";
const SNIPS = "pg-snippets";

interface Snippet {
  id: string;
  name: string;
  mode: Mode;
  buf: Buffers;
  /** made automatically before something replaced your code */
  auto?: boolean;
}

const MAX_ENTRIES = 1500;
const MAX_AUTO_SNIPPETS = 8;

const LANG: Record<FileKey, Lang> = { js: "js", ts: "ts", html: "html", css: "css", wjs: "js" };
const FILE_LABEL: Record<FileKey, string> = { js: "main.js", ts: "main.ts", html: "index.html", css: "style.css", wjs: "script.js" };

const BRIDGE = `(function(){function f(a){return a.map(function(x){if(typeof x==='string')return x;try{return JSON.stringify(x)}catch(e){return String(x)}}).join(' ')}
['log','info','warn','error','debug'].forEach(function(k){var o=console[k];console[k]=function(){parent.postMessage({__pg:1,kind:k==='debug'?'log':k,text:f([].slice.call(arguments))},'*');o.apply(console,arguments)}});
window.addEventListener('error',function(e){parent.postMessage({__pg:1,kind:'error',text:e.message||'Error'},'*')});
window.addEventListener('unhandledrejection',function(e){parent.postMessage({__pg:1,kind:'error',text:'Unhandled: '+(e.reason&&e.reason.message||e.reason)},'*')});})();`;

function buildDoc(b: Buffers) {
  const safe = (s: string) => s.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${b.css}</style></head><body>${b.html}<script>${BRIDGE}</script><script>${safe(
    b.wjs
  )}</script></body></html>`;
}

const LEVEL_CHIP: Record<string, string> = {
  Easy: "bg-emerald-300",
  Medium: "bg-amber-300",
  Hard: "bg-rose-400",
};

type Status = "idle" | "running" | "done" | "error" | "stopped" | "timeout";

/* ------------------------------- page ------------------------------- */

export default function Playground() {
  const [mode, setMode] = useState<Mode>("js");
  const [buf, setBuf] = useState<Buffers>(DEFAULT_BUFFERS);
  const [file, setFile] = useState<FileKey>("html");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [passed, setPassed] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [autoRun, setAutoRun] = useState(false);
  const [rightTab, setRightTab] = useState<"preview" | "console">("preview");
  const [previewDoc, setPreviewDoc] = useState("");
  const [snips, setSnips] = useState<Snippet[]>([]);
  const [snipOpen, setSnipOpen] = useState(false);
  const [snipName, setSnipName] = useState("");
  const [toast, setToast] = useState("");
  const [activeExample, setActiveExample] = useState("");
  const [ready, setReady] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [storageErr, setStorageErr] = useState<WriteResult | null>(null);

  const idRef = useRef(1);
  const handle = useRef<{ stop: () => void } | null>(null);
  const t0 = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const key: FileKey = mode === "web" ? file : mode;
  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  /* Console output is batched (one render per 50ms, however fast code logs) and capped, so a
     chatty or runaway program can never grow memory without limit or freeze the page. */
  const buffer = useRef<Entry[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidden = useRef(0);

  const clearEntries = useCallback(() => {
    buffer.current = [];
    hidden.current = 0;
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    setEntries([]);
  }, []);

  const push = useCallback((e: Omit<Entry, "id">) => {
    const text = typeof e.text === "string" && e.text.length > 20000 ? e.text.slice(0, 20000) + " ... (truncated)" : e.text;
    buffer.current.push({ ...e, text, id: idRef.current++ });
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const add = buffer.current;
      buffer.current = [];
      setEntries((prev) => {
        let next = prev.filter((x) => x.id !== -1).concat(add);
        if (next.length > MAX_ENTRIES) {
          const cut = next.length - MAX_ENTRIES;
          hidden.current += cut;
          next = next.slice(cut);
        }
        return hidden.current ? [{ id: -1, kind: "system", text: `... ${hidden.current} earlier lines hidden to save memory ...` }, ...next] : next;
      });
    }, 50);
  }, []);

  useEffect(
    () => () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    },
    []
  );

  /* Copies your code into My snippets before something replaces it, so nothing you wrote is lost. */
  const stash = (reason: string, source: { mode: Mode; buf: Buffers } = { mode, buf }) => {
    const relevant = source.mode === "web" ? (["html", "css", "wjs"] as const) : ([source.mode] as const);
    const same = (a: Buffers, b: Buffers) => relevant.every((k) => a[k] === b[k]);
    if (same(source.buf, DEFAULT_BUFFERS)) return;
    setSnips((list) => {
      if (list.some((s) => s.mode === source.mode && same(s.buf, source.buf))) return list;
      const entry: Snippet = { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name: `Auto-saved: before ${reason}`, mode: source.mode, buf: source.buf, auto: true };
      const autos = list.filter((s) => s.auto);
      const dropIds = new Set(autos.slice(MAX_AUTO_SNIPPETS - 1).map((s) => s.id));
      return [entry, ...list.filter((s) => !dropIds.has(s.id))];
    });
    say("Your previous code was kept in My snippets");
  };

  /* ---- load / persist ---- */
  useEffect(() => {
    let stored: { mode?: Mode; buf?: Partial<Buffers> } | null = null;

    const saved = readRaw(STORE);
    if (saved.blocked) setStorageErr("blocked");
    else if (saved.value) {
      try {
        const s = JSON.parse(saved.value);
        stored = s;
        if (s.buf) setBuf({ ...DEFAULT_BUFFERS, ...s.buf });
        if (s.mode) setMode(s.mode);
        if (Array.isArray(s.passed)) setPassed(s.passed);
        if (s.fontSize) setFontSize(s.fontSize);
        if (typeof s.autoRun === "boolean") setAutoRun(s.autoRun);
      } catch {
        writeRaw(STORE + ".corrupt", saved.value); // unreadable: keep a copy instead of overwriting it
        say("Saved code could not be read. A copy was kept.");
      }
    }

    let list: Snippet[] = [];
    const sn = readRaw(SNIPS);
    if (sn.value) {
      try {
        const parsed = JSON.parse(sn.value);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        writeRaw(SNIPS + ".corrupt", sn.value);
      }
    }

    try {
      const m = /^#s=(.+)$/.exec(location.hash);
      if (m) {
        const d = JSON.parse(fromB64(m[1]));
        const incoming = { ...DEFAULT_BUFFERS, ...(d.b || {}) } as Buffers;
        // opening a shared link must not wipe your own saved code: keep it as an auto snippet first
        if (stored?.buf) {
          const mine = { ...DEFAULT_BUFFERS, ...stored.buf } as Buffers;
          const myMode: Mode = stored.mode ?? "js";
          const keys = myMode === "web" ? (["html", "css", "wjs"] as const) : ([myMode] as const);
          const differs = keys.some((k) => mine[k] !== DEFAULT_BUFFERS[k] && mine[k] !== incoming[k]);
          const already = list.some((s) => s.mode === myMode && keys.every((k) => s.buf[k] === mine[k]));
          if (differs && !already) {
            list = [{ id: String(Date.now()), name: "Auto-saved: before opening a shared link", mode: myMode, buf: mine, auto: true }, ...list];
            say("Your own code was kept in My snippets");
          }
        }
        setBuf(incoming);
        if (d.m) setMode(d.m);
      }
    } catch {}

    setSnips(list);
    setReady(true);
  }, []);

  const onSaveResult = useCallback((r: WriteResult) => setStorageErr(r === "ok" ? null : r), []);
  useDebouncedSave(STORE, { mode, buf, passed, fontSize, autoRun }, ready, onSaveResult);
  useDebouncedSave(SNIPS, snips, ready, onSaveResult);

  /* ---- messages from the live preview iframe ---- */
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e.data || !e.data.__pg || e.source !== iframeRef.current?.contentWindow) return;
      const kind = ["log", "info", "warn", "error"].includes(e.data.kind) ? e.data.kind : "log";
      push({ kind, text: String(e.data.text ?? "").slice(0, 5000) });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [push]);

  /* ---- running JS / TS ---- */
  const onWorkerMsg = useCallback(
    (m: WorkerMsg) => {
      switch (m.type) {
        case "out":
          push({ kind: m.kind, text: m.text, indent: m.indent });
          break;
        case "table":
          push({ kind: "table", head: m.head, rows: m.rows, indent: m.indent });
          break;
        case "clear":
          clearEntries();
          break;
        case "result":
          push({ kind: "result", text: "↩ " + m.value });
          break;
        case "error":
          push({ kind: "error", text: `${m.name}: ${m.message}`, line: m.line });
          if (m.line) setErrorLine(m.line);
          setStatus("error");
          break;
        case "tests":
          setTests(m.results);
          if (challenge && m.results.every((r) => r.pass)) setPassed((p) => (p.includes(challenge.id) ? p : [...p, challenge.id]));
          break;
      }
    },
    [push, challenge]
  );

  const stop = () => handle.current?.stop();

  const run = useCallback(async () => {
    if (mode === "web") {
      clearEntries();
      setPreviewDoc(buildDoc(buf));
      return;
    }
    handle.current?.stop();
    clearEntries();
    setErrorLine(null);
    setTests(null);
    setMs(null);
    setStatus("running");
    let code = buf[mode];

    if (mode === "ts") {
      try {
        const mod: any = await import("typescript");
        const ts = mod.default ?? mod;
        const r = ts.transpileModule(code, {
          reportDiagnostics: true,
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true },
        });
        const d = r.diagnostics?.[0];
        if (d) {
          const line = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined;
          push({ kind: "error", text: "SyntaxError: " + ts.flattenDiagnosticMessageText(d.messageText, "\n"), line });
          if (line) setErrorLine(line);
          setStatus("error");
          return;
        }
        code = r.outputText;
      } catch (e) {
        push({ kind: "error", text: "Could not load the TypeScript compiler: " + (e as Error).message });
        setStatus("error");
        return;
      }
    }

    t0.current = performance.now();
    let hadError = false;
    handle.current = runInWorker({
      code,
      test: challenge && mode === "js" ? { fn: challenge.fn, cases: challenge.cases } : undefined,
      onMsg: (m) => {
        if (m.type === "error") hadError = true;
        onWorkerMsg(m);
      },
      onEnd: (reason) => {
        setMs(Math.round(performance.now() - t0.current));
        if (reason === "stopped") {
          push({ kind: "system", text: "Stopped." });
          setStatus("stopped");
        } else if (reason === "timeout") setStatus("timeout");
        else setStatus(hadError ? "error" : "done");
        handle.current = null;
        setEntries((p) => (p.length ? p : [{ id: idRef.current++, kind: "system", text: "(no output - try console.log)" }]));
      },
    });
  }, [mode, buf, challenge, onWorkerMsg, push]);

  const runRef = useRef(run);
  runRef.current = run;

  /* ---- auto-run (js/ts) and live preview (web) ---- */
  useEffect(() => {
    if (!ready) return;
    if (mode === "web") {
      const t = setTimeout(() => {
        clearEntries();
        setPreviewDoc(buildDoc(buf));
      }, 400);
      return () => clearTimeout(t);
    }
    if (autoRun) {
      const t = setTimeout(() => runRef.current(), 800);
      return () => clearTimeout(t);
    }
  }, [ready, mode, buf, autoRun]);

  useEffect(() => () => handle.current?.stop(), []);

  /* ---- actions ---- */
  const setCode = (v: string) => setBuf((b) => ({ ...b, [key]: v }));

  const resetOutput = () => {
    handle.current?.stop();
    clearEntries();
    setTests(null);
    setErrorLine(null);
    setStatus("idle");
    setMs(null);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    resetOutput();
    setChallenge(null);
    setActiveExample("");
    setMode(m);
    if (m === "web") setRightTab("preview");
  };

  const loadExample = (name: string) => {
    stash("loading the " + name + " example");
    resetOutput();
    setChallenge(null);
    setActiveExample(name);
    if (mode === "js") setBuf((b) => ({ ...b, js: JS_EXAMPLES.find((e) => e.name === name)!.code }));
    else if (mode === "ts") setBuf((b) => ({ ...b, ts: TS_EXAMPLES.find((e) => e.name === name)!.code }));
    else {
      const w = WEB_EXAMPLES.find((e) => e.name === name)!;
      setBuf((b) => ({ ...b, html: w.html, css: w.css, wjs: w.js }));
    }
  };

  const openChallenge = (c: Challenge) => {
    stash("starting " + c.title, { mode: "js", buf });
    resetOutput();
    setMode("js");
    setChallenge(c);
    setActiveExample("");
    setHint(false);
    setBuf((b) => ({ ...b, js: c.starter }));
  };

  const doReset = () => {
    stash("a reset");
    resetOutput();
    setChallenge(null);
    setActiveExample("");
    if (mode === "web") setBuf((b) => ({ ...b, html: DEFAULT_BUFFERS.html, css: DEFAULT_BUFFERS.css, wjs: DEFAULT_BUFFERS.wjs }));
    else setBuf((b) => ({ ...b, [mode]: DEFAULT_BUFFERS[mode] }));
  };
  const reset = () =>
    setAsk({
      title: "Reset the editor?",
      message: "Your code in this mode goes back to the starter template. This can't be undone.",
      confirmLabel: "Reset",
      tone: "danger",
      icon: <RotateCcw className="w-5 h-5" />,
      onConfirm: doReset,
    });

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${toB64(JSON.stringify({ m: mode, b: buf }))}`;
    try {
      await navigator.clipboard.writeText(url);
      say(url.length > 6000 ? "Link copied (it is long)" : "Link copied");
    } catch {
      say("Could not copy the link");
    }
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(buf[key]);
      say("Code copied");
    } catch {}
  };
  const download = () => {
    const isWeb = mode === "web";
    const text = isWeb ? buildDoc(buf).replace(`<script>${BRIDGE}</script>`, "") : buf[mode];
    const name = isWeb ? "index.html" : mode === "ts" ? "main.ts" : "main.js";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveSnippet = () => {
    const name = snipName.trim() || `Snippet ${snips.length + 1}`;
    setSnips((s) => [{ id: String(Date.now()), name, mode, buf }, ...s]);
    setSnipName("");
    say("Saved");
  };
  const loadSnippet = (s: Snippet) => {
    stash("opening " + s.name.replace(/^Auto-saved: /, ""));
    resetOutput();
    setChallenge(null);
    setBuf({ ...DEFAULT_BUFFERS, ...s.buf });
    setMode(s.mode);
    setSnipOpen(false);
  };

  /* ---- derived ---- */
  const examples = mode === "js" ? JS_EXAMPLES : mode === "ts" ? TS_EXAMPLES : WEB_EXAMPLES;
  const allPass = !!tests && tests.length > 0 && tests.every((t) => t.pass);
  const passCount = tests ? tests.filter((t) => t.pass).length : 0;
  const nextChallenge = challenge ? CHALLENGES[(CHALLENGES.findIndex((c) => c.id === challenge.id) + 1) % CHALLENGES.length] : null;
  const running = status === "running";
  const badge = running ? "Running…" : ms !== null ? `${ms} ms` : null;
  const consoleHint = mode === "web" ? "console.log from your page shows up here." : "Press Run to see your output here.";

  const modes: [Mode, string][] = [
    ["js", "JavaScript"],
    ["ts", "TypeScript"],
    ["web", "HTML · CSS · JS"],
  ];

  const btn = "h-10 px-3 sm:px-4 rounded-lg border-2 border-white/80 font-bold text-sm hover:bg-white hover:text-[#2b4bff] transition-colors flex items-center gap-2";

  return (
    <div className="min-h-screen bg-[#fff8ec] text-[#0b1020] flex flex-col">
      {/* header */}
      <header className="sticky top-0 z-30 bg-[#2b4bff] text-white border-b-2 border-[#0b1020]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" aria-label="Back to home" className="p-2 -ml-2 rounded-lg hover:bg-white/15">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <LogoMark className="hidden sm:inline-flex" />
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight truncate">Playground</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button onClick={share} className={btn} aria-label="Copy share link" title="Copy a link to this code">
              <Share2 className="w-4 h-4" />
              <span className="hidden lg:inline">Share</span>
            </button>
            <button onClick={copyCode} className={`${btn} hidden sm:flex`} aria-label="Copy code" title="Copy code">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={download} className={`${btn} hidden sm:flex`} aria-label="Download" title="Download file">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={reset} className={btn} aria-label="Reset" title="Reset editor">
              <RotateCcw className="w-4 h-4" />
            </button>
            {running ? (
              <button
                onClick={stop}
                className="h-10 px-4 sm:px-5 rounded-lg bg-pink-400 text-[#0b1020] font-extrabold border-2 border-[#0b1020] shadow-[3px_3px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" /> Stop
              </button>
            ) : (
              <button
                onClick={run}
                className="h-10 px-4 sm:px-5 rounded-lg bg-yellow-300 text-[#0b1020] font-extrabold border-2 border-[#0b1020] shadow-[3px_3px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                {mode === "web" ? "Refresh" : "Run"}
                <kbd className="hidden md:inline text-[11px] font-code font-semibold bg-[#0b1020]/10 rounded px-1.5 py-0.5">⌘ ↵</kbd>
              </button>
            )}
          </div>
        </div>
      </header>

      {storageErr && (
        <div role="alert" className="bg-rose-300 border-b-2 border-[#0b1020] px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
          <span className="flex-1 min-w-[220px]">
            {storageErr === "quota"
              ? "Your browser storage is full, so your latest code is not being saved."
              : "Your browser is blocking storage, so your code will be lost when you close this tab."}{" "}
            Download a copy so nothing is lost.
          </span>
          <button onClick={download} className="h-8 px-3 rounded-lg bg-white border-2 border-[#0b1020] font-extrabold flex items-center gap-1.5 hover:bg-yellow-200">
            <Download className="w-4 h-4" /> Download code
          </button>
        </div>
      )}

      {/* pickers */}
      <section className="border-b-2 border-[#0b1020] bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border-2 border-[#0b1020] overflow-hidden bg-[#fff8ec] max-w-full overflow-x-auto">
              {modes.map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`px-3.5 sm:px-4 py-2 text-sm font-extrabold whitespace-nowrap transition-colors ${
                    mode === m ? "bg-[#0b1020] text-white" : "hover:bg-yellow-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setSnipOpen((o) => !o)}
                className="h-10 px-3.5 rounded-lg border-2 border-[#0b1020] font-bold text-sm flex items-center gap-2 hover:bg-yellow-200 transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                My snippets{snips.length ? ` (${snips.length})` : ""}
              </button>
              {snipOpen && (
                <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border-2 border-[#0b1020] bg-white p-3 shadow-[5px_5px_0_#0b1020]">
                  <div className="flex gap-2">
                    <input
                      value={snipName}
                      onChange={(e) => setSnipName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveSnippet()}
                      placeholder="Name this snippet"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-[#0b1020] text-sm outline-none focus:bg-yellow-50"
                    />
                    <button onClick={saveSnippet} className="px-3 rounded-lg bg-yellow-300 border-2 border-[#0b1020] font-bold text-sm">
                      Save
                    </button>
                  </div>
                  <ul className="mt-3 max-h-56 overflow-auto space-y-1.5">
                    {snips.length === 0 && <li className="text-sm text-slate-500 px-1">Nothing saved yet.</li>}
                    {snips.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                        <button onClick={() => loadSnippet(s)} className="flex-1 min-w-0 text-left text-sm font-semibold truncate hover:underline">
                          {s.name}
                        </button>
                        <span className="text-[10px] font-bold uppercase text-slate-500">{s.auto ? "auto · " : ""}{s.mode}</span>
                        <button
                          onClick={() => setSnips((l) => l.filter((x) => x.id !== s.id))}
                          aria-label={`Delete ${s.name}`}
                          className="text-slate-400 hover:text-pink-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
            <span className="sm:w-24 shrink-0 sm:pt-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Examples</span>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => loadExample(ex.name)}
                  className={`px-3.5 py-1.5 rounded-full border-2 border-[#0b1020] text-sm font-bold transition-all hover:-translate-y-0.5 ${
                    activeExample === ex.name && !challenge ? "bg-[#0b1020] text-white" : "bg-sky-200 hover:bg-sky-300"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3">
            <span className="sm:w-24 shrink-0 sm:pt-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Challenges</span>
            <div className="flex flex-wrap gap-2">
              {CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openChallenge(c)}
                  className={`px-3.5 py-1.5 rounded-full border-2 border-[#0b1020] text-sm font-bold transition-all hover:-translate-y-0.5 flex items-center gap-1.5 ${
                    challenge?.id === c.id ? "bg-[#0b1020] text-white" : "bg-yellow-200 hover:bg-yellow-300"
                  }`}
                >
                  {passed.includes(c.id) ? <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} /> : <Trophy className="w-3.5 h-3.5" />}
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* challenge panel */}
      {challenge && (
        <div className="bg-yellow-300 border-b-2 border-[#0b1020]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Trophy className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="font-semibold leading-snug">
                  <span className="font-extrabold">{challenge.title}</span>
                  <span className={`ml-2 text-xs font-bold rounded-full border border-[#0b1020] px-2 py-0.5 align-middle ${LEVEL_CHIP[challenge.level]}`}>
                    {challenge.level}
                  </span>
                  <span className="block sm:inline sm:ml-2">{challenge.brief}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setHint((h) => !h)}
                  className="h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white text-sm font-bold flex items-center gap-1.5 hover:bg-[#0b1020] hover:text-white transition-colors"
                >
                  <Lightbulb className="w-4 h-4" /> Hint
                </button>
                <button
                  onClick={() =>
                    setAsk({
                      title: "Show the solution?",
                      message: "It will replace what you have written. Try the hint first, you might be closer than you think.",
                      confirmLabel: "Show solution",
                      tone: "info",
                      icon: <Lightbulb className="w-5 h-5" />,
                      onConfirm: () => setCode(challenge.solution),
                    })
                  }
                  className="h-9 px-3 rounded-lg border-2 border-[#0b1020] bg-white text-sm font-bold hover:bg-[#0b1020] hover:text-white transition-colors"
                >
                  Solution
                </button>
                <button
                  onClick={() => {
                    setChallenge(null);
                    setTests(null);
                  }}
                  aria-label="Exit challenge"
                  className="h-9 w-9 rounded-lg border-2 border-[#0b1020] flex items-center justify-center hover:bg-[#0b1020] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {hint && <p className="text-sm font-medium bg-white/70 rounded-lg px-3 py-2 border border-[#0b1020]/30">Hint: {challenge.hint}</p>}
          </div>
        </div>
      )}

      {/* panes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 sm:gap-6">
        {/* editor */}
        <div className="min-w-0 flex flex-col rounded-2xl overflow-hidden border-2 border-[#0b1020] bg-[#0b1020] shadow-[5px_5px_0_#0b1020] sm:shadow-[8px_8px_0_#0b1020] mb-1.5 sm:mb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161c33] border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:flex items-center gap-1.5 mr-2">
                <span className="w-3 h-3 rounded-full bg-pink-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-300" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </span>
              {mode === "web" ? (
                (["html", "css", "wjs"] as FileKey[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFile(f)}
                    className={`px-2.5 py-1 rounded-md font-code text-xs transition-colors ${
                      file === f ? "bg-white text-[#0b1020] font-bold" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {FILE_LABEL[f]}
                  </button>
                ))
              ) : (
                <span className="font-code text-xs text-slate-300">{FILE_LABEL[mode]}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center rounded-md border border-white/20 overflow-hidden" aria-label="Font size">
                <button onClick={() => setFontSize((s) => Math.max(11, s - 1))} className="px-2 py-0.5 hover:bg-white/10" aria-label="Smaller text">
                  A-
                </button>
                <span className="px-1.5 tabular-nums text-slate-400">{fontSize}</span>
                <button onClick={() => setFontSize((s) => Math.min(22, s + 1))} className="px-2 py-0.5 hover:bg-white/10" aria-label="Larger text">
                  A+
                </button>
              </div>
              {mode !== "web" ? (
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} className="accent-yellow-300" />
                  Auto-run
                </label>
              ) : (
                <span className="text-emerald-300 font-bold">● Live</span>
              )}
            </div>
          </div>

          <div className="overflow-auto h-[340px] sm:h-[420px] lg:h-[56vh] lg:min-h-[420px]">
            <CodeEditor value={buf[key]} onChange={setCode} lang={LANG[key]} fontSize={fontSize} errorLine={errorLine} onRun={run} />
          </div>

          <div className="px-4 py-1.5 bg-[#161c33] border-t border-white/10 text-[11px] text-slate-400 flex flex-wrap gap-x-4">
            <span>⌘/Ctrl + Enter run</span>
            <span>⌘/Ctrl + / comment</span>
            <span>Tab indent</span>
            {mode === "ts" && <span className="text-yellow-300">types are stripped, not checked</span>}
          </div>
        </div>

        {/* right pane */}
        <div className="min-w-0 flex flex-col rounded-2xl overflow-hidden border-2 border-[#0b1020] bg-[#0b1020] text-white shadow-[5px_5px_0_#2b4bff] sm:shadow-[8px_8px_0_#2b4bff] mb-1.5 sm:mb-2 relative lg:max-h-[calc(56vh+6rem)]">
          {mode === "web" && (
            <div className="flex bg-[#0d1226] border-b border-white/10">
              {(["preview", "console"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  className={`px-4 py-2.5 text-sm font-bold capitalize transition-colors ${
                    rightTab === t ? "bg-[#161c33] text-white border-b-2 border-yellow-300" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                  {t === "console" && entries.length > 0 && (
                    <span className="ml-1.5 text-[10px] rounded-full bg-white/20 px-1.5">{entries.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {mode === "web" && rightTab === "preview" ? (
            <div className="flex-1 bg-white min-h-[340px] lg:min-h-[420px]">
              <iframe
                ref={iframeRef}
                title="Live preview"
                sandbox="allow-scripts"
                srcDoc={previewDoc}
                className="w-full h-full min-h-[340px] lg:min-h-[420px] border-0 bg-white"
              />
            </div>
          ) : (
            <ConsolePanel entries={entries} onClear={() => { clearEntries(); setTests(null); }} badge={mode === "web" ? null : badge} emptyHint={consoleHint} />
          )}

          {/* keep the iframe mounted so the console keeps receiving messages */}
          {mode === "web" && rightTab === "console" && (
            <iframe ref={iframeRef} title="Preview (hidden)" sandbox="allow-scripts" srcDoc={previewDoc} className="hidden" />
          )}

          {/* test results */}
          {challenge && tests && (
            <div className="border-t-2 border-[#0b1020] bg-[#161c33]">
              <ul className="max-h-44 overflow-auto divide-y divide-white/10">
                {tests.map((t, i) => (
                  <li key={i} className="px-4 py-2 text-sm flex gap-3 items-start" style={{ animation: `pg-in .25s ease-out ${i * 60}ms both` }}>
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        t.pass ? "bg-emerald-400 text-[#0b1020]" : "bg-pink-400 text-[#0b1020]"
                      }`}
                    >
                      {t.pass ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold">{t.label}</div>
                      {!t.pass && (
                        <div className="font-code text-xs text-slate-300 break-words">
                          got <span className="text-pink-300">{t.got}</span>, expected <span className="text-emerald-300">{t.expected}</span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div
                className={`px-4 py-3 border-t-2 border-[#0b1020] font-bold flex items-center justify-between gap-2.5 text-[#0b1020] ${
                  allPass ? "bg-emerald-400" : "bg-pink-400"
                }`}
                style={{ animation: "pg-pop .4s cubic-bezier(.2,1.4,.4,1) both" }}
              >
                <span>
                  {allPass ? "Nice! All tests passed." : `${passCount} of ${tests.length} tests passed.`}
                </span>
                {allPass && nextChallenge && nextChallenge.id !== challenge.id && (
                  <button
                    onClick={() => openChallenge(nextChallenge)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0b1020] text-white text-sm px-3 py-1.5 hover:bg-[#2b4bff] transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {allPass && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-16 h-0">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute block w-2 h-2.5 rounded-[2px]"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: ["#ffd84d", "#ff7ab8", "#7dd3fc", "#86efac", "#c4b5fd"][i % 5],
                    animation: `pg-confetti ${1.1 + (i % 5) * 0.18}s ease-out ${i * 30}ms both`,
                    ["--dx" as string]: `${((i % 7) - 3) * 18}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#0b1020] text-white text-sm font-bold px-5 py-2.5 border-2 border-yellow-300"
          style={{ animation: "pg-pop .3s ease-out both" }}
        >
          {toast}
        </div>
      )}

      <footer className="border-t-2 border-[#0b1020] bg-[#0b1020] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Code runs in your browser, in a sandbox. Nothing is sent anywhere.</span>
          <Link href="/questions-answers" className="font-bold text-yellow-300 hover:underline">
            Back to the questions →
          </Link>
        </div>
      </footer>

      <style>{`
        @keyframes pg-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pg-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        @keyframes pg-pop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes pg-confetti {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--dx, 0), -170px) rotate(540deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pg-"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
