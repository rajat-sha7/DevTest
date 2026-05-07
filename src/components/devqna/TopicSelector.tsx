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
    <div className="flex flex-wrap gap-2 mb-6">
      {TOPICS.map((topic) => {
        const Icon = iconMap[topic.icon as keyof typeof iconMap];
        return (
          <button
            key={topic.id}
            onClick={() => onTopicChange(topic.id as Topic)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
              "hover:shadow-md active:scale-95",
              currentTopic === topic.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{topic.label}</span>
          </button>
        );
      })}
    </div>
  );
}
