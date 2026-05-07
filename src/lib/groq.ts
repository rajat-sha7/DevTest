import Groq from "groq-sdk";

const API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

/**
 * Executes a callback with each API key until one succeeds.
 * This provides a fallback mechanism for rate limits or exhaustion.
 */
export async function withFallback<T>(
  operation: (client: Groq) => Promise<T>
): Promise<T> {
  let lastError: any;

  for (const apiKey of API_KEYS) {
    try {
      const client = new Groq({ apiKey });
      return await operation(client);
    } catch (error: any) {
      lastError = error;
      // If it's a rate limit (429) or other retryable error, continue to next key
      if (error?.status === 429 || error?.status >= 500) {
        console.warn(`Groq API key failed, trying fallback...`);
        continue;
      }
      // If it's a permanent error (e.g. 401), we might still want to try next key just in case
      console.warn(`Groq API error with current key: ${error.message}`);
      continue;
    }
  }

  throw lastError || new Error("All Groq API keys failed.");
}

