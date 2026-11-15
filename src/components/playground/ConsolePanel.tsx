"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Play, Trash2 } from "lucide-react";

export type Kind = "log" | "info" | "warn" | "error" | "result" | "system";

export interface Entry {
  id: number;
  kind: Kind | "table";
  text?: string;
  indent?: number;
  head?: string[];
  rows?: string[][];
  line?: number;
}

const STYLE: Record<Kind, string> = {
  log: "border-slate-600 text-slate-100",
  info: "border-sky-400 text-sky-300",
  warn: "border-yellow-300 text-yellow-200 bg-yellow-300/5",
  error: "border-pink-400 text-pink-300 bg-pink-400/10",
  result: "border-emerald-400 text-emerald-300",
  system: "border-transparent text-slate-400 italic",
};

type Filter = "all" | "log" | "warn" | "error";

export function ConsolePanel({
  entries,
  onClear,
  badge,
  emptyHint,
}: {
  entries: Entry[];
  onClear: () => void;
  badge?: string | null;
  emptyHint: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries]);

  const count = (f: Filter) =>
    entries.filter((e) => (f === "log" ? e.kind === "log" || e.kind === "info" || e.kind === "table" : e.kind === f)).length;

  const shown = entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "log") return e.kind === "log" || e.kind === "info" || e.kind === "table" || e.kind === "result";
    return e.kind === filter;
  });

  const copy = async () => {
    const text = entries
      .map((e) => (e.kind === "table" ? [e.head?.join("\t"), ...(e.rows ?? []).map((r) => r.join("\t"))].join("\n") : e.text))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["log", "Logs"],
    ["warn", "Warnings"],
    ["error", "Errors"],
  ];

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161c33] border-b border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f ? "bg-white text-[#0b1020]" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
              {f !== "all" && count(f) > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-[10px] ${
                    f === "error" ? "bg-pink-400 text-[#0b1020]" : f === "warn" ? "bg-yellow-300 text-[#0b1020]" : "bg-white/20"
                  }`}
                >
                  {count(f)}
                </span>
              )}
            </button>
          ))}
          {badge && <span className="ml-1 text-[11px] font-bold rounded-full bg-emerald-400 text-[#0b1020] px-2 py-0.5">{badge}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
          <button onClick={copy} className="hover:text-white flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={onClear} className="hover:text-pink-300 flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4 font-code text-[13px] sm:text-sm min-h-[220px]">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
            <span className="w-14 h-14 rounded-full bg-yellow-300 text-[#0b1020] flex items-center justify-center">
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            </span>
            <p className="text-slate-300 font-sans">{emptyHint}</p>
            <p className="text-slate-500 text-xs font-sans">Try an example above, or take a challenge.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {shown.map((e, i) => (
              <div
                key={e.id}
                style={{
                  paddingLeft: `${(e.indent ?? 0) * 16}px`,
                  animation: `pg-in .25s ease-out ${Math.min(i, 12) * 30}ms both`,
                }}
              >
                {e.kind === "table" ? (
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-xs sm:text-[13px]">
                      <thead>
                        <tr>
                          {e.head!.map((h) => (
                            <th key={h} className="border border-white/15 bg-white/5 px-3 py-1 text-left text-slate-300 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {e.rows!.map((r, ri) => (
                          <tr key={ri}>
                            {r.map((c, ci) => (
                              <td key={ci} className={`border border-white/15 px-3 py-1 ${ci === 0 ? "text-slate-400" : "text-slate-100"}`}>
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={`border-l-2 pl-3 py-1 ${STYLE[e.kind]}`}>
                    {(e.kind === "log" || e.kind === "info" || e.kind === "warn" || e.kind === "error") && (
                      <span className="text-slate-500 mr-2 select-none">›</span>
                    )}
                    <span className="whitespace-pre-wrap break-words">{e.text}</span>
                    {e.line ? <span className="ml-2 text-[11px] font-bold rounded bg-pink-400 text-[#0b1020] px-1.5 py-0.5">line {e.line}</span> : null}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
