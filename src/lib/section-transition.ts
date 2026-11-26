import { flushSync } from "react-dom";

/**
 * How an in-page section switch should move:
 * - "forward" / "back": slide sideways, e.g. next / previous question
 * - "swap": fade and rise, e.g. a new topic, view or tab
 */
export type SectionMotion = "forward" | "back" | "swap";

let latest = 0;

/**
 * Runs a state update as a view transition scoped to the page's panes.
 *
 * Panes are elements with `data-vt-pane="<name>"`; the name must have matching rules under
 * "section transitions" in globals.css. Only the panes listed in `panes` animate (all of them when
 * omitted); the rest of the page swaps instantly. Browsers without view transitions, and users who
 * prefer reduced motion, just get the update.
 */
export function sectionTransition(update: () => void, motion: SectionMotion = "swap", panes?: string[]) {
  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const html = document.documentElement;
  const mine = ++latest; // a newer switch (e.g. holding "j") interrupts this one and owns the cleanup

  // names go on only for the duration, so page navigation still sees the panes as part of the page
  const named: HTMLElement[] = [];
  const name = () =>
    document.querySelectorAll<HTMLElement>("[data-vt-pane]").forEach((el) => {
      const n = el.dataset.vtPane!;
      if (panes && !panes.includes(n)) return;
      el.style.viewTransitionName = n;
      named.push(el);
    });
  const clear = () => {
    if (mine !== latest) return;
    delete html.dataset.vt;
    document.querySelectorAll<HTMLElement>("[data-vt-pane]").forEach((el) => (el.style.viewTransitionName = ""));
  };

  html.dataset.vt = motion;
  name();
  // flushSync so React has painted the new state by the time the browser takes the "after" snapshot;
  // re-name afterwards in case the update swapped the pane element out
  const vt = document.startViewTransition(() => {
    flushSync(update);
    name();
  });
  vt.finished.finally(clear).catch(() => {});
  vt.ready.catch(() => {});
}
