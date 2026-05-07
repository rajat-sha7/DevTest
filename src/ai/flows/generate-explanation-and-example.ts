'use server';

import { withFallback } from '@/lib/groq';
import { z } from 'zod';

const GenerateExplanationAndExampleInputSchema = z.object({
  concept: z.string(),
  context: z.string(),
  programmingLanguage: z.string(),
});

export type GenerateExplanationAndExampleInput = z.infer<typeof GenerateExplanationAndExampleInputSchema>;

export interface GenerateExplanationAndExampleOutput {
  explanation: string;
  codeExample: string;
  relatedConcepts: string[];
  researchQueries: string[];
}

export async function generateExplanationAndExample(
  input: GenerateExplanationAndExampleInput
): Promise<GenerateExplanationAndExampleOutput> {
  const { concept, context, programmingLanguage } = input;

  const prompt = `
    You are an elite technical educator.
    Provide a deep-dive research brief for the concept: "${concept}".
    
    Context: ${context}
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
            role: "system",
            content: "You are a senior software architect and technical educator. Always respond in valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      return chatCompletion.choices[0]?.message?.content;
    });

    if (!content) {
      throw new Error("Groq failed to generate content.");
    }


    return JSON.parse(content) as GenerateExplanationAndExampleOutput;
  } catch (error) {
    console.error("Groq AI Error:", error);
    throw new Error("Failed to generate AI response. Please try again.");
  }
}

