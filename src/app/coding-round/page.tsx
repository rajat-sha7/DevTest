"use client";

import { useState, useEffect } from "react";
import { CODING_ROUND_QUESTIONS, CodingQuestion } from "@/lib/coding-round-questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Code2, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  ArrowLeft, 
  Zap, 
  Atom, 
  Sparkles, 
  Copy, 
  CheckCircle2,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CodingRoundPage() {
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion>(CODING_ROUND_QUESTIONS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden rounded-full hover:bg-slate-100 h-10 w-10 text-slate-700"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 font-headline leading-none truncate">Elite Coding Round</h1>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-1 truncate">Top 50 Next.js & React Challenges</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link href="/playground">
            <Button variant="outline" className="rounded-full font-bold text-[8px] sm:text-[10px] uppercase tracking-widest px-3 sm:px-6 h-9 sm:h-10 border-slate-200">
              <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Open Playground</span>
              <span className="xs:hidden">Playground</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "border-r border-slate-100 flex flex-col bg-white lg:bg-slate-50/30 transition-all duration-300 ease-in-out shrink-0 z-40 fixed lg:relative h-[calc(100vh-80px)] lg:h-auto shadow-xl lg:shadow-none",
          isSidebarOpen 
            ? "w-[300px] sm:w-[360px] md:w-[400px] opacity-100 left-0" 
            : "w-0 overflow-hidden opacity-0 -left-[400px] lg:left-0"
        )}>
          <div className="p-6 border-b border-slate-100 bg-white/50 space-y-4">
             <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Curriculum</span>
                <span className="text-primary">50 Challenges</span>
             </div>
             <div className="flex gap-2">
                <Badge variant="outline" className="rounded-full bg-white text-[10px] font-bold">NEXT.JS</Badge>
                <Badge variant="outline" className="rounded-full bg-white text-[10px] font-bold">REACT</Badge>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {CODING_ROUND_QUESTIONS.map((q) => (
              <div 
                key={q.id}
                onClick={() => {
                  setSelectedQuestion(q);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "group p-4 rounded-2xl cursor-pointer transition-all duration-300 mb-2 border-2",
                  selectedQuestion.id === q.id 
                    ? "bg-white border-primary shadow-xl shadow-primary/5" 
                    : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {q.topic === 'Next.js' ? <Zap className="w-3 h-3 text-blue-500" /> : <Atom className="w-3 h-3 text-cyan-500" />}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{q.topic}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] px-1.5 h-4 border-slate-200 opacity-50">{q.difficulty}</Badge>
                </div>
                <h3 className={cn(
                  "text-sm font-bold leading-snug",
                  selectedQuestion.id === q.id ? "text-slate-900" : "text-slate-600 group-hover:text-primary"
                )}>
                  {q.question}
                </h3>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-16 space-y-8 sm:space-y-12">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge className={cn(
                  "rounded-full px-3 py-1 sm:px-4 sm:py-1.5 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest",
                  selectedQuestion.difficulty === 'Expert' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {selectedQuestion.difficulty} Level
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 sm:px-4 sm:py-1.5 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400">
                  {selectedQuestion.topic} Architecture
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-headline leading-tight">
                {selectedQuestion.question}
              </h2>
            </div>

            <section className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3 opacity-30">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] font-headline">Technical Breakdown</h3>
              </div>
              <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-medium">
                {selectedQuestion.answer}
              </p>
            </section>

            <section className="space-y-4 sm:space-y-6">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 opacity-30">
                  <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] font-headline">Implementation</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopyCode(selectedQuestion.code)}
                  className="rounded-full h-8 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary w-full xs:w-auto text-left justify-start xs:justify-center"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy Implementation
                </Button>
              </div>
              <Card className="bg-[#0D1117] border-none overflow-hidden shadow-2xl rounded-2xl sm:rounded-[2.5rem] ring-1 ring-white/5">
                <div className="px-4 sm:px-8 py-3 sm:py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/40" />
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/40" />
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/40" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase">TypeScript / TSX</span>
                </div>
                <CardContent className="p-0">
                  <div className="p-4 sm:p-8 overflow-x-auto custom-scrollbar">
                    <pre className="font-code text-xs sm:text-[15px] leading-relaxed">
                      <code className="text-slate-300">
                        {selectedQuestion.code.split('\n').map((line, i) => (
                          <div key={i} className="table-row group/line hover:bg-white/5">
                            <span className="table-cell pr-3 sm:pr-8 text-slate-700 select-none text-right text-[10px] sm:text-xs tabular-nums border-r border-white/5">{i + 1}</span>
                            <span className="table-cell pl-3 sm:pl-6">{line}</span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </section>

            <div className="pt-16 border-t border-slate-100 flex items-center justify-center gap-4">
               <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">This challenge focuses on Next.js 15 best practices.</span>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
