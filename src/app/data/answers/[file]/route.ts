import { ALL_QUESTIONS } from "@/lib/questions";
import { TOPICS, type TopicAnswers } from "@/lib/topics";

/**
 * /data/answers/<topic>.json: one topic's answers and code, generated at build time.
 * The study app loads these on demand instead of bundling the whole question bank.
 */
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => TOPICS.map((t) => ({ file: `${t.id}.json` }));

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const topic = (await params).file.replace(/\.json$/, "");
  const out: TopicAnswers = {};
  for (const q of ALL_QUESTIONS) if (q.topic === topic) out[q.id] = q.code ? { answer: q.answer, code: q.code } : { answer: q.answer };
  return Response.json(out, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
