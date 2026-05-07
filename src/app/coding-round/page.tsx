"use client";

import { useState } from "react";
import { CODING_ROUND_QUESTIONS, CodingQuestion } from "@/lib/coding-round-questions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Code2, 
  ChevronRight, 
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
  const { toast } = useToast();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-headline leading-none">Elite Coding Round</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Top 50 Next.js & React Challenges</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/playground">
            <Button variant="outline" className="rounded-full font-bold text-[10px] uppercase tracking-widest px-6 border-slate-200">
              <Terminal className="w-4 h-4 mr-2" />
              Open Playground
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[400px] border-r border-slate-100 flex flex-col bg-slate-50/30">
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
                onClick={() => setSelectedQuestion(q)}
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
          <div className="max-w-4xl mx-auto px-12 py-16 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className={cn(
                  "rounded-full px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest",
                  selectedQuestion.difficulty === 'Expert' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {selectedQuestion.difficulty} Level
                </Badge>
                <Badge variant="outline" className="rounded-full px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest text-slate-400">
                  {selectedQuestion.topic} Architecture
                </Badge>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-headline leading-tight">
                {selectedQuestion.question}
              </h2>
            </div>

            <section className="space-y-6">
              <div className="flex items-center gap-3 opacity-30">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] font-headline">Technical Breakdown</h3>
              </div>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">
                {selectedQuestion.answer}
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 opacity-30">
                  <Code2 className="w-4 h-4" />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] font-headline">Implementation</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopyCode(selectedQuestion.code)}
                  className="rounded-full h-8 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy Implementation
                </Button>
              </div>
              <Card className="bg-[#0D1117] border-none overflow-hidden shadow-2xl rounded-[2.5rem] ring-1 ring-white/5">
                <div className="px-8 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase">TypeScript / TSX</span>
                </div>
                <CardContent className="p-0">
                  <div className="p-8 overflow-x-auto custom-scrollbar">
                    <pre className="font-code text-[15px] leading-relaxed">
                      <code className="text-slate-300">
                        {selectedQuestion.code.split('\n').map((line, i) => (
                          <div key={i} className="table-row group/line hover:bg-white/5">
                            <span className="table-cell pr-8 text-slate-700 select-none text-right text-xs tabular-nums border-r border-white/5">{i + 1}</span>
                            <span className="table-cell pl-6">{line}</span>
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
