"use client";

import { useEffect, useState } from "react";
import type { Topic, TopicAnswers } from "@/lib/topics";

// one request per topic per page load, shared by every caller
const loaded = new Map<Topic, TopicAnswers>();
const pending = new Map<Topic, Promise<TopicAnswers>>();

export function loadTopicAnswers(topic: Topic): Promise<TopicAnswers> {
  const hit = loaded.get(topic);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(topic);
  if (!p) {
    p = fetch(`/data/answers/${topic}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`answers ${topic}: ${r.status}`);
        return r.json() as Promise<TopicAnswers>;
      })
      .then((data) => {
        loaded.set(topic, data);
        return data;
      })
      .finally(() => pending.delete(topic));
    pending.set(topic, p);
  }
  return p;
}

/** The answers for a topic: null while loading, with an error flag and a retry if the fetch fails. */
export function useTopicAnswers(topic: Topic) {
  const [state, setState] = useState<{ topic: Topic; data: TopicAnswers | null; failed: boolean }>(() => ({
    topic,
    data: loaded.get(topic) ?? null,
    failed: false,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const hit = loaded.get(topic);
    if (hit) {
      setState({ topic, data: hit, failed: false });
      return;
    }
    setState({ topic, data: null, failed: false });
    loadTopicAnswers(topic)
      .then((data) => live && setState({ topic, data, failed: false }))
      .catch(() => live && setState({ topic, data: null, failed: true }));
    return () => {
      live = false;
    };
  }, [topic, attempt]);

  const current = state.topic === topic;
  return {
    answers: current ? state.data : null,
    failed: current && state.failed,
    retry: () => setAttempt((n) => n + 1),
  };
}
