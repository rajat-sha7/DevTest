'use server';

import { withFallback } from '@/lib/groq';
import { allow } from '@/lib/rate-limit';
import { ALL_QUESTIONS } from '@/lib/questions';

const LANGUAGE_NAME: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React.js',
  javascript: 'JavaScript',
  'html-css': 'HTML/CSS',
  'react-hooks': 'React Hooks',
};

const BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export interface GenerateExplanationAndExampleOutput {
  explanation: string;
  codeExample: string;
  relatedConcepts: string[];
  researchQueries: string[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const list = (v: unknown, n: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, n).map((x) => x.slice(0, 200)) : [];

/** The model's JSON is untrusted: keep only the expected fields, with sane types and sizes. */
function normalize(raw: unknown): GenerateExplanationAndExampleOutput {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = {
    explanation: str(o.explanation, 8000),
    codeExample: str(o.codeExample, 8000),
    relatedConcepts: list(o.relatedConcepts, 6),
    researchQueries: list(o.researchQueries, 4),
  };
  if (!out.explanation) throw new Error('empty explanation');
  return out;
}

/**
 * Deep-dive for one question. Takes only the question id: the concept and context are looked up on
 * the server, so this action can't be used as a general-purpose prompt endpoint on our Groq keys.
 */
export async function generateExplanationAndExample(input: { id: string }): Promise<GenerateExplanationAndExampleOutput> {
  const q = typeof input?.id === 'string' ? BY_ID.get(input.id) : undefined;
  if (!q) throw new Error('Unknown question.');

  if (!(await allow('deep-dive', 5, 60_000)) || !(await allow('deep-dive-hour', 30, 3_600_000))) {
    throw new Error("You've asked for a lot of deep dives in a short time. Please wait a minute and try again.");
  }

  const programmingLanguage = LANGUAGE_NAME[q.topic] ?? 'JavaScript';
  const prompt = `
    You are an elite technical educator.
    Provide a deep-dive research brief for the concept: "${q.question}".

    Context: ${q.answer}
    Language/Framework: ${programmingLanguage}

    Return the response as a JSON object with the following fields:
    - explanation: A detailed, clear explanation (2-3 paragraphs) that builds upon the context.
    - codeExample: A production-quality code example in ${programmingLanguage}.
    - relatedConcepts: A list of 3-5 related technical concepts or advanced topics.
    - researchQueries: A list of 2-3 specific search queries for official documentation or MDN.

    Ensure the code example is high-quality and includes comments.
  `;

  try {
    const content = await withFallback(async (client) => {
      const chatCompletion = await client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a senior software architect and technical educator. Always respond in valid JSON format.',
          },
          { role: 'user', content: prompt },
        ],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2048,
      });
      return chatCompletion.choices[0]?.message?.content;
    });

    if (!content) throw new Error('Groq returned no content.');
    return normalize(JSON.parse(content));
  } catch (error) {
    console.error('Groq AI Error:', error);
    throw new Error('Failed to generate AI response. Please try again.');
  }
}
