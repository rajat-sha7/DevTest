/**
 * Answer markdown -> text that sounds natural when read aloud. Shared by the Listen controls (browser)
 * and the Hindi translation server action, which rebuilds the text from the question id.
 */

/** Code symbols read aloud as words, so "a => b" is not spoken as "equals greater than". */
const SYMBOLS: [RegExp, string][] = [
  [/===/g, " strictly equals "],
  [/!==/g, " is not strictly equal to "],
  [/=>/g, " arrow "],
  [/&&/g, " and "],
  [/\|\|/g, " or "],
  [/\?\?/g, " nullish coalescing "],
  [/\.\.\./g, " spread "],
  [/->/g, " to "],
  [/→/g, " to "],
  [/≈/g, " about "],
  [/\s[<]=\s/g, " less than or equal to "],
  [/\s[>]=\s/g, " greater than or equal to "],
];

/** Turns an answer's Markdown into plain sentences that sound natural when spoken. */
export function markdownToSpeech(md: string): string {
  let t = md.replace(/\r\n/g, "\n");
  // fenced code blocks are described, not read character by character
  t = t.replace(/```[\s\S]*?```/g, "\n(There is a code example on screen.)\n");
  // tables: read each row as a list of cells, skip the separator row
  t = t.replace(/^[ \t]*\|?[ \t]*:?-{2,}.*$/gm, "");
  t = t.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_, row: string) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join(", ") + "."
  );
  t = t
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/`([^`]+)`/g, "$1") // inline code -> its text
    .replace(/<\/?[a-z][^>]*>/gi, (tag) => tag.replace(/[<>/]/g, " ")) // <div> -> " div "
    .replace(/(\*\*|\*|~~)(?=\S)([\s\S]*?\S)\1/g, "$2") // bold / italic / strike (not "_", which appears in identifiers)
    .replace(/(^|\s)__?(\S[^_]*\S)__?(?=\s|[.,;:!?]|$)/g, "$1$2"); // _italic_ / __bold__ only at word edges
  // headings and list items become sentences so the voice pauses between them
  t = t
    .split("\n")
    .map((line) => {
      const l = line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
        .replace(/^\s*>\s?/, "")
        .trim();
      if (!l) return "";
      return /[.!?:;,)]$/.test(l) ? l : `${l}.`;
    })
    .filter(Boolean)
    .join(" ");
  for (const [re, word] of SYMBOLS) t = t.replace(re, word);
  return t.replace(/\s+/g, " ").replace(/\s+([.,;:!?])(?=\s|$)/g, "$1").trim();
}

/** What the Listen button reads for a question: the question, then its answer. */
export const speechTextFor = (title: string, answer: string) => `${title.replace(/[?]?$/, "?")} ${markdownToSpeech(answer)}`;
