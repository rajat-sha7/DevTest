export interface CodingQuestion {
  id: string;
  topic: 'Next.js' | 'React';
  difficulty: 'Medium' | 'Hard' | 'Expert';
  question: string;
  answer: string;
  code: string;
}

export const CODING_ROUND_QUESTIONS: CodingQuestion[] = Array.from({ length: 50 }, (_, i) => {
  const index = i + 1;
  const isNext = index % 2 === 0;
  
  const topics = {
    Next: [
      "Implement a dynamic route segment that fetches data with a cache tag.",
      "Build a Server Action for a secure contact form with revalidation.",
      "Configure a Parallel Route for a Dashboard with team and analytics slots.",
      "Implement an Error Boundary specifically for a nested Route Group.",
      "Optimize an image gallery using Next.js Image with responsive sizes.",
      "Setup Middleware to handle multi-tenant subdomains.",
      "Create a Partial Prerendering (PPR) layout for an e-commerce page.",
      "Implement intercepting routes for a social media photo feed.",
      "Configure dynamic metadata based on an asynchronous DB lookup.",
      "Build a streaming search component using Suspense and useDeferredValue."
    ],
    React: [
      "Create a custom useDebounce hook with TypeScript generics.",
      "Implement a Compound Component pattern for a Select dropdown.",
      "Build an HOC for Role-Based Access Control (RBAC).",
      "Optimize a large list using React Virtualization logic (manual).",
      "Implement an Optimistic UI update using React 19's useOptimistic.",
      "Build a custom hook for handling WebSocket connections with retry logic.",
      "Implement a recursive tree component for a file explorer.",
      "Create a form manager using useReducer for complex validation.",
      "Optimize component rendering using React.memo and custom comparators.",
      "Implement a Theme Provider using Context API with persistent storage."
    ]
  };

  const topicList = isNext ? topics.Next : topics.React;
  const questionTitle = topicList[i % topicList.length];

  return {
    id: `cr${index}`,
    topic: isNext ? 'Next.js' : 'React',
    difficulty: index % 3 === 0 ? 'Expert' : 'Hard',
    question: `${questionTitle} (Challenge #${index})`,
    answer: "This challenge evaluates your ability to handle production-grade architectural patterns. Focus on clean separation of concerns, performance, and type safety.",
    code: isNext 
      ? `'use server';\nimport { revalidateTag } from 'next/cache';\n\nexport async function action(data: FormData) {\n  const val = data.get('val');\n  await db.save(val);\n  revalidateTag('my-tag');\n}`
      : `import { useState, useEffect } from 'react';\n\nexport function useMyHook<T>(val: T) {\n  const [state, setState] = useState(val);\n  useEffect(() => {\n    // Complex logic\n  }, [val]);\n  return state;\n}`
  };
});
