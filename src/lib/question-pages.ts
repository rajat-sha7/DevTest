import { ALL_QUESTIONS, TOPICS, type Difficulty, type Question, type Topic } from "@/lib/questions";

/**
 * Static, crawlable pages for every interview question:
 *   /interview-questions                  all topics
 *   /interview-questions/<topic>          every question in a topic
 *   /interview-questions/<topic>/<slug>   one question with its full answer
 * The interactive study app at /questions-answers stays the place to practice.
 */
export const BASE = "/interview-questions";

export const TOPIC_INFO: Record<Topic, { label: string; blurb: string }> = {
  nextjs: {
    label: "Next.js",
    blurb:
      "Next.js interview questions on the App Router, Server Components, Server Actions, caching and revalidation, routing, rendering strategies, middleware and performance.",
  },
  react: {
    label: "React",
    blurb:
      "React interview questions on components, state, rendering, reconciliation, context, performance, React 19 features and the patterns interviewers ask about most.",
  },
  javascript: {
    label: "JavaScript",
    blurb:
      "JavaScript interview questions on closures, scope, the event loop, promises and async/await, prototypes, this, modules, and the tricky output questions interviewers love.",
  },
  "html-css": {
    label: "HTML & CSS",
    blurb:
      "HTML and CSS interview questions on semantics, accessibility, the box model, flexbox and grid, specificity, responsive design and modern CSS like :has() and container queries.",
  },
  "react-hooks": {
    label: "React Hooks",
    blurb:
      "React Hooks interview questions on useState, useEffect, useMemo, useCallback, useRef, custom hooks, the rules of hooks and the newer React 19 hooks.",
  },
};

export const TOPIC_IDS = TOPICS.map((t) => t.id as Topic);
export const isTopic = (t: string): t is Topic => (TOPIC_IDS as string[]).includes(t);

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

function slugify(s: string) {
  const full = s
    .toLowerCase()
    .replace(/[`'"’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (full.length <= 80) return full;
  const cut = full.slice(0, 80);
  return cut.slice(0, cut.lastIndexOf("-")) || cut; // end on a whole word
}

/* slugs are unique per topic; a repeated title gets its id appended */
const SLUG_BY_ID = new Map<string, string>();
const BY_SLUG = new Map<string, Question>();
for (const t of TOPIC_IDS) {
  const seen = new Set<string>();
  for (const q of ALL_QUESTIONS.filter((x) => x.topic === t)) {
    let slug = slugify(q.question) || q.id;
    if (seen.has(slug)) slug = `${slug}-${q.id}`;
    seen.add(slug);
    SLUG_BY_ID.set(q.id, slug);
    BY_SLUG.set(`${t}/${slug}`, q);
  }
}

export const questionPath = (q: Question) => `${BASE}/${q.topic}/${SLUG_BY_ID.get(q.id)}`;
export const topicPath = (t: Topic) => `${BASE}/${t}`;
export const studyAppPath = (q: Question) => `/questions-answers?topic=${q.topic}&q=${q.id}`;

export const questionsIn = (t: Topic) => ALL_QUESTIONS.filter((q) => q.topic === t);
export const findQuestion = (t: string, slug: string) => BY_SLUG.get(`${t}/${slug}`);
export const allQuestionParams = () =>
  ALL_QUESTIONS.map((q) => ({ topic: q.topic, slug: SLUG_BY_ID.get(q.id)! }));

/** Markdown answer -> plain text, for meta descriptions and llms.txt summaries. */
export function plainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The answer's opening, cut on a word boundary: a meta description that reads like a summary. */
export function summary(q: Question, max = 158) {
  const text = plainText(q.answer);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\-–]+$/, "") + "…";
}

/** Neighbours in the topic plus a spread of others, so every page links deeper into the set. */
export function relatedQuestions(q: Question, count = 6) {
  const list = questionsIn(q.topic);
  const i = list.findIndex((x) => x.id === q.id);
  const picks: Question[] = [];
  const add = (x?: Question) => x && x.id !== q.id && !picks.includes(x) && picks.push(x);
  add(list[i + 1]);
  add(list[i - 1]);
  add(list[i + 2]);
  // deterministic spread across the topic so links reach the whole list, not just the neighbours
  for (let k = 1; picks.length < count && k < list.length; k++) add(list[(i + k * 37) % list.length]);
  return picks.slice(0, count);
}

export const prevNext = (q: Question) => {
  const list = questionsIn(q.topic);
  const i = list.findIndex((x) => x.id === q.id);
  return { prev: list[i - 1], next: list[i + 1] };
};

/** Same language pick as the study app, so code blocks highlight the same way. */
export function codeLang(q: Question): "js" | "ts" | "html" | "css" {
  const t = (q.code ?? "").trimStart();
  if (t.startsWith("<")) return "html";
  if (q.topic === "html-css" && !/\b(const|let|function|=>)\b/.test(q.code ?? "")) return "css";
  if (q.topic === "javascript") return "js";
  return "ts";
}
