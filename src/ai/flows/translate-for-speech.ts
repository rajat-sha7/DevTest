'use server';

import { withFallback } from '@/lib/groq';

/**
 * Translates an answer (already converted to plain spoken text) into natural,
 * conversational Hindi for text-to-speech. Technical terms stay in English, the
 * way Indian developers actually speak about them.
 */

const MAX_INPUT = 6000; // characters; answers are ~1,500 on average
const cache = new Map<string, string>(); // per server instance; answers rarely change

export interface TranslateForSpeechResult {
  ok: boolean;
  text?: string;
  error?: 'unavailable' | 'failed';
}

export async function translateForSpeech(input: { key: string; text: string }): Promise<TranslateForSpeechResult> {
  const text = input.text.slice(0, MAX_INPUT).trim();
  if (!text) return { ok: false, error: 'failed' };

  const cacheKey = `${input.key}:${text.length}`;
  const hit = cache.get(cacheKey);
  if (hit) return { ok: true, text: hit };

  if (!process.env.GROQ_API_KEY_1 && !process.env.GROQ_API_KEY_2 && !process.env.GROQ_API_KEY_3) {
    return { ok: false, error: 'unavailable' };
  }

  try {
    const out = await withFallback(async (client) => {
      const res = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: [
              'You translate frontend interview explanations into natural, conversational Hindi that will be read aloud by a Hindi text-to-speech voice.',
              'Rules:',
              '- Write Hindi in Devanagari script, the way a friendly senior developer in India explains things.',
              '- Keep technical terms, API names, code identifiers, library and framework names in English (Latin script): React, useState, closure, event loop, API, props, CSS, Flexbox, etc.',
              '- Keep the meaning exact; do not add or drop facts.',
              '- Short sentences. End sentences with "।".',
              '- Plain text only: no Markdown, no bullet symbols, no quotes around the output, no notes.',
            ].join('\n'),
          },
          { role: 'user', content: text },
        ],
      });
      return res.choices[0]?.message?.content?.trim();
    });
    if (!out) return { ok: false, error: 'failed' };
    cache.set(cacheKey, out);
    return { ok: true, text: out };
  } catch (e) {
    console.error('Hindi translation failed:', e);
    return { ok: false, error: 'failed' };
  }
}
