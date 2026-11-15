"use client";

import { useRef } from "react";
import { Bookmark, Check, Download, Flag, Flame, History, Play, RotateCcw, ShieldCheck, Shuffle, Upload } from "lucide-react";
import type { BackupInfo, SaveInfo } from "@/hooks/useStudy";

export interface TopicStat {
  id: string;
  label: string;
  done: number;
  percent: number;
  tone: string;
}

interface Props {
  stats: TopicStat[];
  streak: number;
  today: number;
  reviewCount: number;
  savedCount: number;
  hasLast: boolean;
  onOpenTopic: (id: string) => void;
  onContinue: () => void;
  onRandom: () => void;
  onReview: () => void;
  onSaved: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onReset: () => void;
  onRestore: () => void;
  save: SaveInfo;
  backup: BackupInfo | null;
}

const card = "rounded-2xl border-2 border-[#0b1020] bg-white p-4 shadow-[4px_4px_0_#0b1020]";

export function StudyOverview({
  stats,
  streak,
  today,
  reviewCount,
  savedCount,
  hasLast,
  onOpenTopic,
  onContinue,
  onRandom,
  onReview,
  onSaved,
  onExport,
  onImport,
  onReset,
  onRestore,
  save,
  backup,
}: Props) {
  const file = useRef<HTMLInputElement>(null);

  const tiles = [
    { icon: Flame, label: "Day streak", value: streak, bg: "bg-orange-200", hint: streak ? "Keep it going" : "Master one today" },
    { icon: Check, label: "Mastered today", value: today, bg: "bg-emerald-200", hint: today ? "Nice work" : "Nothing yet" },
    { icon: Flag, label: "To review", value: reviewCount, bg: "bg-pink-200", hint: reviewCount ? "Open the queue" : "All clear", onClick: reviewCount ? onReview : undefined },
    { icon: Bookmark, label: "Saved", value: savedCount, bg: "bg-yellow-200", hint: savedCount ? "Open saved" : "Bookmark with b", onClick: savedCount ? onSaved : undefined },
  ];

  return (
    <div className="pb-16">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your progress</h1>
      <p className="mt-2 text-slate-600">Saved on this device. Nothing leaves your browser.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {hasLast && (
          <button
            onClick={onContinue}
            className="h-11 px-5 rounded-xl bg-yellow-300 border-2 border-[#0b1020] font-extrabold flex items-center gap-2 shadow-[3px_3px_0_#0b1020] hover:-translate-y-0.5 transition-transform"
          >
            <Play className="w-4 h-4 fill-current" /> Continue where you left off
          </button>
        )}
        <button
          onClick={onRandom}
          className="h-11 px-5 rounded-xl bg-white border-2 border-[#0b1020] font-bold flex items-center gap-2 hover:bg-sky-100 transition-colors"
        >
          <Shuffle className="w-4 h-4" /> Surprise me
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Inner = (
            <>
              <span className={`w-9 h-9 rounded-lg border-2 border-[#0b1020] flex items-center justify-center ${t.bg}`}>
                <t.icon className="w-4.5 h-4.5" />
              </span>
              <div className="mt-3 text-3xl font-extrabold tabular-nums">{t.value}</div>
              <div className="text-sm font-bold">{t.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t.hint}</div>
            </>
          );
          return t.onClick ? (
            <button key={t.label} onClick={t.onClick} className={`${card} text-left hover:-translate-y-0.5 transition-transform`}>
              {Inner}
            </button>
          ) : (
            <div key={t.label} className={card}>
              {Inner}
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 text-xl font-extrabold">By topic</h2>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {stats.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenTopic(s.id)}
            className={`${card} text-left hover:-translate-y-0.5 transition-transform`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`px-2.5 py-1 rounded-full border-2 border-[#0b1020] text-sm font-extrabold ${s.tone}`}>{s.label}</span>
              <span className="text-2xl font-extrabold tabular-nums">{s.percent}%</span>
            </div>
            <div className="mt-4 h-3 rounded-full bg-slate-100 border border-[#0b1020]/30 overflow-hidden">
              <div className={`h-full ${s.tone} transition-[width] duration-700`} style={{ width: `${s.percent}%` }} />
            </div>
            <div className="mt-2 text-sm text-slate-600">{s.done} mastered</div>
          </button>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-extrabold">Your data</h2>
      <div className="mt-3 rounded-2xl border-2 border-[#0b1020] bg-white p-4 flex gap-3 items-start">
        <span className="w-9 h-9 rounded-lg border-2 border-[#0b1020] bg-emerald-200 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4.5 h-4.5" />
        </span>
        <div className="text-sm leading-relaxed">
          <p className="font-bold">
            {save.error ? "Not saving right now" : save.savedAt ? `Saved on this device at ${new Date(save.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Saved on this device as you go"}
          </p>
          <p className="text-slate-600">
            {save.persisted
              ? "Your browser has agreed to keep this data, even when storage runs low."
              : "Browsers can clear site data when storage runs low or after long inactivity. Download a backup now and then to be safe."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onExport} className="h-10 px-4 rounded-xl border-2 border-[#0b1020] bg-white text-sm font-bold flex items-center gap-2 hover:bg-yellow-100">
          <Download className="w-4 h-4" /> Export backup
        </button>
        <button onClick={() => file.current?.click()} className="h-10 px-4 rounded-xl border-2 border-[#0b1020] bg-white text-sm font-bold flex items-center gap-2 hover:bg-yellow-100">
          <Upload className="w-4 h-4" /> Import and merge
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onImport(await f.text());
            e.target.value = "";
          }}
        />
        {backup && (
          <button onClick={onRestore} className="h-10 px-4 rounded-xl border-2 border-[#0b1020] bg-sky-200 text-sm font-bold flex items-center gap-2 hover:bg-sky-300">
            <History className="w-4 h-4" /> Restore saved copy
          </button>
        )}
        <button onClick={onReset} className="h-10 px-4 rounded-xl border-2 border-[#0b1020] bg-pink-200 text-sm font-bold flex items-center gap-2 hover:bg-pink-300">
          <RotateCcw className="w-4 h-4" /> Reset progress
        </button>
      </div>
    </div>
  );
}
