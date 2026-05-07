"use client";

import { Question } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuestionItemProps {
  question: Question;
  isActive: boolean;
  isRead: boolean;
  onClick: () => void;
}

export function QuestionItem({ question, isActive, isRead, onClick }: QuestionItemProps) {
  const difficultyColor = 
    question.difficulty === 'Easy' ? 'text-emerald-500' :
    question.difficulty === 'Medium' ? 'text-amber-500' :
    'text-rose-500';

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 mb-2 border-2",
        isActive 
          ? "bg-white border-primary shadow-lg shadow-primary/10 -translate-y-0.5" 
          : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
      )}
    >
      <div className={cn(
        "mt-0.5 shrink-0 transition-all",
        isRead ? "text-emerald-500" : "text-muted-foreground/10 group-hover:text-muted-foreground/30"
      )}>
        <CheckCircle2 className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={cn("text-[9px] font-bold uppercase tracking-widest", difficultyColor)}>
            {question.difficulty}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/30">•</span>
          <span className="text-[9px] font-bold text-muted-foreground/40 font-mono">ID:{question.id}</span>
        </div>
        <h3 className={cn(
          "text-sm font-bold leading-snug transition-colors",
          isActive ? "text-slate-900" : "text-slate-600 group-hover:text-primary"
        )}>
          {question.question}
        </h3>
      </div>

      <ChevronRight className={cn(
        "w-4 h-4 mt-1 shrink-0 transition-all",
        isActive ? "text-primary translate-x-1" : "text-muted-foreground/20 opacity-0 group-hover:opacity-100"
      )} />

      {isActive && (
        <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-primary rounded-r-full" />
      )}
    </div>
  );
}