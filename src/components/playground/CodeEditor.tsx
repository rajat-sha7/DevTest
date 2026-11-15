"use client";

import { useMemo, useRef, type KeyboardEvent, type ReactNode } from "react";

export type Lang = "js" | "ts" | "html" | "css";

const JS_KW =
  "const|let|var|function|return|import|from|export|default|async|await|if|else|for|while|of|in|new|class|extends|try|catch|finally|throw|typeof|instanceof|this|null|undefined|true|false|switch|case|break|continue|yield|static|get|set";
const TS_KW = JS_KW + "|interface|type|enum|implements|readonly|public|private|protected|as|keyof|abstract|namespace|declare|string|number|boolean|void|never|unknown|any";

const mk = (kw: string) =>
  new RegExp(
    `(\\/\\/.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|\\b(${kw})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\()`,
    "g"
  );
const JS_RE = mk(JS_KW);
const TS_RE = mk(TS_KW);
const HTML_RE = /(<!--.*?-->)|(<\/?)([a-zA-Z][\w-]*)|("[^"]*"|'[^']*')|([\w-]+)(?==)/g;
const CSS_RE = /(\/\*.*?\*\/)|("[^"]*"|'[^']*')|(@[\w-]+|[.#][\w-]+)|([\w-]+)(?=\s*:)|(#[0-9a-fA-F]{3,8}\b|-?\d[\w.%]*)/g;

const C = { cmt: "#7c8aa5", str: "#86efac", kw: "#ff7ab8", num: "#ffd84d", fn: "#7dd3fc" };

export function HighlightLine({ line, lang }: { line: string; lang: Lang }) {
  const re = lang === "js" ? JS_RE : lang === "ts" ? TS_RE : lang === "html" ? HTML_RE : CSS_RE;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  re.lastIndex = 0;
  for (const m of line.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(line.slice(last, i));
    let color: string = C.fn;
    if (lang === "js" || lang === "ts") {
      color = m[1] ? C.cmt : m[2] ? C.str : m[3] ? C.kw : m[4] ? C.num : C.fn;
    } else if (lang === "html") {
      color = m[1] ? C.cmt : m[2] || m[3] ? C.kw : m[4] ? C.str : C.fn;
      if (m[2] || m[3]) {
        out.push(
          <span key={k++} style={{ color }}>
            {m[2]}
            {m[3]}
          </span>
        );
        last = i + m[0].length;
        continue;
      }
    } else {
      color = m[1] ? C.cmt : m[2] ? C.str : m[3] ? C.kw : m[4] ? C.fn : C.num;
    }
    out.push(
      <span key={k++} style={{ color }}>
        {m[0]}
      </span>
    );
    last = i + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return <>{out}</>;
}

const COMMENT: Record<Lang, [string, string]> = {
  js: ["// ", ""],
  ts: ["// ", ""],
  html: ["<!-- ", " -->"],
  css: ["/* ", " */"],
};

export function CodeEditor({
  value,
  onChange,
  lang,
  fontSize,
  errorLine,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  fontSize: number;
  errorLine?: number | null;
  onRun: () => void;
}) {
  const lines = useMemo(() => value.split("\n"), [value]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const lh = Math.round(fontSize * 1.7);

  const edit = (next: string, a: number, b: number = a) => {
    onChange(next);
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (ta) {
        ta.selectionStart = a;
        ta.selectionEnd = b;
      }
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value: v } = ta;

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
      return;
    }

    // toggle line comment
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      const from = v.lastIndexOf("\n", s - 1) + 1;
      let to = v.indexOf("\n", en);
      if (to === -1) to = v.length;
      const [pre, post] = COMMENT[lang];
      const block = v.slice(from, to).split("\n");
      const all = block.every((l) => !l.trim() || l.trimStart().startsWith(pre.trim()));
      const next = block
        .map((l) => {
          if (!l.trim()) return l;
          const ind = /^\s*/.exec(l)![0];
          const body = l.slice(ind.length);
          if (all) {
            let b = body.startsWith(pre) ? body.slice(pre.length) : body.slice(pre.trim().length);
            if (post && b.endsWith(post)) b = b.slice(0, -post.length);
            else if (post && b.endsWith(post.trim())) b = b.slice(0, -post.trim().length);
            return ind + b;
          }
          return ind + pre + body + post;
        })
        .join("\n");
      edit(v.slice(0, from) + next + v.slice(to), from, from + next.length);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (s !== en && v.slice(s, en).includes("\n")) {
        // indent / outdent selected lines
        const from = v.lastIndexOf("\n", s - 1) + 1;
        const block = v.slice(from, en).split("\n");
        const next = block.map((l) => (e.shiftKey ? l.replace(/^ {1,2}/, "") : "  " + l)).join("\n");
        edit(v.slice(0, from) + next + v.slice(en), from, from + next.length);
      } else if (e.shiftKey) {
        const from = v.lastIndexOf("\n", s - 1) + 1;
        const m = /^ {1,2}/.exec(v.slice(from));
        if (m) edit(v.slice(0, from) + v.slice(from + m[0].length), Math.max(from, s - m[0].length));
      } else {
        edit(v.slice(0, s) + "  " + v.slice(en), s + 2);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const from = v.lastIndexOf("\n", s - 1) + 1;
      const before = v.slice(from, s);
      const indent = /^\s*/.exec(before)![0];
      const opens = /[{(\[]\s*$/.test(before);
      const nextCh = v[en];
      const closes = opens && (nextCh === "}" || nextCh === ")" || nextCh === "]");
      if (closes) {
        const ins = "\n" + indent + "  " + "\n" + indent;
        edit(v.slice(0, s) + ins + v.slice(en), s + 1 + indent.length + 2);
      } else {
        const extra = opens ? "  " : "";
        edit(v.slice(0, s) + "\n" + indent + extra + v.slice(en), s + 1 + indent.length + extra.length);
      }
      return;
    }

    // auto-close brackets and quotes (only when nothing is selected)
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
    if (s === en && pairs[e.key] && lang !== "html") {
      const next = v[s];
      if (e.key === pairs[e.key] && next === e.key) {
        e.preventDefault();
        edit(v, s + 1);
        return;
      }
      if (!next || /[\s)\]};,]/.test(next)) {
        e.preventDefault();
        edit(v.slice(0, s) + e.key + pairs[e.key] + v.slice(en), s + 1);
        return;
      }
    }
    if (s === en && [")", "]", "}"].includes(e.key) && v[s] === e.key) {
      e.preventDefault();
      edit(v, s + 1);
    }
  };

  const fs = { fontSize, lineHeight: `${lh}px` };

  return (
    <div className="flex min-w-max min-h-full font-code" style={fs}>
      <div
        aria-hidden
        className="sticky left-0 z-10 select-none text-right pl-3 pr-3 py-4 text-slate-500 bg-[#0d1226] border-r border-white/5"
      >
        {lines.map((_, i) => (
          <div key={i} className={errorLine === i + 1 ? "text-pink-400 font-bold" : ""}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        <pre aria-hidden className="m-0 py-4 px-4 text-slate-100 whitespace-pre pointer-events-none [tab-size:2]">
          {lines.map((l, i) => (
            <div key={i} className={errorLine === i + 1 ? "bg-pink-500/20 -mx-4 px-4 border-l-2 border-pink-400" : ""}>
              {l ? <HighlightLine line={l} lang={lang} /> : " "}
            </div>
          ))}
          {"\n"}
        </pre>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label="Code editor"
          className="absolute inset-0 w-full h-full py-4 px-4 m-0 bg-transparent text-transparent caret-white resize-none overflow-hidden whitespace-pre outline-none border-0 [tab-size:2] selection:bg-blue-500/40"
          style={fs}
        />
      </div>
    </div>
  );
}
