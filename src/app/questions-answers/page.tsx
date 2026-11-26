import { ALL_QUESTIONS } from "@/lib/questions";
import type { QuestionMeta } from "@/lib/topics";
import { Dashboard } from "./Dashboard";

// Only the list data ships with the page; answers load per topic from /data/answers/<topic>.json.
const INDEX: QuestionMeta[] = ALL_QUESTIONS.map(({ id, topic, difficulty, question }) => ({ id, topic, difficulty, question }));

export default function QuestionsAnswersPage() {
  return <Dashboard index={INDEX} />;
}
