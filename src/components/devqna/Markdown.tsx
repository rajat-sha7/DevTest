import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders an answer's markdown in the site's style. Has no client-only code, so it works both in the
 * study app and in the server-rendered question pages.
 */
const COMPONENTS: Components = {
  h1: (p) => <h2 className="text-2xl font-extrabold text-[#0b1020] mt-8 mb-3" {...p} />,
  h2: (p) => <h2 className="text-2xl font-extrabold text-[#0b1020] mt-8 mb-3" {...p} />,
  h3: (p) => <h3 className="text-xl font-extrabold text-[#0b1020] mt-7 mb-3" {...p} />,
  h4: (p) => <h4 className="text-base font-extrabold uppercase tracking-wide text-[#0b1020] mt-6 mb-2" {...p} />,
  p: (p) => <p className="mb-4" {...p} />,
  strong: (p) => <strong className="font-bold text-[#0b1020]" {...p} />,
  ul: (p) => <ul className="list-disc pl-6 mb-4 space-y-1.5 marker:text-[#2b4bff]" {...p} />,
  ol: (p) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 marker:font-bold" {...p} />,
  blockquote: (p) => <blockquote className="border-l-4 border-yellow-300 bg-yellow-50 pl-4 py-2 my-4 rounded-r-lg" {...p} />,
  a: (p) => <a className="font-semibold text-[#2b4bff] underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />,
  table: (p) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse border-2 border-[#0b1020]" {...p} />
    </div>
  ),
  th: (p) => <th className="bg-yellow-200 border border-[#0b1020]/40 px-3 py-2 text-left font-bold" {...p} />,
  td: (p) => <td className="border border-[#0b1020]/20 px-3 py-2" {...p} />,
  pre: (p) => (
    <pre
      className="my-4 rounded-xl bg-[#0b1020] text-slate-100 p-4 overflow-x-auto text-sm leading-6 font-code [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:border-0"
      {...p}
    />
  ),
  code: ({ className, children, ...p }) => (
    <code className={cn("font-code text-[0.9em] bg-yellow-100 border border-yellow-300 rounded px-1.5 py-0.5", className)} {...p}>
      {children}
    </code>
  ),
};
const PLUGINS = [remarkGfm];

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
}
