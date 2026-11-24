/**
 * Free, on-device translation with the browser's built-in Translator API
 * (Chrome / Edge 138+ on desktop). No API key, nothing leaves the device.
 * Returns null when the browser does not support it or the language pair is unavailable,
 * so callers can fall back to a server translation.
 *
 * Docs: https://developer.chrome.com/docs/ai/translator-api
 */

type Availability = "unavailable" | "downloadable" | "downloading" | "available";

interface BuiltInTranslator {
  translate(text: string): Promise<string>;
  destroy?(): void;
}

interface TranslatorStatic {
  availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<BuiltInTranslator>;
}

const api = (): TranslatorStatic | null =>
  typeof self !== "undefined" && "Translator" in self ? ((self as unknown as { Translator: TranslatorStatic }).Translator ?? null) : null;

/** Whether this browser can translate en → target on device (possibly after a one-time download). */
export async function canTranslateBuiltIn(target: string, source = "en"): Promise<boolean> {
  const T = api();
  if (!T) return false;
  try {
    return (await T.availability({ sourceLanguage: source, targetLanguage: target })) !== "unavailable";
  } catch {
    return false;
  }
}

/** Splits long text at sentence boundaries so each request stays small. */
function pieces(text: string, max = 900): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Translates on device. `onProgress` reports the one-time language-pack download (0–1).
 * Must be called from a user gesture (click / key press) the first time, because the
 * browser may need to download the model.
 */
export async function translateBuiltIn(
  text: string,
  target: string,
  onProgress?: (loaded: number) => void,
  source = "en"
): Promise<string | null> {
  const T = api();
  if (!T) return null;
  try {
    const availability = await T.availability({ sourceLanguage: source, targetLanguage: target });
    if (availability === "unavailable") return null;
    const translator = await T.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor: (m) =>
        m.addEventListener("downloadprogress", (e) => onProgress?.((e as unknown as { loaded: number }).loaded ?? 0)),
    });
    const out: string[] = [];
    for (const p of pieces(text)) out.push(await translator.translate(p));
    translator.destroy?.();
    const result = out.join(" ").trim();
    return result || null;
  } catch (e) {
    console.warn("Built-in translation failed, falling back:", e);
    return null;
  }
}
