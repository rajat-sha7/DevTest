"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Fades and lifts children in when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal transition-all duration-700 ease-out ${
        seen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Counts from 0 to `to` once visible. */
export function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
    </span>
  );
}

/** A bar that fills to `percent` once visible. */
export function FillBar({ percent, className = "", track = "bg-slate-100" }: { percent: number; className?: string; track?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className={`h-3 rounded-full overflow-hidden ${track}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-out ${className}`}
        style={{ width: seen ? `${percent}%` : "0%" }}
      />
    </div>
  );
}

export interface HeroItem {
  id: string;
  topicLabel: string;
  topicChip: string;
  difficulty: string;
  diffChip: string;
  question: string;
  summary: string;
  code: string;
}


const TOKEN = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|import|from|export|default|async|await|if|else|new|class|useState|useEffect|use)\b|\b(\d+)\b|([A-Za-z_$][\w$]*)(?=\()/g;

function Highlight({ line }: { line: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of line.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(line.slice(last, i));
    const color = m[1] ? "#7c8aa5" : m[2] ? "#86efac" : m[3] ? "#ff7ab8" : m[4] ? "#ffd84d" : "#7dd3fc";
    out.push(
      <span key={k++} style={{ color }}>
        {m[0]}
      </span>
    );
    last = i + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return <>{out.length ? out : " "}</>;
}

const DURATION = 7000;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Video-player style walkthrough. Each question is a "scene"; the timeline is split
 * into one chapter per scene. Click the stage to play/pause, click a chapter to seek.
 */
export function HeroCarousel({ items }: { items: HeroItem[] }) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sec, setSec] = useState(0);
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const fills = useRef<(HTMLElement | null)[]>([]);
  const total = items.length * DURATION;

  const paint = (ms: number) => {
    const s = Math.max(0, Math.min(items.length - 1, Math.floor(ms / DURATION)));
    setScene((p) => (p === s ? p : s));
    setSec(Math.floor(ms / 1000));
    fills.current.forEach((f, n) => {
      if (!f) return;
      const p = n < s ? 1 : n > s ? 0 : (ms - s * DURATION) / DURATION;
      f.style.transform = `scaleX(${p})`;
    });
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  // do no work while the card is scrolled away or the tab is in the background
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const apply = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      apply();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current = (elapsed.current + Math.max(0, now - last)) % total;
      last = now;
      paint(elapsed.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visible, total]);

  const seek = (n: number) => {
    elapsed.current = n * DURATION;
    paint(elapsed.current);
  };

  return (
    <div ref={root} className="rounded-2xl overflow-hidden min-w-0 bg-[#0b1020] border-2 border-[#0b1020] text-white select-none">
      {/* stage */}
      <div
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
        onClick={() => setPlaying((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setPlaying((p) => !p);
          }
        }}
        className="relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <div className="grid grid-cols-[minmax(0,1fr)]">
          {items.map((item, n) => {
            const active = n === scene;
            const lines = item.code.split("\n");
            return (
              <div
                key={item.id}
                aria-hidden={!active}
                className={`[grid-area:1/1] p-4 sm:p-5 md:p-7 transition-all duration-700 ease-out ${
                  active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded font-medium ${item.topicChip}`}>{item.topicLabel}</span>
                  <span className={`px-2 py-0.5 rounded font-medium ${item.diffChip}`}>{item.difficulty}</span>
                </div>
                <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl md:text-2xl font-bold leading-snug">{item.question}</h2>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">{item.summary}</p>
                <pre className="mt-5 bg-black/50 border border-white/10 text-slate-100 rounded-lg p-3 sm:p-4 text-[12px] sm:text-[13px] leading-5 sm:leading-6 overflow-hidden font-code h-[11rem] sm:h-[13.5rem]">
                  <code>
                    {lines.map((l, k) => (
                      <span
                        key={k}
                        className="block whitespace-pre transition-opacity duration-500"
                        style={{ opacity: active ? 1 : 0, transitionDelay: active ? `${250 + k * 60}ms` : "0ms" }}
                      >
                        <Highlight line={l} />
                      </span>
                    ))}
                  </code>
                </pre>
              </div>
            );
          })}
        </div>

        {/* paused overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-300 ${
            playing ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-yellow-300 text-[#0b1020] border-2 border-[#0b1020] flex items-center justify-center shadow-2xl">
            <Play className="w-7 h-7 ml-1 fill-current" />
          </span>
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#161c33] border-t border-white/10">
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
        </button>

        <div className="flex-1 flex gap-1.5">
          {items.map((it, n) => (
            <button
              key={it.id}
              onClick={() => seek(n)}
              aria-label={`Go to ${it.topicLabel}`}
              title={it.topicLabel}
              className="group flex-1 h-6 flex items-center"
            >
              <span className="relative block w-full h-1 group-hover:h-1.5 rounded-full bg-white/25 overflow-hidden transition-all">
                <span
                  ref={(el) => {
                    fills.current[n] = el;
                  }}
                  className="absolute inset-0 origin-left bg-yellow-300"
                  style={{ transform: "scaleX(0)" }}
                />
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 tabular-nums shrink-0">
          {fmt(sec)} / {fmt(Math.round(total / 1000))}
        </span>
        <span className="hidden sm:block text-xs text-slate-300 shrink-0 w-20 text-right truncate">
          {(items[scene] ?? items[0]).topicLabel}
        </span>
      </div>
    </div>
  );
}

/** Infinite scrolling strip of keywords. */
export function Marquee({ words }: { words: string[] }) {
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {words.map((w) => (
        <span key={w} className="flex items-center gap-8 text-[#0b1020] font-code font-semibold text-sm sm:text-base whitespace-nowrap">
          {w}
          <span className="text-pink-500 text-lg leading-none">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee overflow-hidden border-y-2 border-[#0b1020] bg-yellow-300 py-3.5" aria-hidden>
      <div className="anim-marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
