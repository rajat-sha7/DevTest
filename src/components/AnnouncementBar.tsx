"use client";

import { X } from "lucide-react";
import { ANNOUNCE_ID, ANNOUNCE_KEY } from "@/lib/announce";

/** Site announcement: the AI Agents & LLM track is coming soon. Dismissible. */
export function AnnouncementBar() {
  const dismiss = () => {
    document.documentElement.setAttribute("data-announce-dismissed", "");
    try {
      localStorage.setItem(ANNOUNCE_KEY, ANNOUNCE_ID);
    } catch {}
  };

  return (
    <div role="region" aria-label="Announcement" className="announce-bar relative overflow-hidden bg-[#0b1020] text-white border-b-2 border-[#0b1020]">
      {/* slow shimmer */}
      <span aria-hidden className="announce-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative max-w-6xl mx-auto pl-4 pr-12 sm:px-12 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300 text-[#0b1020] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
          <span className="announce-dot w-1.5 h-1.5 rounded-full bg-[#e11d48]" aria-hidden />
          Coming soon
        </span>
        <p className="font-semibold">
          <span aria-hidden>🤖 </span>
          AI Agents &amp; LLM interview questions
          <span className="hidden sm:inline text-slate-300 font-normal">: RAG, tool calling, prompt design, evals and more.</span>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
