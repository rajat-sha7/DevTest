import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";
import { NotFoundPath } from "@/components/NotFoundPath";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
  // a 404 must not inherit the root layout's canonical ("/")
  alternates: { canonical: null },
};

const links = [
  { href: "/questions-answers", label: "Browse questions", note: "Pick a topic and start practising", bg: "bg-sky-300" },
  { href: "/coding-round", label: "Coding round", note: "Timed, hands-on tasks", bg: "bg-pink-300" },
  { href: "/playground", label: "Playground", note: "Run JS, TS and HTML/CSS", bg: "bg-violet-300" },
];

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-[#2b4bff] text-white flex flex-col"
      style={{
        backgroundImage: "radial-gradient(rgb(255 255 255 / .16) 1.3px, transparent 1.3px)",
        backgroundSize: "26px 26px",
      }}
    >
      <header data-site-header className="border-b-2 border-[#0b1020]">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center">
          <Link href="/" className="font-extrabold text-xl tracking-tight flex items-center gap-2">
            <LogoMark />
            DevQnA
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-5 py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          <div className="text-center">
            <h1
              className="text-[7rem] sm:text-[10rem] leading-none font-extrabold tracking-tighter text-yellow-300"
              style={{ textShadow: "5px 5px 0 #0b1020", WebkitTextStroke: "3px #0b1020", paintOrder: "stroke fill" }}
            >
              404
            </h1>
            <p className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight">This page doesn&apos;t exist.</p>
            <p className="mt-3 text-base sm:text-lg text-blue-50 max-w-xl mx-auto">
              It may have moved, or the link might have a typo. Here is what your browser was looking for:
            </p>
          </div>

          <pre className="mt-8 rounded-2xl border-2 border-[#0b1020] bg-[#0b1020] p-4 sm:p-5 font-code text-[12.5px] sm:text-sm leading-6 overflow-x-auto shadow-[6px_6px_0_#ffd84d] text-slate-100">
            <code>
              <span className="text-[#ff7ab8]">const</span> page = routes.<span className="text-[#7dd3fc]">find</span>((r) =&gt; r.path === <NotFoundPath />);
              {"\n"}
              <span className="text-[#7dd3fc]">console</span>.<span className="text-[#7dd3fc]">log</span>(page);
              {"\n"}
              <span className="text-[#7c8aa5]">{"// "}</span>
              <span className="text-[#ff7ab8]">undefined</span>
            </code>
          </pre>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/"
              className="px-7 py-3.5 rounded-xl text-center bg-yellow-300 text-[#0b1020] text-base sm:text-lg font-extrabold border-2 border-[#0b1020] shadow-[5px_5px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Back to home
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`group rounded-2xl border-2 border-[#0b1020] p-4 text-[#0b1020] shadow-[4px_4px_0_#0b1020] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform ${l.bg}`}
              >
                <div className="font-extrabold">
                  {l.label} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </div>
                <div className="mt-1 text-sm text-slate-800">{l.note}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
