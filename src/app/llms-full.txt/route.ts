import { SITE, abs } from "@/lib/site";
import { ALL_QUESTIONS } from "@/lib/questions";
import { TOPIC_IDS, TOPIC_INFO, codeLang, questionPath, questionsIn, topicPath } from "@/lib/question-pages";

/** /llms-full.txt: every interview question with its full answer and code, as one markdown file. */
export const dynamic = "force-static";

const FENCE: Record<string, string> = { js: "javascript", ts: "tsx", html: "html", css: "css" };

export function GET() {
  const out: string[] = [
    `# ${SITE.name}: frontend interview questions and answers`,
    "",
    `> ${ALL_QUESTIONS.length} questions with complete answers and code examples. Source: ${abs("/")}. Each question links to its page.`,
    "",
  ];
  for (const t of TOPIC_IDS) {
    out.push(`## ${TOPIC_INFO[t].label} interview questions`, "", `Topic page: ${abs(topicPath(t))}`, "");
    for (const q of questionsIn(t)) {
      out.push(
        `### ${q.question}`,
        "",
        `Difficulty: ${q.difficulty} · URL: ${abs(questionPath(q))}`,
        "",
        // answers use ### for their own sections; push them below this question's heading
        q.answer.replace(/^(#{1,4}) /gm, (_, h: string) => `${"#".repeat(Math.min(h.length + 1, 6))} `).trim(),
        ""
      );
      if (q.code) out.push("```" + FENCE[codeLang(q)], q.code.trim(), "```", "");
    }
  }
  return new Response(out.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
