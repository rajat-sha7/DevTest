/**
 * Topic list and question types, with no question data. Client components import from here so the
 * 2 MB question bank in questions.ts never ends up in the browser bundle.
 */
export type Topic = "nextjs" | "react" | "javascript" | "html-css" | "react-hooks";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Question {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  question: string;
  answer: string;
  code?: string;
}

/** What the study app needs for lists, filters and progress; answers load per topic on demand. */
export type QuestionMeta = Pick<Question, "id" | "topic" | "difficulty" | "question">;

/** One topic's answers, as served from /data/answers/<topic>.json */
export type TopicAnswers = Record<string, { answer: string; code?: string }>;

export const TOPICS: { id: Topic; label: string; icon: string }[] = [
  { id: "nextjs", label: "Next.js", icon: "zap" },
  { id: "react", label: "React", icon: "atom" },
  { id: "javascript", label: "JavaScript", icon: "code-2" },
  { id: "html-css", label: "HTML/CSS", icon: "layout" },
  { id: "react-hooks", label: "React Hooks", icon: "anchor" },
];
