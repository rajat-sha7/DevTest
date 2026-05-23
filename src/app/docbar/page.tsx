// src/app/docbar/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Code2, Layout, Zap, Atom, GraduationCap, Trophy, Terminal, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const topics = [
  { id: "react", label: "React", icon: <Atom className="w-8 h-8" /> },
  { id: "nextjs", label: "Next.js", icon: <Zap className="w-8 h-8" /> },
  { id: "javascript", label: "JavaScript", icon: <Code2 className="w-8 h-8" /> },
  { id: "htmlcss", label: "HTML / CSS", icon: <Layout className="w-8 h-8" /> },
];

export default function DocBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="h-16 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-headline">DevQnA Prep</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</Link>
            <Link href="/coding-round" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Coding Round
            </Link>
            <Link href="/playground" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              JS Playground
            </Link>
            <Link href="/dashboard">
              <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">Get Started</Button>
            </Link>
          </div>
          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-slate-100 h-10 w-10 text-slate-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-slate-100 shadow-xl animate-in slide-in-from-top-5 duration-200 z-50">
            <div className="flex flex-col p-6 gap-4">
              <Link 
                href="/#features" 
                className="text-base font-semibold text-slate-700 hover:text-primary transition-colors py-2.5 border-b border-slate-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="/coding-round" 
                className="text-base font-semibold text-slate-700 hover:text-primary transition-colors flex items-center gap-2.5 py-2.5 border-b border-slate-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy className="w-5 h-5 text-amber-500" />
                Coding Round
              </Link>
              <Link 
                href="/playground" 
                className="text-base font-semibold text-slate-700 hover:text-primary transition-colors flex items-center gap-2.5 py-2.5 border-b border-slate-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Terminal className="w-5 h-5 text-slate-500" />
                JS Playground
              </Link>
              <Link 
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full pt-2"
              >
                <Button className="w-full rounded-full py-6 font-bold shadow-lg shadow-primary/20 text-base">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/20 blur-[100px] rounded-full" />
        </div>

        <section className="py-20 px-6 lg:px-12 flex-1 flex flex-col justify-center">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-headline mb-4">
              Documentation <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Hub</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">
              Explore in-depth documentation and visual guides for your favorite technologies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/docbar/${topic.id}`}
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 p-8 text-center shadow-2xl transition-all duration-500",
                  "hover:-translate-y-2 hover:shadow-cyan-500/10 hover:bg-white/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-6 p-4 rounded-2xl bg-white/10 text-cyan-400 ring-1 ring-white/20 group-hover:scale-110 group-hover:text-cyan-300 transition-all duration-500">
                    {topic.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-white font-headline tracking-wide">{topic.label}</h2>
                  <div className="mt-4 flex items-center gap-2 text-cyan-400/70 text-sm font-semibold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <span>View Docs</span>
                    <Terminal className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded text-primary-foreground">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 font-headline">DevQnA Prep</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link href="/coding-round" className="hover:text-primary transition-colors">Coding Round</Link>
            <Link href="/playground" className="hover:text-primary transition-colors">Playground</Link>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} DevQnA Prep. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
