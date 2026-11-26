/**
 * Automatic checks for the coding round: does the attempt compile, and which requirements does the
 * actual code (not its comments) cover.
 */

export interface Problem {
  line: number;
  col: number;
  message: string;
}

// strings are matched first and kept, so "//" inside a string or URL literal is not treated as a comment
const COMMENT_RE = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

/** Removes comments (keeping line breaks) so a requirement can't be ticked by writing it in a comment. */
export function stripComments(src: string) {
  return src.replace(COMMENT_RE, (m, str) => (str ? m : m.replace(/[^\n]/g, " ")));
}

function countMatches(src: string, pattern: string) {
  try {
    return (src.match(new RegExp(pattern, "gi")) || []).length;
  } catch {
    return 0;
  }
}

/** A requirement counts once the code has more matches of its pattern than the starter template had. */
export function detectRequirements(code: string, starter: string, patterns: (string | undefined)[]) {
  const mine = stripComments(code);
  const base = stripComments(starter);
  return patterns.map((p) => !!p && countMatches(mine, p) > countMatches(base, p));
}

/** True when the attempt is still the starter template (ignoring comments and whitespace). */
export function isUntouched(code: string, starter: string) {
  const norm = (s: string) => stripComments(s).replace(/\s+/g, "");
  return norm(code) === norm(starter);
}

type TS = typeof import("typescript");
let tsPromise: Promise<TS> | null = null;
const loadTs = () =>
  (tsPromise ??= import("typescript").then((m) => ((m as unknown as { default?: TS }).default ?? m) as TS).catch((e) => {
    tsPromise = null; // let a later check retry after a network blip
    throw e;
  }));

/**
 * Syntax check with the TypeScript compiler (TSX enabled). Type errors need the full program and
 * library typings, which are too heavy for the browser, so this reports what a parser would.
 */
export async function compileProblems(code: string): Promise<Problem[]> {
  const ts = await loadTs();
  const r = ts.transpileModule(code, {
    fileName: "solution.tsx",
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true },
  });
  return (r.diagnostics ?? []).slice(0, 20).map((d) => {
    const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : { line: 0, character: 0 };
    return { line: pos.line + 1, col: pos.character + 1, message: ts.flattenDiagnosticMessageText(d.messageText, "\n") };
  });
}
