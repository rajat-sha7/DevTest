"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { checkPersisted, onPageLeave, readRaw, removeRaw, requestPersistence, writeRaw } from "@/lib/storage";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const KEY = "devqna-study-v1";
const BACKUP = "devqna-study-v1.backup";
const CORRUPT = "devqna-study-v1.corrupt";
const LEGACY = "devqna-progress";
const NOTE_LIMIT = 20000;
const DRAFT_LIMIT = 30000;
const SAVE_DELAY = 350;

export interface StudyData {
  done: string[];
  saved: string[];
  review: string[];
  notes: Record<string, string>;
  last: { topic: string; id: string } | null;
  /** YYYY-MM-DD -> number of questions mastered that day */
  days: Record<string, number>;
  practice: boolean;
  /** your code for coding-round challenges */
  drafts: Record<string, string>;
  /** best time (seconds) to finish a coding-round challenge */
  times: Record<string, number>;
}

export interface SaveInfo {
  /** null = last write worked */
  error: "quota" | "blocked" | null;
  savedAt: number | null;
  /** browser promised not to evict our data */
  persisted: boolean | null;
}

export interface BackupInfo {
  done: number;
  saved: number;
  review: number;
  notes: number;
  savedAt: number | null;
}

interface Snapshot {
  data: StudyData;
  ready: boolean;
  save: SaveInfo;
  backup: BackupInfo | null;
  /** stored data could not be read; the raw text was kept under a separate key */
  recovered: boolean;
}

const EMPTY: StudyData = { done: [], saved: [], review: [], notes: {}, last: null, days: {}, practice: false, drafts: {}, times: {} };

const dayKey = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function sanitize(raw: unknown): StudyData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<StudyData>;
  const arr = (v: unknown) => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string"))) : []);
  const notes: Record<string, string> = {};
  if (r.notes && typeof r.notes === "object") {
    for (const [k, v] of Object.entries(r.notes)) if (typeof v === "string" && v.trim()) notes[k] = v.slice(0, NOTE_LIMIT);
  }
  const days: Record<string, number> = {};
  if (r.days && typeof r.days === "object") {
    for (const [k, v] of Object.entries(r.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && v > 0) days[k] = Math.floor(v);
  }
  const last = r.last && typeof r.last.topic === "string" && typeof r.last.id === "string" ? r.last : null;
  const drafts: Record<string, string> = {};
  if (r.drafts && typeof r.drafts === "object") {
    for (const [k, v] of Object.entries(r.drafts)) if (typeof v === "string" && v.trim()) drafts[k] = v.slice(0, DRAFT_LIMIT);
  }
  const times: Record<string, number> = {};
  if (r.times && typeof r.times === "object") {
    for (const [k, v] of Object.entries(r.times)) if (typeof v === "number" && v > 0) times[k] = Math.floor(v);
  }
  return { done: arr(r.done), saved: arr(r.saved), review: arr(r.review), notes, last, days, practice: !!r.practice, drafts, times };
}

/** Combines a backup with what is on screen without throwing anything away. */
function merge(local: StudyData, incoming: StudyData): StudyData {
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  const review = union(local.review, incoming.review.filter((id) => !local.done.includes(id)));
  const done = union(local.done, incoming.done.filter((id) => !review.includes(id)));
  const notes = { ...incoming.notes, ...local.notes };
  for (const id of Object.keys(local.notes)) {
    const other = incoming.notes[id];
    if (other && other.trim() !== local.notes[id].trim()) notes[id] = `${local.notes[id]}\n\n--- from backup ---\n${other}`.slice(0, NOTE_LIMIT);
  }
  const days = { ...incoming.days };
  for (const [k, v] of Object.entries(local.days)) days[k] = Math.max(days[k] || 0, v);
  const drafts = { ...incoming.drafts, ...local.drafts }; // your current code wins
  const times = { ...incoming.times };
  for (const [k, v] of Object.entries(local.times)) times[k] = Math.min(times[k] ?? Infinity, v);
  return { done, saved: union(local.saved, incoming.saved), review, notes, last: local.last ?? incoming.last, days, practice: local.practice, drafts, times };
}

const summarize = (d: StudyData, savedAt: number | null): BackupInfo => ({
  done: d.done.length,
  saved: d.saved.length,
  review: d.review.length,
  notes: Object.keys(d.notes).length,
  savedAt,
});
const hasProgress = (d: StudyData) => d.done.length + d.saved.length + d.review.length + Object.keys(d.notes).length + Object.keys(d.drafts).length > 0;

/* ------------------------------------------------------------------ */
/* Store (one per page, lives outside React so nothing is lost on re-render) */
/* ------------------------------------------------------------------ */

const SERVER: Snapshot = {
  data: EMPTY,
  ready: false,
  save: { error: null, savedAt: null, persisted: null },
  backup: null,
  recovered: false,
};

let snap: Snapshot = SERVER;
let hydrated = false;
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let sessionBackedUp = false;
let persistAsked = false;
const subs = new Set<() => void>();

const emit = (patch: Partial<Snapshot>) => {
  snap = { ...snap, ...patch };
  subs.forEach((f) => f());
};

function readBackup(): BackupInfo | null {
  const raw = readRaw(BACKUP).value;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    const d = sanitize(j);
    return hasProgress(d) ? summarize(d, typeof j.savedAt === "number" ? j.savedAt : null) : null;
  } catch {
    return null;
  }
}

const serialize = (d: StudyData) => JSON.stringify({ v: 2, savedAt: Date.now(), ...d });

/** Keeps the last good copy before anything that could lose data. */
function backupCurrent(d: StudyData) {
  if (!hasProgress(d)) return;
  if (writeRaw(BACKUP, serialize(d)) === "ok") snap = { ...snap, backup: readBackup() };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  let data = EMPTY;
  let recovered = false;
  const stored = readRaw(KEY);

  if (stored.blocked) {
    emit({ save: { ...snap.save, error: "blocked" } });
  } else if (stored.value) {
    try {
      data = sanitize(JSON.parse(stored.value));
    } catch {
      // Unreadable. Keep the raw text so it can be recovered, and never silently overwrite it.
      writeRaw(CORRUPT, stored.value);
      recovered = true;
    }
  } else {
    const old = readRaw(LEGACY).value; // progress-only key from the first version
    if (old) {
      try {
        data = { ...EMPTY, done: sanitize({ done: JSON.parse(old) }).done };
      } catch {}
    }
  }

  emit({ data, ready: true, recovered, backup: readBackup() });
  checkPersisted().then((p) => emit({ save: { ...snap.save, persisted: p } }));

  window.addEventListener("storage", (e) => {
    // another tab saved: take its data instead of overwriting it with our stale copy
    if (e.key !== KEY || !e.newValue) return;
    try {
      emit({ data: sanitize(JSON.parse(e.newValue)) });
      dirty = false;
    } catch {}
  });
  onPageLeave(flush);
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!dirty || !hydrated) return;

  // first write of the session: keep what was stored before we touch it
  if (!sessionBackedUp) {
    sessionBackedUp = true;
    const prev = readRaw(KEY).value;
    if (prev) {
      try {
        if (hasProgress(sanitize(JSON.parse(prev)))) writeRaw(BACKUP, prev);
        snap = { ...snap, backup: readBackup() };
      } catch {}
    }
  }

  const result = writeRaw(KEY, serialize(snap.data));
  if (result === "ok") {
    dirty = false;
    emit({ save: { ...snap.save, error: null, savedAt: Date.now() } });
    if (!persistAsked) {
      persistAsked = true;
      requestPersistence().then((p) => emit({ save: { ...snap.save, persisted: p } }));
    }
  } else {
    emit({ save: { ...snap.save, error: result } }); // stays dirty, retried on the next change or when the page is hidden
  }
}

function update(fn: (d: StudyData) => StudyData) {
  hydrate();
  const next = fn(snap.data);
  if (next === snap.data) return;
  dirty = true;
  emit({ data: next });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, SAVE_DELAY);
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const getSnapshot = () => snap;
const getServerSnapshot = () => SERVER;

/** Saves right now. Call before the page goes away. */
export const flushStudy = flush;

/* ---------------- actions ---------------- */

const unmaster = (d: StudyData, id: string) => {
  if (!d.done.includes(id)) return { done: d.done, days: d.days };
  const k = dayKey();
  const days = { ...d.days };
  if (days[k]) {
    days[k] -= 1;
    if (days[k] <= 0) delete days[k];
  }
  return { done: d.done.filter((x) => x !== id), days };
};

const actions = {
  toggleDone: (id: string) =>
    update((d) => {
      const was = d.done.includes(id);
      const k = dayKey();
      const days = { ...d.days };
      days[k] = Math.max(0, (days[k] || 0) + (was ? -1 : 1));
      if (!days[k]) delete days[k];
      return { ...d, done: toggle(d.done, id), review: was ? d.review : d.review.filter((x) => x !== id), days };
    }),
  toggleSaved: (id: string) => update((d) => ({ ...d, saved: toggle(d.saved, id) })),
  // flagging a mastered question for review un-masters it, so today's count drops too
  toggleReview: (id: string) =>
    update((d) => (d.review.includes(id) ? { ...d, review: d.review.filter((x) => x !== id) } : { ...d, review: [...d.review, id], ...unmaster(d, id) })),
  flagReview: (id: string) => update((d) => (d.review.includes(id) ? d : { ...d, review: [...d.review, id], ...unmaster(d, id) })),
  setNote: (id: string, text: string) =>
    update((d) => {
      const clean = text.slice(0, NOTE_LIMIT);
      if ((d.notes[id] ?? "") === clean || (!clean.trim() && !d.notes[id])) return d;
      const notes = { ...d.notes };
      if (clean.trim()) notes[id] = clean;
      else delete notes[id];
      return { ...d, notes };
    }),
  setDraft: (id: string, code: string) =>
    update((d) => {
      const clean = code.slice(0, DRAFT_LIMIT);
      if ((d.drafts[id] ?? "") === clean) return d;
      const drafts = { ...d.drafts };
      if (clean.trim()) drafts[id] = clean;
      else delete drafts[id];
      return { ...d, drafts };
    }),
  clearDraft: (id: string) =>
    update((d) => {
      if (!(id in d.drafts)) return d;
      const drafts = { ...d.drafts };
      delete drafts[id];
      return { ...d, drafts };
    }),
  /** keeps only the fastest time */
  recordTime: (id: string, seconds: number) => update((d) => (seconds > 0 && (!d.times[id] || seconds < d.times[id]) ? { ...d, times: { ...d.times, [id]: Math.floor(seconds) } } : d)),
  setLast: (topic: string, id: string) => update((d) => (d.last?.id === id && d.last.topic === topic ? d : { ...d, last: { topic, id } })),
  setPractice: (practice: boolean) => update((d) => (d.practice === practice ? d : { ...d, practice })),

  /** Clears everything, but keeps a copy first so it can be restored. */
  resetAll: () => {
    hydrate();
    backupCurrent(snap.data);
    update(() => ({ ...EMPTY }));
    flush();
  },
  /** Merges a backup file into the current progress. Nothing is removed. Returns false for an unreadable file. */
  importJson: (text: string): boolean => {
    hydrate();
    let incoming: StudyData;
    try {
      incoming = sanitize(JSON.parse(text));
    } catch {
      return false;
    }
    backupCurrent(snap.data);
    update((d) => merge(d, incoming));
    flush();
    return true;
  },
  /** Brings back the saved copy (made before a reset, an import, or at the start of a session). */
  restoreBackup: (): boolean => {
    const raw = readRaw(BACKUP).value;
    if (!raw) return false;
    try {
      const restored = sanitize(JSON.parse(raw));
      const current = snap.data;
      update(() => merge(restored, current)); // restored data first, anything newer is kept too
      flush();
      return true;
    } catch {
      return false;
    }
  },
  exportJson: () => JSON.stringify({ app: "devqna", version: 2, exportedAt: new Date().toISOString(), ...snap.data }, null, 2),
  /** The text of unreadable stored data, if there was any, so it can be downloaded. */
  corruptText: () => readRaw(CORRUPT).value,
  dismissRecovered: () => {
    removeRaw(CORRUPT);
    emit({ recovered: false });
  },
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useStudy() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(hydrate, []);

  const { data } = s;
  const done = useMemo(() => new Set(data.done), [data.done]);
  const saved = useMemo(() => new Set(data.saved), [data.saved]);
  const review = useMemo(() => new Set(data.review), [data.review]);

  const todayCount = data.days[dayKey()] || 0;
  const streak = useMemo(() => {
    const d = new Date();
    // today does not have to be done yet: a streak survives until the day is over
    if (!data.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    let n = 0;
    while (data.days[dayKey(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [data.days]);

  return useMemo(
    () => ({
      ...actions,
      ready: s.ready,
      data,
      done,
      saved,
      review,
      notes: data.notes,
      drafts: data.drafts,
      times: data.times,
      last: data.last,
      practice: data.practice,
      todayCount,
      streak,
      save: s.save,
      backup: s.backup,
      recovered: s.recovered,
    }),
    [s, data, done, saved, review, todayCount, streak]
  );
}

export type Study = ReturnType<typeof useStudy>;
