"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const ROWS: [string, string][] = [
  ["j  or  →", "Next question"],
  ["k  or  ←", "Previous question"],
  ["m", "Mark as mastered"],
  ["b", "Save for later"],
  ["r", "Flag for review"],
  ["p", "Practice mode on / off"],
  ["Space", "Reveal the answer (practice mode)"],
  ["1  /  2", "Got it / Need to review (practice mode)"],
  ["g", "Jump to a random question"],
  ["o", "Overview"],
  ["/", "Search"],
  ["?", "This help"],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-[#0b1020]/60 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="relative w-full max-w-md rounded-2xl border-2 border-[#0b1020] bg-white p-6 shadow-[8px_8px_0_#0b1020] animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg border-2 border-[#0b1020] flex items-center justify-center hover:bg-[#0b1020] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {ROWS.map(([k, d]) => (
            <li key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="text-slate-700">{d}</span>
              <kbd className="font-code text-xs font-bold bg-yellow-200 border-2 border-[#0b1020] rounded-md px-2 py-0.5 whitespace-pre">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
