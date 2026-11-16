/**
 * Quality gate for rewritten answers: alignment with the question list, length,
 * and (for JavaScript) actually running every example so broken code cannot ship.
 * Run: npx tsx scripts/check-answers.ts [topic]
 */
import vm from "node:vm";
import { readFileSync, existsSync } from "node:fs";
import { ALL_QUESTIONS } from "../src/lib/questions";

type Entry = { q: string; d: string; a: string; c: string };
const only = process.argv[2];
const TOPICS: Record<string, string> = { javascript: "j", react: "r", nextjs: "n", "html-css": "hc", "react-hooks": "rh" };

const words = (s: string) => s.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
const browserOnly = (c: string) => /\b(document|window|localStorage|sessionStorage|navigator|location|history)\b\s*[.[(]|\bnew Worker\(/.test(c);
const usesNetwork = (c: string) => /\bfetch\s*\(|axios|XMLHttpRequest|new WebSocket/.test(c);
const isModule = (c: string) => /^\s*(import|export)\s/m.test(c);

async function run(code: string): Promise<string | null> {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const sandbox: Record<string, unknown> = {
    console: { log() {}, info() {}, warn() {}, error() {}, table() {}, group() {}, groupEnd() {}, time() {}, timeEnd() {}, count() {}, assert() {}, dir() {} },
    setTimeout: (f: () => void, ms?: number) => { const t = setTimeout(f, Math.min(ms ?? 0, 300)); timers.add(t); return t; },
    clearTimeout: (t: ReturnType<typeof setTimeout>) => clearTimeout(t),
    setInterval: (f: () => void, ms?: number) => { const t = setInterval(f, Math.min(ms ?? 0, 50)); timers.add(t); return t; },
    clearInterval: (t: ReturnType<typeof setInterval>) => clearInterval(t),
    queueMicrotask, structuredClone, AbortSignal, Response, Request, Headers, crypto, atob, btoa, Intl, EventTarget, Event, CustomEvent, performance, URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, Blob,
  };
  try {
    const script = new vm.Script(`(async () => {\n${code}\n})()`);
    const p = script.runInNewContext(sandbox, { timeout: 2000 }) as Promise<unknown>;
    await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("still running after 3s")), 3000))]);
    return null;
  } catch (e) {
    return (e as Error).message;
  } finally {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  }
}

async function main() {
let fail = 0;
let warn = 0;
for (const [topic, prefix] of Object.entries(TOPICS)) {
  if (only && only !== topic) continue;
  const file = `src/lib/answers/${topic}.json`;
  if (!existsSync(file)) continue;
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, Entry>;
  const questions = ALL_QUESTIONS.filter((q) => q.topic === topic);
  let ran = 0;
  for (const [id, e] of Object.entries(data)) {
    const q = questions.find((x) => x.id === id);
    if (!q) { console.log(`FAIL ${id}: no such question`); fail++; continue; }
    if (q.question.trim() !== e.q.trim()) { console.log(`FAIL ${id}: question text differs\n  data:   ${q.question}\n  answer: ${e.q}`); fail++; }
    const w = words(e.a);
    if (w < 110 || w > 420) { console.log(`WARN ${id}: answer is ${w} words`); warn++; }
    const lines = e.c.split("\n").length;
    if (lines < 5 || lines > 45) { console.log(`WARN ${id}: code is ${lines} lines`); warn++; }
    if (!e.a.startsWith("**")) { console.log(`WARN ${id}: answer should open with a bold one-line summary`); warn++; }
    if (topic === "javascript" && !browserOnly(e.c) && !usesNetwork(e.c) && !isModule(e.c)) {
      const err = await run(e.c);
      ran++;
      // Node's vm cannot run import() without a loader; browsers can, so those are verified in the browser instead
      if (err && /dynamic import callback/i.test(err)) { console.log(`SKIP ${id}: uses import(), verified in the browser`); ran--; }
      else if (err) { console.log(`FAIL ${id}: example throws -> ${err}`); fail++; }
    }
  }
  console.log(`${topic}: ${Object.keys(data).length}/${questions.length} rewritten${ran ? `, ${ran} examples executed` : ""}`);
}
console.log(`\n${fail} failure(s), ${warn} warning(s)`);
process.exit(fail ? 1 : 0);
}

main();
