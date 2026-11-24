"use client";

import Link from "next/link";
import { CountUp, useInView } from "@/components/landing/motion";

export type Level = "Easy" | "Medium" | "Hard";

export interface LevelStat {
  level: Level;
  count: number;
  /** question counts per topic label, topics with zero omitted */
  byTopic: { id: string; label: string; count: number }[];
}

const STYLE: Record<Level, { bar: string; dot: string; note: string }> = {
  Easy: { bar: "bg-emerald-400", dot: "bg-emerald-400", note: "Refresh the basics" },
  Medium: { bar: "bg-yellow-300", dot: "bg-yellow-300", note: "Build confidence" },
  Hard: { bar: "bg-pink-400", dot: "bg-pink-400", note: "Interview-level depth" },
};

const EASE = "cubic-bezier(.22,1,.36,1)";

/** Difficulty split of the real question bank, animated in when scrolled into view. */
export function DifficultyMeter({ stats, total }: { stats: LevelStat[]; total: number }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  return (
    <div ref={ref} className="mt-9 space-y-3">
      {stats.map((s, i) => {
        const pct = total ? (s.count / total) * 100 : 0;
        const delay = i * 180;
        const st = STYLE[s.level];
        // open the topic with the most questions at this level, so the filtered list is never empty
        const top = [...s.byTopic].sort((a, b) => b.count - a.count)[0];
        return (
          <Link
            key={s.level}
            href={`/questions-answers?${top ? `topic=${top.id}&` : ""}difficulty=${s.level}`}
            className="group block rounded-xl p-3 -mx-3 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"
            style={{
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(12px)",
              transition: `opacity .6s ${EASE} ${delay}ms, transform .6s ${EASE} ${delay}ms`,
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} aria-hidden />
                <span className="font-bold text-lg">{s.level}</span>
                <span className="hidden sm:inline text-slate-400">· {st.note}</span>
              </span>
              <span className="text-right">
                <span className="font-extrabold text-lg">
                  <CountUp to={s.count} duration={1200 + delay} />
                </span>
                <span className="text-slate-400"> questions · {Math.round(pct)}%</span>
              </span>
            </div>

            <div
              className="mt-2.5 h-3 rounded-full overflow-hidden bg-white/15"
              role="img"
              aria-label={`${s.level}: ${s.count} of ${total} questions, ${Math.round(pct)} percent`}
            >
              <div
                className={`relative h-full rounded-full overflow-hidden ${st.bar} group-hover:brightness-110`}
                style={{
                  width: seen ? `${Math.max(pct, 2)}%` : "0%",
                  transition: `width 1.2s ${EASE} ${delay + 150}ms`,
                }}
              >
                {seen && (
                  <span
                    aria-hidden
                    className="anim-shine absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    style={{ animationDelay: `${delay + 1250}ms` }}
                  />
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-400">
              <span className="truncate">
                {s.byTopic.map((t, j) => (
                  <span key={t.label}>
                    {j > 0 && <span aria-hidden> · </span>}
                    {t.label} <span className="text-slate-200 tabular-nums">{t.count}</span>
                  </span>
                ))}
              </span>
              <span className="shrink-0 font-semibold text-slate-200 transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/** Numbered steps joined by a line that draws down as they appear. */
export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  const [ref, seen] = useInView<HTMLOListElement>(0.25);
  return (
    <ol ref={ref} className="relative mt-9 space-y-8">
      {/* connector */}
      <span
        aria-hidden
        className="absolute left-[21px] top-11 bottom-11 w-0.5 bg-yellow-300/40 origin-top"
        style={{ transform: seen ? "scaleY(1)" : "scaleY(0)", transition: `transform 1.4s ${EASE} 200ms` }}
      />
      {steps.map((s, i) => {
        const delay = i * 260;
        return (
          <li key={s.title} className="relative flex gap-5">
            <span
              className={`relative z-10 w-11 h-11 rounded-full bg-yellow-300 text-[#0b1020] text-lg font-black flex items-center justify-center shrink-0 ${seen ? "anim-pop-in" : "opacity-0"}`}
              style={{ animationDelay: `${delay}ms, ${delay + 450}ms` }}
            >
              {i + 1}
            </span>
            <div
              style={{
                opacity: seen ? 1 : 0,
                transform: seen ? "none" : "translateX(-12px)",
                transition: `opacity .6s ${EASE} ${delay + 120}ms, transform .6s ${EASE} ${delay + 120}ms`,
              }}
            >
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mt-1 text-slate-300 leading-relaxed">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
