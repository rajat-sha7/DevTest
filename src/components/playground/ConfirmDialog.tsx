"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface Ask {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** "danger" = pink confirm button, "info" = yellow */
  tone?: "danger" | "info";
  icon?: ReactNode;
  onConfirm: () => void;
}

export function ConfirmDialog({ ask, onClose }: { ask: Ask | null; onClose: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ask) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask, onClose]);

  if (!ask) return null;
  const danger = ask.tone !== "info";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ animation: "pg-fade .2s ease-out both" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-[#0b1020]/60 backdrop-blur-[2px]" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        aria-describedby="dlg-msg"
        className="relative w-full max-w-md rounded-2xl border-2 border-[#0b1020] bg-white p-6 shadow-[8px_8px_0_#0b1020]"
        style={{ animation: "pg-pop .3s cubic-bezier(.2,1.4,.4,1) both" }}
      >
        <div className="flex items-start gap-4">
          {ask.icon && (
            <span
              className={`w-11 h-11 rounded-full border-2 border-[#0b1020] flex items-center justify-center shrink-0 ${
                danger ? "bg-pink-300" : "bg-yellow-300"
              }`}
            >
              {ask.icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 id="dlg-title" className="text-xl font-extrabold text-[#0b1020]">
              {ask.title}
            </h2>
            <p id="dlg-msg" className="mt-1.5 text-slate-600 leading-relaxed">
              {ask.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="h-11 px-5 rounded-lg border-2 border-[#0b1020] font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => {
              ask.onConfirm();
              onClose();
            }}
            className={`h-11 px-5 rounded-lg border-2 border-[#0b1020] font-extrabold text-[#0b1020] shadow-[3px_3px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
              danger ? "bg-pink-400" : "bg-yellow-300"
            }`}
          >
            {ask.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
