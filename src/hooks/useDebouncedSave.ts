"use client";

import { useEffect, useRef } from "react";
import { onPageLeave, writeRaw, type WriteResult } from "@/lib/storage";

/**
 * Saves `value` to localStorage shortly after it stops changing.
 * Serialising happens only when the timer fires (not on every keystroke), the latest value
 * is always the one written, and anything pending is flushed when the tab is hidden, closed
 * or the component unmounts, so the last edit is never lost.
 */
export function useDebouncedSave(key: string, value: unknown, enabled: boolean, onResult?: (r: WriteResult) => void, delay = 500) {
  const latest = useRef(value);
  latest.current = value;
  const dirty = useRef(false);
  const cb = useRef(onResult);
  cb.current = onResult;

  const flush = useRef(() => {});
  flush.current = () => {
    if (!dirty.current) return;
    const r = writeRaw(key, JSON.stringify(latest.current));
    if (r === "ok") dirty.current = false;
    cb.current?.(r);
  };

  useEffect(() => {
    if (!enabled) return;
    dirty.current = true;
    const t = setTimeout(() => flush.current(), delay);
    return () => clearTimeout(t);
  }, [value, enabled, delay]);

  useEffect(() => {
    const off = onPageLeave(() => flush.current());
    return () => {
      off();
      flush.current();
    };
  }, []);
}
