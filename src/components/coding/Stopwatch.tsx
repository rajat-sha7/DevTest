"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StopwatchHandle {
  seconds: () => number;
  start: () => void;
  pause: () => void;
  running: () => boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Owns its own once-a-second state, so the page (and the code editor) never re-render because of it.
 * The parent reads the time through the ref when it needs it. Mount with `key={challengeId}` to reset.
 */
export const Stopwatch = forwardRef<StopwatchHandle, { targetSeconds: number; className?: string }>(function Stopwatch(
  { targetSeconds, className },
  ref
) {
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const acc = useRef(0); // ms counted before the current run
  const startedAt = useRef<number | null>(null);

  const total = () => acc.current + (startedAt.current ? Date.now() - startedAt.current : 0);
  const start = () => {
    if (startedAt.current) return;
    startedAt.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    if (!startedAt.current) return;
    acc.current = total();
    startedAt.current = null;
    setRunning(false);
    setShown(Math.floor(acc.current / 1000));
  };
  const reset = () => {
    acc.current = 0;
    startedAt.current = null;
    setRunning(false);
    setShown(0);
  };

  useImperativeHandle(ref, () => ({ seconds: () => Math.floor(total() / 1000), start, pause, running: () => !!startedAt.current }));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setShown(Math.floor(total() / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const over = shown > targetSeconds;
  const pct = Math.min(100, (shown / targetSeconds) * 100);
  const late = pct >= 80;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={() => (running ? pause() : start())}
        aria-label={running ? "Pause timer" : "Start timer"}
        className="w-9 h-9 rounded-full border-2 border-[#0b1020] bg-yellow-300 text-[#0b1020] flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
      >
        {running ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
      </button>
      <div className="min-w-[92px]">
        <div className={cn("font-code text-sm font-bold tabular-nums leading-none", over ? "text-pink-300" : "text-white")}>
          {fmt(shown)} <span className="text-white/50 font-normal">/ {fmt(targetSeconds)}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className={cn("h-full transition-[width] duration-1000 ease-linear", over ? "bg-pink-400" : late ? "bg-amber-300" : "bg-emerald-400")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button onClick={reset} aria-label="Reset timer" title="Reset timer" className="w-7 h-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
