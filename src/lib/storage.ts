/**
 * Thin, defensive wrappers around localStorage.
 * Storage can throw (private mode, blocked cookies, full disk), so every call reports
 * what happened instead of failing silently and losing data.
 */

export type WriteResult = "ok" | "quota" | "blocked";

export function readRaw(key: string): { value: string | null; blocked: boolean } {
  try {
    return { value: localStorage.getItem(key), blocked: false };
  } catch {
    return { value: null, blocked: true };
  }
}

export function writeRaw(key: string, value: string): WriteResult {
  try {
    localStorage.setItem(key, value);
    return "ok";
  } catch (e) {
    const err = e as DOMException | undefined;
    if (err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22 || err.code === 1014)) {
      return "quota";
    }
    return "blocked";
  }
}

export function removeRaw(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Asks the browser not to evict our data when storage is under pressure. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persist) {
      if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
      return await navigator.storage.persist();
    }
  } catch {}
  return null;
}

export async function checkPersisted(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persisted) return await navigator.storage.persisted();
  } catch {}
  return null;
}

/**
 * Runs `fn` once when the page is being hidden or closed. `visibilitychange` is the
 * reliable signal on mobile, `pagehide` covers desktop and bfcache. Returns a cleanup.
 */
export function onPageLeave(fn: () => void): () => void {
  const onVis = () => {
    if (document.visibilityState === "hidden") fn();
  };
  window.addEventListener("pagehide", fn);
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.removeEventListener("pagehide", fn);
    document.removeEventListener("visibilitychange", onVis);
  };
}
