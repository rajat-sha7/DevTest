"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RATES = [0.85, 1, 1.25, 1.5] as const;
const RATE_KEY = "devqna-tts-rate";
/** Chrome cuts off long utterances, so speech is queued as short chunks. */
const MAX_CHUNK = 220;

/** Code symbols read aloud as words, so "a => b" is not spoken as "equals greater than". */
const SYMBOLS: [RegExp, string][] = [
  [/===/g, " strictly equals "],
  [/!==/g, " is not strictly equal to "],
  [/=>/g, " arrow "],
  [/&&/g, " and "],
  [/\|\|/g, " or "],
  [/\?\?/g, " nullish coalescing "],
  [/\.\.\./g, " spread "],
  [/->/g, " to "],
  [/→/g, " to "],
  [/≈/g, " about "],
  [/\s[<]=\s/g, " less than or equal to "],
  [/\s[>]=\s/g, " greater than or equal to "],
];

/** Turns an answer's Markdown into plain sentences that sound natural when spoken. */
export function markdownToSpeech(md: string): string {
  let t = md.replace(/\r\n/g, "\n");
  // fenced code blocks are described, not read character by character
  t = t.replace(/```[\s\S]*?```/g, "\n(There is a code example on screen.)\n");
  // tables: read each row as a list of cells, skip the separator row
  t = t.replace(/^[ \t]*\|?[ \t]*:?-{2,}.*$/gm, "");
  t = t.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_, row: string) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(", ") + "."
  );
  t = t
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/`([^`]+)`/g, "$1") // inline code -> its text
    .replace(/<\/?[a-z][^>]*>/gi, (tag) => tag.replace(/[<>/]/g, " ")) // <div> -> " div "
    .replace(/(\*\*|\*|~~)(?=\S)([\s\S]*?\S)\1/g, "$2") // bold / italic / strike (not "_", which appears in identifiers)
    .replace(/(^|\s)__?(\S[^_]*\S)__?(?=\s|[.,;:!?]|$)/g, "$1$2"); // _italic_ / __bold__ only at word edges
  // headings and list items become sentences so the voice pauses between them
  t = t
    .split("\n")
    .map((line) => {
      const l = line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
        .replace(/^\s*>\s?/, "")
        .trim();
      if (!l) return "";
      return /[.!?:;,)]$/.test(l) ? l : `${l}.`;
    })
    .filter(Boolean)
    .join(" ");
  for (const [re, word] of SYMBOLS) t = t.replace(re, word);
  return t.replace(/\s+/g, " ").replace(/\s+([.,;:!?])(?=\s|$)/g, "$1").trim();
}

function chunk(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|\S[^.!?]*$/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > MAX_CHUNK) {
      const cut = s.lastIndexOf(" ", MAX_CHUNK);
      out.push(s.slice(0, cut > 40 ? cut : MAX_CHUNK));
      s = s.slice(cut > 40 ? cut : MAX_CHUNK).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

/** Prefer a natural-sounding English voice when the device has one. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/samantha|daniel|karen|aria|jenny|guy/i.test(v.name) ? 2 : 0) +
    (/en-(US|GB)/i.test(v.lang) ? 1 : 0) +
    (v.localService ? 0.5 : 0);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

type Status = "idle" | "playing" | "paused";

/**
 * "Listen" button that reads the question and answer aloud with the browser's
 * built-in speech synthesis. Pause/resume, stop, speed and a live caption of
 * the sentence being read. Press "l" to play or pause.
 */
export function ListenControls({ title, answer, className }: { title: string; answer: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const chunks = useMemo(() => chunk(`${title.replace(/[?]?$/, "?")} ${markdownToSpeech(answer)}`), [title, answer]);

  const idx = useRef(0);
  const token = useRef(0); // bumps on every stop/restart so stale "end" events are ignored
  const rateRef = useRef(1);
  rateRef.current = rate;

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    try {
      const saved = Number(localStorage.getItem(RATE_KEY));
      if (RATES.includes(saved as (typeof RATES)[number])) setRate(saved);
    } catch {}
    // voices load asynchronously in Chrome
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
  }, []);

  const speakFrom = useCallback(
    (i: number) => {
      const my = ++token.current;
      speechSynthesis.cancel();
      const step = (n: number) => {
        if (my !== token.current) return;
        if (n >= chunks.length) {
          idx.current = 0;
          setIndex(0);
          setStatus("idle");
          return;
        }
        idx.current = n;
        setIndex(n);
        const u = new SpeechSynthesisUtterance(chunks[n]);
        const v = pickVoice();
        if (v) u.voice = v;
        u.lang = v?.lang ?? "en-US";
        u.rate = rateRef.current;
        u.onend = () => step(n + 1);
        u.onerror = (e) => {
          // "interrupted"/"canceled" happen on stop or restart; anything else ends playback
          if (my === token.current && e.error !== "interrupted" && e.error !== "canceled") setStatus("idle");
        };
        speechSynthesis.speak(u);
      };
      setStatus("playing");
      step(i);
    },
    [chunks]
  );

  const stop = useCallback(() => {
    token.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    idx.current = 0;
    setIndex(0);
    setStatus("idle");
  }, []);

  // Pausing cancels and remembers the sentence; resuming restarts that sentence.
  // (speechSynthesis.pause/resume is unreliable across browsers.)
  const pause = useCallback(() => {
    token.current++;
    speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const toggle = useCallback(() => {
    if (status === "playing") pause();
    else speakFrom(status === "paused" ? idx.current : 0);
  }, [status, pause, speakFrom]);

  const changeRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length];
    setRate(next);
    rateRef.current = next;
    try {
      localStorage.setItem(RATE_KEY, String(next));
    } catch {}
    if (status === "playing") speakFrom(idx.current); // apply the new speed right away
  };

  // a new question (or leaving the page) stops the voice
  useEffect(() => stop, [chunks, stop]);

  // "l" plays / pauses
  useEffect(() => {
    if (!supported) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))) return;
      if (e.key === "l") {
        e.preventDefault();
        toggle();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [supported, toggle]);

  if (!supported) return null;

  const active = status !== "idle";
  const progress = chunks.length ? ((index + (status === "playing" ? 0.5 : 0)) / chunks.length) * 100 : 0;
  const btn =
    "h-10 rounded-xl border-2 border-[#0b1020] text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={status === "playing"}
          className={cn(btn, "px-3.5", active ? "bg-violet-300 shadow-[3px_3px_0_#0b1020]" : "bg-white hover:bg-violet-100")}
        >
          {status === "playing" ? (
            <>
              <Pause className="w-4 h-4" /> Pause
              <span className="flex items-end gap-0.5 h-3.5" aria-hidden>
                <span className="tts-bar w-0.5 bg-[#0b1020]" />
                <span className="tts-bar w-0.5 bg-[#0b1020] [animation-delay:.15s]" />
                <span className="tts-bar w-0.5 bg-[#0b1020] [animation-delay:.3s]" />
              </span>
            </>
          ) : status === "paused" ? (
            <>
              <Play className="w-4 h-4" /> Resume
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" /> Listen
            </>
          )}
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">l</kbd>
        </button>

        {active && (
          <>
            <button type="button" onClick={stop} aria-label="Stop reading" className={cn(btn, "w-10 bg-white hover:bg-pink-100")}>
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={changeRate}
              aria-label={`Reading speed ${rate}x, click to change`}
              className={cn(btn, "px-3 bg-white hover:bg-yellow-100 tabular-nums")}
            >
              {rate}×
            </button>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {index + 1} / {chunks.length}
            </span>
          </>
        )}
      </div>

      {active && (
        <div className="max-w-2xl">
          <div className="h-1.5 rounded-full bg-[#0b1020]/10 overflow-hidden">
            <div className="h-full bg-violet-500 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600 italic line-clamp-2" aria-hidden>
            “{chunks[index]}”
          </p>
        </div>
      )}
    </div>
  );
}
