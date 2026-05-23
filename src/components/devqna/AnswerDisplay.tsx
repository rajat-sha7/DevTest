"use client";

import { useState } from "react";
import { Question } from "@/lib/questions";
import { generateExplanationAndExample, GenerateExplanationAndExampleOutput } from "@/ai/flows/generate-explanation-and-example";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, BookOpen, Terminal, CheckCircle, Search, ExternalLink, Lightbulb, RefreshCcw, ArrowLeft, ArrowRight, Quote, Info, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerDisplayProps {
  question: Question;
  isCompleted: boolean;
  toggleCompleted: (id: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function AnswerDisplay({ 
  question, 
  isCompleted, 
  toggleCompleted,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}: AnswerDisplayProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<GenerateExplanationAndExampleOutput | null>(null);
  const { toast } = useToast();

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiResponse(null);
    try {
      const response = await generateExplanationAndExample({
        concept: question.question,
        context: question.answer,
        programmingLanguage: question.topic === 'nextjs' ? 'Next.js' : 
                             question.topic === 'react' ? 'React.js' : 
                             question.topic === 'javascript' ? 'JavaScript' : 'HTML/CSS'
      });
      setAiResponse(response);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast({
        title: "AI Generation Failed",
        description: "The technical expert is momentarily busy. Please try again shortly.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyColor = 
    question.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
    question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
    'bg-rose-50 text-rose-600 border-rose-100';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied to clipboard",
      description: "You can now paste the code into your editor.",
    });
  };

  const CodeBlock = ({ code, topic, title }: { code: string; topic: string; title: string }) => (
    <div className="mt-8 md:mt-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 font-headline">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full text-[9px] px-2 opacity-50 font-mono border-slate-200">
            {topic}.ts
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            onClick={() => handleCopyCode(code)}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <Card className="bg-[#0D1117] border-none overflow-hidden shadow-2xl rounded-2xl md:rounded-[2rem] ring-1 ring-white/5 relative group/code">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white/5 border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-lg shadow-rose-500/20" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-lg shadow-amber-500/20" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-lg shadow-emerald-500/20" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">TypeScript</span>
        </div>
        <CardContent className="p-0">
          <div className="p-4 md:p-8 overflow-x-auto bg-[#0D1117] custom-scrollbar">
            <pre className="font-code leading-relaxed text-[13px] md:text-[15px]">
              <code className="text-slate-300">
                {code.split('\n').map((line, i) => (
                  <div key={i} className="table-row group/line hover:bg-white/5 transition-colors">
                    <span className="table-cell text-slate-600 select-none text-right text-[10px] md:text-xs w-6 md:w-8 tabular-nums group-hover/line:text-slate-400 border-r border-white/5 pr-2 md:pr-4">{i + 1}</span>
                    <span className={cn(
                      "table-cell pl-4",
                      line.trim().startsWith('//') ? 'text-slate-500 italic' : 
                      line.includes('import') || line.includes('export') ? 'text-purple-400' :
                      line.includes('function') || line.includes('const') ? 'text-blue-400' :
                      line.includes('return') ? 'text-rose-400' :
                      'text-slate-300'
                    )}>
                      {line}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 md:pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 gap-6 md:gap-10">
        <div className="space-y-6 md:space-y-8 max-w-4xl">
          <div className="flex items-center gap-3">
            <Badge className={cn("rounded-full px-3 py-1 md:px-4 md:py-1.5 font-bold text-[9px] md:text-[10px] uppercase tracking-widest border", difficultyColor)}>
              {question.difficulty} Level
            </Badge>
            {isCompleted && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 md:px-4 md:py-1.5 font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-emerald-600 bg-emerald-50 border-emerald-100">
                <CheckCircle className="w-3 h-3 mr-1.5" />
                Mastered
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-headline leading-[1.15]">
            {question.question}
          </h1>
        </div>
        <Button 
          variant={isCompleted ? "outline" : "default"}
          size="lg"
          className={cn(
            "rounded-full px-6 h-12 md:px-8 md:h-14 font-bold text-sm md:text-base transition-all active:scale-95 shrink-0 shadow-lg w-full md:w-auto",
            isCompleted 
              ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" 
              : "bg-primary shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1"
          )}
          onClick={() => toggleCompleted(question.id)}
        >
          {isCompleted ? "Completed" : "Mark as Mastered"}
        </Button>
      </div>

      <div className="space-y-12 md:space-y-20">
        <section className="relative">
          <div className="flex items-center gap-3 mb-6 md:mb-8 opacity-40">
            <BookOpen className="w-4 h-4" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] font-headline">The Expert Breakdown</h2>
          </div>
          <div className="text-lg md:text-xl leading-relaxed text-slate-700 font-medium">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h3: ({node, ...props}) => <h3 className="text-2xl font-bold text-slate-900 font-headline mt-8 mb-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-slate-600" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-slate-600 space-y-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 text-slate-600 space-y-2" {...props} />,
                li: ({node, ...props}) => <li {...props} />,
              }}
            >
              {question.answer}
            </ReactMarkdown>
          </div>
        </section>

        {question.code && (
          <CodeBlock 
            code={question.code} 
            topic={question.topic} 
            title="Implementation Architecture" 
          />
        )}

        <div className="pt-12 md:pt-20 border-t border-slate-100">
          {!aiResponse && !isGenerating ? (
            <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl md:rounded-[4rem] p-8 md:p-16 text-center space-y-6 md:space-y-10 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Sparkles className="w-64 h-64" />
              </div>
              <div className="inline-flex p-4 md:p-6 bg-white shadow-2xl shadow-primary/10 rounded-2xl md:rounded-[2rem] text-primary group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="space-y-3 md:space-y-4 max-w-xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 font-headline">Deepen Your Mastery</h3>
                <p className="text-slate-500 text-base md:text-xl leading-relaxed">
                  Generate a context-aware research brief with architectural alternatives and senior-level research paths.
                </p>
              </div>
              <Button 
                onClick={handleGenerateAI} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 md:px-12 md:py-8 h-auto text-lg md:text-xl font-bold rounded-xl md:rounded-2xl transition-all hover:scale-105 shadow-2xl hover:shadow-slate-500/20 w-full md:w-auto"
              >
                Launch Deep-Dive Research
              </Button>
            </div>
          ) : (
            <div className="space-y-8 md:space-y-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4 md:gap-5">
                  <div className="p-3 bg-accent/10 rounded-xl md:rounded-2xl text-accent ring-1 ring-accent/20">
                    <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-headline">Research Brief</h2>
                    <p className="text-[9px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5 md:mt-1">AI-Powered Synthesis</p>
                  </div>
                </div>
                {aiResponse && (
                   <Button variant="ghost" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="rounded-full hover:bg-muted font-bold text-[9px] md:text-[10px] uppercase tracking-wider h-9 md:h-10 px-4 md:px-6 w-full sm:w-auto">
                      <RefreshCcw className={cn("mr-2 w-3 h-3 md:w-3.5 md:h-3.5", isGenerating && "animate-spin")} />
                      Refresh Analysis
                   </Button>
                )}
              </div>
              
              {isGenerating ? (
                <div className="py-16 md:py-24 flex flex-col items-center justify-center space-y-6 animate-pulse bg-slate-50/50 rounded-2xl md:rounded-[3rem]">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Synthesizing Technical Architecture...</p>
                </div>
              ) : aiResponse && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-1000 space-y-12 md:space-y-16">
                   <div className="relative">
                    <div className="absolute -left-1 md:-left-8 top-0 bottom-0 w-1 md:w-2 bg-accent/20 rounded-full" />
                    <Quote className="absolute -left-8 md:-left-12 -top-3 md:-top-4 w-6 h-6 md:w-8 md:h-8 text-accent/10 hidden md:block" />
                    <p className="text-base md:text-xl text-slate-600 leading-relaxed pl-3 md:pl-6 font-medium italic">
                      {aiResponse.explanation}
                    </p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-10">
                    <Card className="border-slate-100 bg-white rounded-3xl md:rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group border-b-4 border-b-amber-500/20">
                      <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-amber-50 rounded-xl">
                            <Lightbulb className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                          </div>
                          <h3 className="font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-slate-400">Adjacent Domains</h3>
                        </div>
                      </div>
                      <CardContent className="p-6 md:p-10">
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {aiResponse.relatedConcepts.map((concept, i) => (
                            <Badge key={i} variant="secondary" className="bg-slate-50 border-slate-100 text-slate-600 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-bold">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-100 bg-white rounded-3xl md:rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group border-b-4 border-b-blue-500/20">
                      <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <Search className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                          </div>
                          <h3 className="font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-slate-400">Deep-Dive Roadmap</h3>
                        </div>
                      </div>
                      <CardContent className="p-6 md:p-10 space-y-3 md:space-y-4">
                        {aiResponse.researchQueries.map((query, i) => (
                          <a 
                            key={i} 
                            href={`https://www.google.com/search?q=${encodeURIComponent(query)}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 md:p-5 bg-slate-50/50 border border-slate-100 rounded-2xl md:rounded-[1.5rem] group/item hover:bg-white hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all"
                          >
                            <span className="text-sm md:text-base text-slate-600 font-bold group-hover/item:text-primary transition-colors">{query}</span>
                            <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover/item:text-primary transition-all group-hover/item:translate-x-1 group-hover/item:-translate-y-1" />
                          </a>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <CodeBlock 
                    code={aiResponse.codeExample} 
                    topic="Advanced Pattern" 
                    title="Production-Grade Implementation" 
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-12 md:pt-24 flex items-center justify-between border-t border-slate-100 gap-4">
          <Button
            variant="ghost"
            size="lg"
            className="rounded-full px-6 md:px-10 h-12 md:h-16 font-bold text-slate-500 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-20 text-xs md:text-base"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            <ArrowLeft className="w-4 h-4 md:w-6 md:h-6 mr-2 md:mr-4" />
            Previous
          </Button>
          
          <div className="hidden sm:flex flex-col items-center gap-0.5 md:gap-1 opacity-20">
             <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-slate-900">Module</span>
             <span className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-widest">{question.topic}</span>
          </div>

          <Button
            variant="ghost"
            size="lg"
            className="rounded-full px-6 md:px-10 h-12 md:h-16 font-bold text-slate-500 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-20 text-xs md:text-base"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next Concept
            <ArrowRight className="w-4 h-4 md:w-6 md:h-6 ml-2 md:mr-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
