"use client";

import { memo, type ReactNode } from "react";
import { Bookmark, Check, Flag, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionItemProps {
  question: { id: string; question: string; difficulty: string };
  isActive: boolean;
  isDone: boolean;
  isSaved: boolean;
  isReview: boolean;
  hasNote: boolean;
  query: string;
  onSelect: (id: string) => void;
}

const DIFF: Record<string, string> = {
  Easy: "bg-emerald-300",
  Medium: "bg-amber-300",
  Hard: "bg-rose-400",
  Expert: "bg-fuchsia-400",
};

function highlight(text: string, q: string): ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-yellow-300 text-[#0b1020] rounded px-0.5">{text.slice(i, i + needle.length)}</mark>
      {text.slice(i + needle.length)}
    </>
  );
}

/** Memoised: a list of hundreds of these must not re-render when one of them changes. */
export const QuestionItem = memo(function QuestionItem({ question, isActive, isDone, isSaved, isReview, hasNote, query, onSelect }: QuestionItemProps) {
  return (
    <button
      onClick={() => onSelect(question.id)}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-all",
        isActive
          ? "bg-white border-[#0b1020] shadow-[3px_3px_0_#0b1020] -translate-x-px -translate-y-px"
          : "bg-transparent border-transparent hover:bg-white hover:border-[#0b1020]/25"
      )}
    >
      <span
        aria-label={isDone ? "Mastered" : "Not mastered"}
        className={cn(
          "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          isDone ? "bg-emerald-400 border-[#0b1020] text-[#0b1020]" : "border-[#0b1020]/20 text-transparent group-hover:border-[#0b1020]/40"
        )}
      >
        <Check className="w-3 h-3" strokeWidth={3.5} />
      </span>

      <span className="flex-1 min-w-0 space-y-1.5">
        <span className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full border border-[#0b1020]", DIFF[question.difficulty] ?? "bg-slate-300")} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{question.difficulty}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {isReview && <Flag className="w-3.5 h-3.5 text-pink-500 fill-pink-300" aria-label="Needs review" />}
            {hasNote && <StickyNote className="w-3.5 h-3.5 text-sky-600" aria-label="Has notes" />}
            {isSaved && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-yellow-300" aria-label="Saved" />}
          </span>
        </span>
        <span className={cn("block text-sm font-bold leading-snug", isActive ? "text-[#0b1020]" : "text-slate-700 group-hover:text-[#0b1020]")}>
          {highlight(question.question, query)}
        </span>
      </span>
    </button>
  );
});
