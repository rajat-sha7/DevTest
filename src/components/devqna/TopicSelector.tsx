"use client";

import { Topic, TOPICS } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Zap, Atom, Code2, Layout, Anchor } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopicSelectorProps {
  currentTopic: Topic;
  onTopicChange: (topic: Topic) => void;
}

const iconMap = {
  zap: Zap,
  atom: Atom,
  "code-2": Code2,
  layout: Layout,
  anchor: Anchor,
};

export function TopicSelector({ currentTopic, onTopicChange }: TopicSelectorProps) {
  const currentTopicData = TOPICS.find((t) => t.id === currentTopic) || TOPICS[0];
  const CurrentIcon = iconMap[currentTopicData.icon as keyof typeof iconMap] || Code2;

  return (
    <div className="mb-4">
      <Select value={currentTopic} onValueChange={(val) => onTopicChange(val as Topic)}>
        <SelectTrigger className="w-full h-10 bg-white border-slate-200 hover:border-primary/50 transition-colors shadow-sm font-semibold rounded-xl text-slate-700">
          <SelectValue placeholder="Select a topic" />
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl border-slate-100">
          {TOPICS.map((topic) => {
            const Icon = iconMap[topic.icon as keyof typeof iconMap];
            return (
              <SelectItem 
                key={topic.id} 
                value={topic.id} 
                className="cursor-pointer font-medium py-2.5 pl-8 pr-3 focus:bg-primary/5 focus:text-primary transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 opacity-70" />
                  <span>{topic.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
