"use client";

import { Topic, TOPICS } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Zap, Atom, Code2, Layout } from "lucide-react";

interface TopicSelectorProps {
  currentTopic: Topic;
  onTopicChange: (topic: Topic) => void;
}

const iconMap = {
  zap: Zap,
  atom: Atom,
  "code-2": Code2,
  layout: Layout,
};

export function TopicSelector({ currentTopic, onTopicChange }: TopicSelectorProps) {
  return (
    <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto sm:overflow-x-visible scrollbar-thin">
      {TOPICS.map((topic) => {
        const Icon = iconMap[topic.icon as keyof typeof iconMap];
        return (
          <button
            key={topic.id}
            onClick={() => onTopicChange(topic.id as Topic)}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2.5 py-1.5 sm:px-3 md:px-4 md:py-2 rounded-full border transition-all duration-200",
              "hover:shadow-md active:scale-95",
              currentTopic === topic.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            <span className="font-semibold text-[11px] sm:text-xs md:text-sm">{topic.label}</span>
          </button>
        );
      })}
    </div>
  );
}
