"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** classes for the outer wrapper (width, margins) */
  wrapperClassName?: string;
  /** colour the edge fades blend into */
  fade?: string;
}

/**
 * A horizontally scrolling row that is obvious to use on any device:
 * edge fades and arrow buttons appear when there is more to see, the mouse
 * wheel scrolls it sideways, and it can be dragged. Touch scrolls natively.
 */
export const ScrollRow = forwardRef<HTMLDivElement, Props>(function ScrollRow(
  { className, wrapperClassName, fade = "from-white", children, ...rest },
  ref
) {
  const inner = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLDivElement);

  const [edge, setEdge] = useState({ left: false, right: false });
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  // compare against a ref first so setState only runs when something really changed
  const last = useRef({ left: false, right: false });
  const update = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    if (last.current.left === left && last.current.right === right) return;
    last.current = { left, right };
    setEdge({ left, right });
  }, []);

  // content can change without a resize (badges appear), so re-measure after every render
  useEffect(update);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [update]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { down: true, startX: e.clientX, startLeft: inner.current?.scrollLeft ?? 0, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = inner.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.startLeft - dx;
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    d.down = false;
    if (d.moved && inner.current?.hasPointerCapture(e.pointerId)) inner.current.releasePointerCapture(e.pointerId);
  };
  // a drag must not count as a click on the chip underneath
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const nudge = (dir: -1 | 1) => inner.current?.scrollBy({ left: dir * Math.max(120, inner.current.clientWidth * 0.6), behavior: "smooth" });

  const arrow =
    "absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border-2 border-[#0b1020] flex items-center justify-center shadow-[2px_2px_0_#0b1020] hover:bg-yellow-200 transition-opacity";

  return (
    <div className={cn("relative", wrapperClassName)}>
      <div
        ref={inner}
        {...rest}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={cn("overflow-x-auto no-scrollbar select-none", edge.left || edge.right ? "cursor-grab active:cursor-grabbing" : "", className)}
      >
        {children}
      </div>

      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent transition-opacity", fade, edge.left ? "opacity-100" : "opacity-0")}
      />
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent transition-opacity", fade, edge.right ? "opacity-100" : "opacity-0")}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        className={cn(arrow, "left-0", edge.left ? "opacity-100" : "opacity-0 pointer-events-none")}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        className={cn(arrow, "right-0", edge.right ? "opacity-100" : "opacity-0 pointer-events-none")}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});
