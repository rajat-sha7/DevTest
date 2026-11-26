"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Animated page switches for the whole site.
 *
 * Internal link clicks that change the path are routed through the View Transitions API, so the
 * old page fades out while the new one rises in (styles live in globals.css). A slim progress bar
 * runs on every navigation, and is all you get in browsers without view transitions or with
 * reduced motion turned on. Same-page links (hash or query only) stay instant.
 */
export function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const finish = useRef<(() => void) | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  // the new route has committed: release the transition and complete the bar
  useEffect(() => {
    finish.current?.();
    finish.current = null;
    setState((s) => (s === "loading" ? "done" : s));
  }, [pathname]);

  useEffect(() => {
    if (state === "idle") return;
    // "done" fades out; "loading" gets a safety net in case the navigation never lands
    const t = setTimeout(() => setState("idle"), state === "done" ? 500 : 10000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;

      setState("loading");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduce) return; // let the link navigate as usual

      e.preventDefault(); // next/link skips its own navigation when the click was prevented
      const html = document.documentElement;
      html.dataset.vt = "page";
      const vt = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            finish.current = resolve;
            router.push(url.pathname + url.search + url.hash);
          })
      );
      // the screen is frozen until the new page commits; if that's slow, drop the animation
      // and let the progress bar carry the wait instead
      const t = setTimeout(() => vt.skipTransition(), 800);
      vt.updateCallbackDone.finally(() => clearTimeout(t)).catch(() => {});
      vt.ready.catch(() => {});
      vt.finished.finally(() => {
        if (html.dataset.vt === "page") delete html.dataset.vt;
      }).catch(() => {});
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return (
    <div className="nav-progress" data-state={state} aria-hidden>
      <div />
    </div>
  );
}
