"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, Flag, PencilLine, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  minutes: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: PickerItem[];
  currentId: string | null;
  done: Set<string>;
  saved: Set<string>;
  review: Set<string>;
  drafts: Record<string, string>;
  times: Record<string, number>;
  onPick: (id: string) => void;
}

const LEVEL: Record<string, string> = { Medium: "bg-amber-300", Hard: "bg-rose-400", Expert: "bg-fuchsia-400" };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Command-palette style challenge switcher (Cmd/Ctrl+K). */
export function ChallengePicker({ open, onClose, items, currentId, done, saved, review, drafts, times, onPick }: Props) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("All");
  const [status, setStatus] = useState<"all" | "todo" | "done" | "review" | "saved">("all");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter((it) => {
      if (topic !== "All" && it.topic !== topic) return false;
      if (status === "todo" && done.has(it.id)) return false;
      if (status === "done" && !done.has(it.id)) return false;
      if (status === "review" && !review.has(it.id)) return false;
      if (status === "saved" && !saved.has(it.id)) return false;
      return !n || it.title.toLowerCase().includes(n);
    });
  }, [items, q, topic, status, done, saved, review]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(Math.max(0, items.findIndex((i) => i.id === currentId)));
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive((a) => Math.min(a, Math.max(0, list.length - 1))), [list.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      onPick(list[active].id);
      onClose();
    }
  };

  const chip = (on: boolean) =>
    cn("px-2.5 py-1 rounded-full border-2 border-[#0b1020] text-xs font-bold whitespace-nowrap", on ? "bg-[#0b1020] text-white" : "bg-white hover:bg-yellow-100");

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-[#0b1020]/60 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a challenge"
        onKeyDown={onKey}
        className="relative w-full max-w-xl rounded-2xl border-2 border-[#0b1020] bg-white shadow-[8px_8px_0_#0b1020] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 px-4 border-b-2 border-[#0b1020]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search challenges"
            aria-label="Search challenges"
            className="flex-1 h-14 bg-transparent outline-none text-base"
          />
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-yellow-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-slate-200 bg-[#fff8ec]">
          {["All", "Next.js", "React"].map((t) => (
            <button key={t} onClick={() => setTopic(t)} className={chip(topic === t)}>
              {t}
            </button>
          ))}
          <span className="w-px bg-[#0b1020]/20 mx-1" aria-hidden />
          {(
            [
              ["all", "Any"],
              ["todo", "To do"],
              ["done", "Mastered"],
              ["review", "Review"],
              ["saved", "Saved"],
            ] as const
          ).map(([s, label]) => (
            <button key={s} onClick={() => setStatus(s)} className={chip(status === s)}>
              {label}
            </button>
          ))}
        </div>

        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
          {list.length === 0 && <li className="py-10 text-center text-slate-500">Nothing matches.</li>}
          {list.map((it, i) => (
            <li key={it.id}>
              <button
                data-active={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => {
                  onPick(it.id);
                  onClose();
                }}
                className={cn("w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors", i === active ? "bg-yellow-100 border-[#0b1020]" : "border-transparent")}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    done.has(it.id) ? "bg-emerald-400 border-[#0b1020]" : "border-[#0b1020]/25 text-transparent"
                  )}
                >
                  <Check className="w-3 h-3" strokeWidth={3.5} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn("block text-sm font-bold leading-snug truncate", it.id === currentId && "text-[#2b4bff]")}>{it.title}</span>
                  <span className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full border border-[#0b1020]", LEVEL[it.difficulty] ?? "bg-slate-300")} />
                      {it.difficulty}
                    </span>
                    <span>{it.topic}</span>
                    <span>~{it.minutes} min</span>
                    {times[it.id] ? <span className="text-emerald-600">best {fmt(times[it.id])}</span> : null}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {drafts[it.id] && <PencilLine className="w-3.5 h-3.5 text-sky-600" aria-label="Has a draft" />}
                  {review.has(it.id) && <Flag className="w-3.5 h-3.5 text-pink-500 fill-pink-300" aria-label="Needs review" />}
                  {saved.has(it.id) && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-yellow-300" aria-label="Saved" />}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-slate-200 bg-[#fff8ec] text-[11px] font-bold text-slate-500 flex gap-4">
          <span>↑ ↓ move</span>
          <span>Enter open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
