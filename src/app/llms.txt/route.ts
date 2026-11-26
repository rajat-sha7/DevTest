import { SITE, abs } from "@/lib/site";
import { ALL_QUESTIONS } from "@/lib/questions";
import { CODING_ROUND_QUESTIONS } from "@/lib/coding-round-questions";
import { cleanTitle } from "@/lib/coding-round-content";
import { BASE, DIFFICULTIES, TOPIC_IDS, TOPIC_INFO, questionPath, questionsIn, topicPath } from "@/lib/question-pages";

/**
 * /llms.txt (https://llmstxt.org): a short, markdown map of the site for AI assistants and
 * answer engines. The complete question-and-answer text is in /llms-full.txt.
 */
export const dynamic = "force-static";

export function GET() {
  const challenges = [...new Set(CODING_ROUND_QUESTIONS.map((q) => cleanTitle(q.question)))];
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `${SITE.name} has ${ALL_QUESTIONS.length} frontend interview questions, each with a detailed answer and a code example, plus ${challenges.length} timed Next.js and React coding challenges and an in-browser JavaScript, TypeScript and HTML/CSS playground. Everything is free and needs no account. Answers target current tools: the Next.js App Router, React 19, and modern CSS.`,
    "",
    "## Interview questions by topic",
    "",
    `- [All interview questions](${abs(BASE)}): index of every topic`,
    ...TOPIC_IDS.map((t) => {
      const qs = questionsIn(t);
      const mix = DIFFICULTIES.map((d) => `${qs.filter((q) => q.difficulty === d).length} ${d.toLowerCase()}`).join(", ");
      return `- [${TOPIC_INFO[t].label} interview questions](${abs(topicPath(t))}): ${qs.length} questions (${mix}). ${TOPIC_INFO[t].blurb}`;
    }),
    "",
    "## Sample questions",
    "",
    ...TOPIC_IDS.flatMap((t) => questionsIn(t).slice(0, 3).map((q) => `- [${q.question}](${abs(questionPath(q))})`)),
    "",
    "## Practice tools",
    "",
    `- [Study app](${abs("/questions-answers")}): practice questions by topic and difficulty with progress tracking, notes, bookmarks and text-to-speech`,
    `- [Coding round](${abs("/coding-round")}): timed Next.js and React coding challenges with requirements, hints, live compile checks and a reference solution`,
    `- [Playground](${abs("/playground")}): run JavaScript, TypeScript and HTML/CSS in the browser, with shareable links`,
    "",
    "## Coding round challenges",
    "",
    ...challenges.map((c) => `- ${c}`),
    "",
    "## Optional",
    "",
    `- [Full question and answer text](${abs("/llms-full.txt")}): every question with its complete answer and code, as markdown`,
    `- [About ${SITE.name}](${abs("/about")})`,
    `- [Sitemap](${abs("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
