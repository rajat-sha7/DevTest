"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Copy, Play, Terminal } from "lucide-react";
import { HighlightLine } from "@/components/playground/CodeEditor";
import { useToast } from "@/hooks/use-toast";

export type CodeLang = "js" | "ts" | "html" | "css";

interface Props {
  code: string;
  lang: CodeLang;
  title?: string;
  /** link that opens this code in the playground, when it can run there */
  runnable?: string | null;
}

/** Highlighted, copyable code block. Memoised so typing elsewhere never re-renders it. */
export const CodePanel = memo(function CodePanel({ code, lang, title = "Example", runnable }: Props) {
  const { toast } = useToast();
  const lines = useMemo(() => code.split("\n"), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Code copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500">
          <Terminal className="w-4 h-4" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {runnable && (
            <Link
              href={runnable}
              className="h-8 px-3 rounded-lg bg-yellow-300 border-2 border-[#0b1020] text-xs font-extrabold flex items-center gap-1.5 shadow-[2px_2px_0_#0b1020] hover:-translate-x-px hover:-translate-y-px transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Run it
            </Link>
          )}
          <button
            onClick={copy}
            className="h-8 px-3 rounded-lg border-2 border-[#0b1020] text-xs font-bold flex items-center gap-1.5 hover:bg-[#0b1020] hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border-2 border-[#0b1020] bg-[#0b1020] shadow-[5px_5px_0_#0b1020]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#161c33] border-b border-white/10">
          <span className="flex gap-1.5">
            <i className="w-3 h-3 rounded-full bg-pink-400" />
            <i className="w-3 h-3 rounded-full bg-yellow-300" />
            <i className="w-3 h-3 rounded-full bg-emerald-400" />
          </span>
          <span className="font-code text-[11px] text-slate-400 uppercase tracking-wider">{lang === "ts" ? "tsx" : lang}</span>
        </div>
        <div className="overflow-x-auto">
          <pre className="m-0 py-4 font-code text-[13px] md:text-sm leading-6 text-slate-100">
            {lines.map((l, i) => (
              <div key={i} className="flex hover:bg-white/5">
                <span className="w-10 shrink-0 select-none text-right pr-4 text-slate-600 tabular-nums">{i + 1}</span>
                <span className="whitespace-pre pr-4">{l ? <HighlightLine line={l} lang={lang} /> : " "}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
});
