"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { Topic, Question, Difficulty, NEXTJS_QUESTIONS, REACT_QUESTIONS, JS_QUESTIONS, HTML_CSS_QUESTIONS } from "@/lib/questions";
import { TopicSelector } from "@/components/devqna/TopicSelector";
import { QuestionItem } from "@/components/devqna/QuestionItem";
import { AnswerDisplay } from "@/components/devqna/AnswerDisplay";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, ChevronLeft, Menu, Home as HomeIcon, Filter, Layers, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialTopic = (searchParams.get("topic") as Topic) || "nextjs";

  const [currentTopic, setCurrentTopic] = useState<Topic>(initialTopic);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'All'>('All');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("devqna-progress");
    if (saved) {
      setCompletedQuestions(new Set(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleCompleted = (id: string) => {
    const newSet = new Set(completedQuestions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletedQuestions(newSet);
    localStorage.setItem("devqna-progress", JSON.stringify(Array.from(newSet)));
  };

  const filteredQuestions = useMemo(() => {
    let base: Question[] = [];
    switch (currentTopic) {
      case 'nextjs': base = NEXTJS_QUESTIONS; break;
      case 'react': base = REACT_QUESTIONS; break;
      case 'javascript': base = JS_QUESTIONS; break;
      case 'html-css': base = HTML_CSS_QUESTIONS; break;
      default: base = NEXTJS_QUESTIONS;
    }

    let filtered = [...base];

    if (difficultyFilter !== 'All') {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [currentTopic, searchQuery, difficultyFilter]);

  useEffect(() => {
    if (filteredQuestions.length > 0) {
      if (!selectedQuestion || !filteredQuestions.find(q => q.id === selectedQuestion.id)) {
        setSelectedQuestion(filteredQuestions[0]);
      }
    } else {
      setSelectedQuestion(null);
    }
  }, [filteredQuestions, selectedQuestion]);

  const currentIndex = useMemo(() => {
    if (!selectedQuestion) return -1;
    return filteredQuestions.findIndex(q => q.id === selectedQuestion.id);
  }, [filteredQuestions, selectedQuestion]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < filteredQuestions.length - 1;

  const onPrev = () => {
    if (hasPrev) {
      const prevQ = filteredQuestions[currentIndex - 1];
      setSelectedQuestion(prevQ);
      const container = document.getElementById('main-content');
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onNext = () => {
    if (hasNext) {
      const nextQ = filteredQuestions[currentIndex + 1];
      setSelectedQuestion(nextQ);
      const container = document.getElementById('main-content');
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const progress = useMemo(() => {
    const questionsInTopic = currentTopic === 'nextjs' ? NEXTJS_QUESTIONS :
                             currentTopic === 'react' ? REACT_QUESTIONS :
                             currentTopic === 'javascript' ? JS_QUESTIONS :
                             HTML_CSS_QUESTIONS;
    
    if (questionsInTopic.length === 0) return 0;
    const count = questionsInTopic.filter(q => completedQuestions.has(q.id)).length;
    return Math.round((count / questionsInTopic.length) * 100);
  }, [currentTopic, completedQuestions]);

  const difficulties: (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard'];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-border transition-all duration-300 ease-in-out flex flex-col shrink-0 z-50 shadow-sm fixed md:relative h-full",
        isSidebarOpen ? "w-full md:w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0"
      )}>
        <div className="p-4 md:p-6 border-b border-border bg-white/50 backdrop-blur-md sticky top-0 z-10 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground font-headline">DevQnA</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Professional</p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/playground">
                <Button variant="ghost" size="icon" title="JS Playground" className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary">
                  <Code2 className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="icon" title="Home" className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary">
                  <HomeIcon className="w-4 h-4" />
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden rounded-full h-8 w-8"
                onClick={() => setIsSidebarOpen(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search concepts..." 
              className="pl-9 h-9 md:h-11 text-sm bg-muted/30 border-transparent focus:border-primary/20 focus:bg-white transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4 md:space-y-5">
            <TopicSelector 
              currentTopic={currentTopic} 
              onTopicChange={(topic) => {
                setCurrentTopic(topic);
                setSearchQuery("");
                setDifficultyFilter("All");
              }} 
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">
                <Filter className="w-3 h-3" />
                Difficulty Level
              </div>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((d) => (
                  <Button
                    key={d}
                    variant={difficultyFilter === d ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 md:h-8 px-3 md:px-4 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all",
                      difficultyFilter === d ? "shadow-md shadow-primary/20" : "bg-muted/30 border-none hover:bg-muted/50"
                    )}
                    onClick={() => setDifficultyFilter(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-end text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">
                <span>Course Progress</span>
                <span className="text-primary text-xs">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1 md:h-1.5 bg-muted rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50/30">
          <div className="space-y-1.5">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map(q => (
                <QuestionItem 
                  key={q.id}
                  question={q}
                  isActive={selectedQuestion?.id === q.id}
                  isRead={completedQuestions.has(q.id)}
                  onClick={() => {
                    setSelectedQuestion(q);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                />
              ))
            ) : (
              <div className="text-center py-20 px-6 opacity-40">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium">No results for your search.</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile backdrop overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-border flex items-center px-6 gap-4 shrink-0 bg-white/80 backdrop-blur-lg sticky top-0 z-40">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-muted"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
             <div className="hidden xs:block p-1.5 bg-muted rounded-lg shrink-0">
               <Layers className="w-4 h-4 text-primary" />
             </div>
             <div className="flex items-center gap-1.5 md:gap-2.5 text-xs md:text-sm text-muted-foreground truncate">
                <span className="font-medium hidden sm:inline">Curriculum</span>
                <span className="opacity-30 hidden sm:inline">/</span>
                <span className="font-bold text-foreground uppercase tracking-wider text-[9px] md:text-[10px] shrink-0">{currentTopic}</span>
                <span className="opacity-30">/</span>
                <span className="truncate font-medium text-slate-500">{selectedQuestion?.question || "Select a concept"}</span>
             </div>
          </div>
        </header>

        <div 
          id="main-content"
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
        >
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-16 lg:py-24">
            {selectedQuestion ? (
              <AnswerDisplay 
                key={selectedQuestion.id}
                question={selectedQuestion} 
                isCompleted={completedQuestions.has(selectedQuestion.id)}
                toggleCompleted={toggleCompleted}
                onNext={onNext}
                onPrev={onPrev}
                hasNext={hasNext}
                hasPrev={hasPrev}
              />
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4 md:space-y-6 px-4">
                <div className="p-6 md:p-8 bg-muted rounded-2xl md:rounded-[2rem] animate-pulse">
                  <GraduationCap className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">Select a module to begin</h2>
                  <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto">Click any question from the sidebar to view detailed technical explanations and code examples.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <GraduationCap className="w-12 h-12 text-primary animate-bounce" />
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-loading" />
          </div>
        </div>
        <style jsx>{`
          @keyframes progress-loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-progress-loading {
            animation: progress-loading 1.5s infinite linear;
          }
        `}</style>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
