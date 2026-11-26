"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2, Pause, Play, Square, Volume2 } from "lucide-react";
import { translateForSpeech } from "@/ai/flows/translate-for-speech";
import { translateBuiltIn } from "@/lib/translate-builtin";
import { speechTextFor } from "@/lib/speech-text";
import { cn } from "@/lib/utils";

const RATES = [0.85, 1, 1.25, 1.5] as const;
const RATE_KEY = "devqna-tts-rate";
const LANG_KEY = "devqna-tts-lang";
const HI_CACHE = "devqna-tts-hi:"; // + question id (bump the prefix if the translation source changes)
/** Chrome cuts off long utterances, so speech is queued as short chunks. */
const MAX_CHUNK = 220;


function chunk(text: string): string[] {
  // "।" (danda) ends Hindi sentences
  const sentences = text.match(/[^.!?।]+[.!?।]+["')\]]*|\S[^.!?।]*$/g) ?? [text];
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

type Lang = "en" | "hi";

/** Prefer a natural-sounding voice for the language when the device has one. */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const re = lang === "hi" ? /^hi(-|_|$)/i : /^en(-|_|$)/i;
  const voices = speechSynthesis.getVoices().filter((v) => re.test(v.lang));
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/samantha|daniel|karen|aria|jenny|guy|lekha|swara|madhur|kalpana|hemant/i.test(v.name) ? 2 : 0) +
    (/en-(US|GB)|hi-IN/i.test(v.lang) ? 1 : 0) +
    (v.localService ? 0.5 : 0);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

type Status = "idle" | "loading" | "playing" | "paused";

/**
 * "Listen" button that reads the question and answer aloud with the browser's
 * built-in speech synthesis, in English or Hindi (Hindi is translated by the AI
 * service once per question and cached). Pause/resume, stop, speed and a live
 * caption of the sentence being read. Press "l" to play or pause.
 */
export function ListenControls({
  id,
  title,
  answer,
  className,
}: {
  /** stable key for caching the Hindi translation (the question id) */
  id: string;
  title: string;
  answer: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [lang, setLang] = useState<Lang>("en");
  const [hindi, setHindi] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** one-time language-pack download for the on-device translator (0–1) */
  const [download, setDownload] = useState<number | null>(null);

  const english = useMemo(() => speechTextFor(title, answer), [title, answer]);
  const chunks = useMemo(() => chunk(lang === "hi" ? hindi ?? "" : english), [lang, hindi, english]);

  const idx = useRef(0);
  const token = useRef(0); // bumps on every stop/restart so stale "end" events are ignored
  const rateRef = useRef(1);
  rateRef.current = rate;
  const playWhenReady = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    try {
      const saved = Number(localStorage.getItem(RATE_KEY));
      if (RATES.includes(saved as (typeof RATES)[number])) setRate(saved);
      if (localStorage.getItem(LANG_KEY) === "hi") setLang("hi");
    } catch {}
    // voices load asynchronously in Chrome
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
  }, []);

  // reuse a Hindi translation saved earlier in this browser
  useEffect(() => {
    setHindi(null);
    try {
      const cached = localStorage.getItem(HI_CACHE + id);
      if (cached) setHindi(cached);
    } catch {}
  }, [id]);

  const speakFrom = useCallback(
    (i: number) => {
      const my = ++token.current;
      speechSynthesis.cancel();
      const voice = pickVoice(lang);
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
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? (lang === "hi" ? "hi-IN" : "en-US");
        u.rate = rateRef.current;
        u.onend = () => step(n + 1);
        u.onerror = (e) => {
          // "interrupted"/"canceled" happen on stop or restart; anything else ends playback
          if (my === token.current && e.error !== "interrupted" && e.error !== "canceled") setStatus("idle");
        };
        speechSynthesis.speak(u);
      };
      if (lang === "hi" && !voice) {
        setNotice("No Hindi voice is installed on this device, so the browser will use its default voice. Chrome and Edge include one; on phones, add Hindi in your text-to-speech settings.");
      }
      setStatus("playing");
      step(i);
    },
    [chunks, lang]
  );

  /** silence the voice and rewind (keeps a pending "play when the translation arrives") */
  const halt = useCallback(() => {
    token.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    idx.current = 0;
    setIndex(0);
    setStatus((s) => (s === "loading" ? s : "idle"));
  }, []);

  /** the Stop button: also cancels a pending translation playback */
  const stop = useCallback(() => {
    playWhenReady.current = false;
    halt();
    setStatus("idle");
  }, [halt]);

  // Pausing cancels and remembers the sentence; resuming restarts that sentence.
  // (speechSynthesis.pause/resume is unreliable across browsers.)
  const pause = useCallback(() => {
    token.current++;
    speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  /**
   * Hindi text for this answer: 1) the browser's free on-device translator (Chrome / Edge desktop),
   * 2) the AI translation service as a fallback (works in any browser once a key is configured).
   */
  const translate = useCallback(async () => {
    setStatus("loading");
    setNotice(null);
    setDownload(null);
    playWhenReady.current = true;

    let text = await translateBuiltIn(english, "hi", (loaded) => setDownload(loaded));
    setDownload(null);
    let failure: "unavailable" | "failed" | "busy" | undefined;
    if (!text && playWhenReady.current) {
      const res = await translateForSpeech({ id });
      text = res.ok && res.text ? res.text : null;
      failure = res.error;
    }

    if (!playWhenReady.current) return; // stopped or switched language meanwhile
    if (text) {
      try {
        localStorage.setItem(HI_CACHE + id, text);
      } catch {}
      setHindi(text); // playback starts from the effect below once chunks update
    } else {
      playWhenReady.current = false;
      setStatus("idle");
      setNotice(
        failure === "unavailable"
          ? "Hindi translation isn't available in this browser. It works for free in Chrome or Edge on desktop, and everywhere once the site's AI key is set up. English works now."
          : failure === "busy"
            ? "You've translated a lot of answers in a short time. Please wait a minute and try again."
            : "Could not translate this answer right now. Please try again in a moment."
      );
    }
  }, [id, english]);

  const toggle = useCallback(() => {
    if (status === "loading") return;
    if (status === "playing") return pause();
    if (status === "paused") return speakFrom(idx.current);
    if (lang === "hi" && !hindi) return void translate();
    speakFrom(0);
  }, [status, lang, hindi, pause, speakFrom, translate]);

  // new text (another question, another language, or a translation arriving) or leaving the page silences the voice
  useEffect(() => halt, [chunks, halt]);

  // start reading as soon as a requested translation arrives
  useEffect(() => {
    if (playWhenReady.current && lang === "hi" && hindi && chunks.length) {
      playWhenReady.current = false;
      speakFrom(0);
    }
  }, [chunks, hindi, lang, speakFrom]);

  const switchLang = (next: Lang) => {
    if (next === lang) return;
    stop();
    setNotice(null);
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
  };

  const changeRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length];
    setRate(next);
    rateRef.current = next;
    try {
      localStorage.setItem(RATE_KEY, String(next));
    } catch {}
    if (status === "playing") speakFrom(idx.current); // apply the new speed right away
  };

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

  const active = status === "playing" || status === "paused";
  const progress = chunks.length ? ((index + (status === "playing" ? 0.5 : 0)) / chunks.length) * 100 : 0;
  const btn =
    "h-10 rounded-xl border-2 border-[#0b1020] text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={status === "loading"}
          aria-pressed={status === "playing"}
          className={cn(
            btn,
            "px-3.5 disabled:cursor-wait disabled:hover:translate-y-0",
            active || status === "loading" ? "bg-violet-300 shadow-[3px_3px_0_#0b1020]" : "bg-white hover:bg-violet-100"
          )}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {download !== null && download < 1 ? `Downloading Hindi ${Math.round(download * 100)}%…` : "Translating…"}
            </>
          ) : status === "playing" ? (
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
              <Volume2 className="w-4 h-4" /> {lang === "hi" ? "सुनें" : "Listen"}
            </>
          )}
          <kbd className="hidden md:inline text-[10px] font-code bg-[#0b1020]/10 rounded px-1">l</kbd>
        </button>

        {/* language switch */}
        <div role="group" aria-label="Reading language" className="h-10 flex items-center rounded-xl border-2 border-[#0b1020] bg-white p-0.5">
          <Languages className="w-4 h-4 mx-1.5 text-slate-500" aria-hidden />
          {(
            [
              ["en", "EN"],
              ["hi", "हिंदी"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLang(code)}
              aria-pressed={lang === code}
              className={cn(
                "h-full px-2.5 rounded-lg text-sm font-bold transition-colors",
                lang === code ? "bg-[#0b1020] text-white" : "hover:bg-violet-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>

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

      {notice && (
        <p role="status" className="max-w-2xl text-sm font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}

      {active && (
        <div className="max-w-2xl">
          <div className="h-1.5 rounded-full bg-[#0b1020]/10 overflow-hidden">
            <div className="h-full bg-violet-500 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p lang={lang === "hi" ? "hi" : "en"} className="mt-2 text-sm text-slate-600 italic line-clamp-2" aria-hidden>
            “{chunks[index]}”
          </p>
          {lang === "hi" && <p className="mt-1 text-xs text-slate-400">Hindi is machine-translated and may contain small mistakes.</p>}
        </div>
      )}
    </div>
  );
}
