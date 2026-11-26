"use client";

import { useEffect, useRef } from "react";
import { TOPICS, type Topic } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { ScrollRow } from "@/components/ui/ScrollRow";

interface TopicSelectorProps {
  currentTopic: Topic;
  onTopicChange: (topic: Topic) => void;
  /** 0-100 per topic */
  percent: Record<string, number>;
}

export function TopicSelector({ currentTopic, onTopicChange, percent }: TopicSelectorProps) {
  const row = useRef<HTMLDivElement>(null);

  // keep the selected topic fully visible in the scrolling row (scrolls only this row, never the page)
  const first = useRef(true);
  useEffect(() => {
    const r = row.current;
    const el = r?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!r || !el) return;
    const a = el.getBoundingClientRect();
    const b = r.getBoundingClientRect();
    const pad = 12;
    let left = r.scrollLeft;
    if (a.left < b.left + pad) left += a.left - b.left - pad;
    else if (a.right > b.right - pad) left += a.right - b.right + pad;
    if (left !== r.scrollLeft) r.scrollTo({ left: Math.max(0, left), behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [currentTopic]);

  return (
    <ScrollRow ref={row} role="tablist" aria-label="Topic" className="flex gap-1.5 py-1 -my-1 px-0.5">
      {TOPICS.map((t) => {
        const active = t.id === currentTopic;
        const p = percent[t.id] ?? 0;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onTopicChange(t.id as Topic)}
            className={cn(
              "px-3 py-1.5 rounded-full border-2 border-[#0b1020] text-[13px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
              active ? "bg-[#0b1020] text-white shadow-[2px_2px_0_#fde047]" : "bg-white text-[#0b1020] hover:bg-yellow-100"
            )}
          >
            {t.label}
            {p > 0 && (
              <span
                className={cn(
                  "text-[10px] rounded-full px-1.5 py-px tabular-nums",
                  active ? "bg-yellow-300 text-[#0b1020]" : "bg-emerald-200 text-emerald-900"
                )}
              >
                {p}%
              </span>
            )}
          </button>
        );
      })}
    </ScrollRow>
  );
}
