"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { flushStudy } from "@/hooks/useStudy";
import { onPageLeave } from "@/lib/storage";

const DELAY = 600;

/**
 * Notes for one question. What you type stays in local state (so the rest of the page
 * does not re-render on every key) and is committed shortly after you pause, when you
 * leave the field, when you switch question, and when the tab is hidden or closed.
 * Render it with `key={questionId}`.
 */
export function NotesBox({ value, onCommit }: { value: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<"idle" | "pending" | "saved">(value ? "saved" : "idle");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const commit = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current === null) return;
    const text = pending.current;
    pending.current = null;
    commitRef.current(text);
    flushStudy();
    if (alive.current) setState(text.trim() ? "saved" : "idle");
  }, []);

  // pick up changes made elsewhere (another tab, an import) while nothing is being typed
  useEffect(() => {
    if (pending.current === null) setDraft(value);
  }, [value]);

  useEffect(() => {
    alive.current = true;
    const off = onPageLeave(commit);
    return () => {
      alive.current = false;
      off();
      commit(); // switching question or leaving the page must not drop the last words
    };
  }, [commit]);

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
        <NotebookPen className="w-4 h-4" /> My notes
        {state === "pending" && <span className="normal-case tracking-normal font-semibold text-slate-400">saving...</span>}
        {state === "saved" && <span className="normal-case tracking-normal font-semibold text-emerald-600">saved on this device</span>}
      </h2>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          pending.current = e.target.value;
          setState("pending");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(commit, DELAY);
        }}
        onBlur={commit}
        rows={4}
        maxLength={20000}
        placeholder="Your own wording, gotchas, a follow-up to look up..."
        className="w-full rounded-2xl border-2 border-[#0b1020] bg-white p-4 text-base leading-relaxed outline-none focus:bg-yellow-50 resize-y min-h-[110px]"
      />
    </section>
  );
}
