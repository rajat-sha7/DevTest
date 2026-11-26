import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { SITE } from "@/lib/site";
import { BASE, TOPIC_IDS, TOPIC_INFO, topicPath } from "@/lib/question-pages";

const INK = "#0b1020";

/** Header for the static content pages (same look as the About page). */
export function SiteHeader() {
  return (
    <header data-site-header className="sticky top-0 z-20 bg-[#2b4bff]/95 backdrop-blur border-b-2 border-[#0b1020] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <LogoMark />
          {SITE.name}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm sm:text-[15px] font-medium">
          <Link href={BASE} className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 hidden md:block">Questions</Link>
          <Link href="/coding-round" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 hidden sm:block">Coding round</Link>
          <Link href="/playground" className="px-2 sm:px-3 py-2 rounded-lg hover:bg-white/15 hidden sm:block">Playground</Link>
          <Link
            href="/questions-answers"
            className="ml-1 px-3 sm:px-4 py-2 rounded-lg bg-yellow-300 whitespace-nowrap text-[#0b1020] font-bold border-2 border-[#0b1020] hover:-translate-y-0.5 transition-transform"
            style={{ boxShadow: `3px 3px 0 ${INK}` }}
          >
            Start practicing
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Footer with links into every topic, so each page passes crawl paths to the whole question set. */
export function SiteFooter() {
  return (
    <footer className="bg-[#0b1020] text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-10 grid gap-8 sm:grid-cols-[1fr_auto_auto] text-sm">
        <div>
          <div className="text-white font-extrabold text-lg">{SITE.name}</div>
          <p className="mt-2 max-w-sm leading-relaxed">{SITE.tagline}. Clear answers with runnable code, free and with no account.</p>
        </div>
        <nav aria-label="Interview questions by topic">
          <div className="text-white font-bold mb-2">Interview questions</div>
          <ul className="space-y-1.5">
            {TOPIC_IDS.map((t) => (
              <li key={t}>
                <Link href={topicPath(t)} className="hover:text-white">
                  {TOPIC_INFO[t].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site">
          <div className="text-white font-bold mb-2">Practice</div>
          <ul className="space-y-1.5">
            <li><Link href="/questions-answers" className="hover:text-white">Study app</Link></li>
            <li><Link href="/coding-round" className="hover:text-white">Coding round</Link></li>
            <li><Link href="/playground" className="hover:text-white">Playground</Link></li>
            <li><Link href="/about" className="hover:text-white">About</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-4 text-xs">© {new Date().getFullYear()} {SITE.name}</div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ trail }: { trail: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm font-semibold text-slate-500">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <li><Link href="/" className="hover:text-[#0b1020]">Home</Link></li>
        {trail.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5 min-w-0">
            <span aria-hidden>/</span>
            {c.href ? (
              <Link href={c.href} className="hover:text-[#0b1020]">{c.name}</Link>
            ) : (
              <span aria-current="page" className="text-[#0b1020] truncate max-w-[60vw] sm:max-w-md">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
