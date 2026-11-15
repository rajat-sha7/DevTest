"use client";

import { AlertTriangle, Download, X } from "lucide-react";
import type { Study } from "@/hooks/useStudy";
import { downloadText } from "@/lib/download";

/** Tells the user, loudly, when their progress could not be saved or read. Silent on the happy path. */
export function DataSafetyBanner({ study }: { study: Study }) {
  const { save, recovered } = study;

  if (save.error) {
    return (
      <div role="alert" className="shrink-0 bg-rose-300 border-b-2 border-[#0b1020] px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="flex-1 min-w-[220px]">
          {save.error === "quota"
            ? "Your browser storage is full, so your latest changes are not being saved."
            : "Your browser is blocking storage (private mode?), so progress will be lost when you close this tab."}{" "}
          Download a backup so nothing is lost.
        </span>
        <button
          onClick={() => downloadText("devqna-progress.json", study.exportJson())}
          className="h-8 px-3 rounded-lg bg-white border-2 border-[#0b1020] font-extrabold flex items-center gap-1.5 hover:bg-yellow-200"
        >
          <Download className="w-4 h-4" /> Download backup
        </button>
      </div>
    );
  }

  if (recovered) {
    return (
      <div role="status" className="shrink-0 bg-yellow-200 border-b-2 border-[#0b1020] px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="flex-1 min-w-[220px]">
          Some saved progress could not be read. We kept a copy of it instead of deleting it.
        </span>
        <button
          onClick={() => {
            const raw = study.corruptText();
            if (raw) downloadText("devqna-unreadable-data.txt", raw, "text/plain");
          }}
          className="h-8 px-3 rounded-lg bg-white border-2 border-[#0b1020] font-extrabold flex items-center gap-1.5 hover:bg-yellow-100"
        >
          <Download className="w-4 h-4" /> Download the copy
        </button>
        <button onClick={study.dismissRecovered} aria-label="Dismiss" className="w-8 h-8 rounded-lg border-2 border-[#0b1020] bg-white flex items-center justify-center hover:bg-yellow-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
