#!/usr/bin/env node
/**
 * Builds src/lib/answers/<topic>.json from the readable sources in content/answers/<topic>/*.md
 *
 * Source format (one file holds many entries):
 *
 *   === j12 | M | What is block scope?
 *   <answer in Markdown>
 *   --- code
 *   <code example>
 *
 * Writing the content as plain text means code with backticks and ${} needs no escaping.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "content/answers");
const OUT = join(ROOT, "src/lib/answers");
const LEVEL = { E: "Easy", M: "Medium", H: "Hard" };
const HEADER = /^=== (\S+) \| ([EMH]) \| (.+)$/;

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

let problems = 0;
for (const topic of readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const out = {};
  const files = readdirSync(join(SRC, topic)).filter((f) => f.endsWith(".md")).sort();
  for (const file of files) {
    const lines = readFileSync(join(SRC, topic, file), "utf8").replace(/\r\n/g, "\n").split("\n");
    let cur = null;
    let part = "a";
    const flush = () => {
      if (!cur) return;
      const a = cur.a.join("\n").trim();
      const c = cur.c.join("\n").replace(/\s+$/, "");
      if (!a || !c) {
        console.error(`${topic}/${file}: ${cur.id} is missing its ${!a ? "answer" : "code"}`);
        problems++;
      }
      if (out[cur.id]) {
        console.error(`${topic}/${file}: ${cur.id} is defined twice`);
        problems++;
      }
      out[cur.id] = { q: cur.q, d: cur.d, a, c };
    };
    for (const line of lines) {
      const h = HEADER.exec(line);
      if (h) {
        flush();
        cur = { id: h[1], d: LEVEL[h[2]], q: h[3].trim(), a: [], c: [] };
        part = "a";
      } else if (cur && line.trim() === "--- code") {
        part = "c";
      } else if (cur) {
        cur[part].push(line);
      }
    }
    flush();
  }
  writeFileSync(join(OUT, `${topic}.json`), JSON.stringify(out, null, 1) + "\n");
  console.log(`${topic}: ${Object.keys(out).length} answers -> src/lib/answers/${topic}.json`);
}
if (problems) {
  console.error(`${problems} problem(s)`);
  process.exit(1);
}
