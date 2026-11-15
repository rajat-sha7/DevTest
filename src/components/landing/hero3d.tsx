"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MAX_X = 5; // deg
const MAX_Y = 7; // deg
const EASE = 0.08;

/**
 * Calm 3D stage. The card follows the pointer with eased (lerped) rotation,
 * a soft highlight tracks the cursor, and two plates behind it add depth.
 * Touch devices and reduced-motion users get the static layout.
 */
export function Hero3D({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    const c = card.current;
    const g = glare.current;
    if (!el || !c || !g) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const frame = () => {
      cur.x += (target.x - cur.x) * EASE;
      cur.y += (target.y - cur.y) * EASE;
      c.style.transform = `rotateX(${cur.y.toFixed(3)}deg) rotateY(${cur.x.toFixed(3)}deg)`;
      const settled = Math.abs(target.x - cur.x) < 0.01 && Math.abs(target.y - cur.y) < 0.01;
      if (settled && target.x === 0 && target.y === 0) {
        c.style.transform = "";
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      target.x = (px - 0.5) * 2 * MAX_Y;
      target.y = -(py - 0.5) * 2 * MAX_X;
      g.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      g.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      g.style.opacity = "1";
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      g.style.opacity = "0";
      kick();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={stage} className="relative pt-2 pb-6 sm:py-8 sm:px-4" style={{ perspective: "1600px" }}>
      <div ref={card} className="relative" style={{ transformStyle: "preserve-3d", willChange: "transform" }}>
        {/* plates behind */}
        <div
          aria-hidden
          className="absolute inset-x-6 -bottom-5 top-6 rounded-2xl border-2 border-[#0b1020] bg-pink-400"
          style={{ transform: "translateZ(-60px)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-3 -bottom-2.5 top-3 rounded-2xl border-2 border-[#0b1020] bg-yellow-300"
          style={{ transform: "translateZ(-30px)" }}
        />

        {/* main card */}
        <div
          className="relative rounded-2xl shadow-[5px_5px_0_#0b1020] sm:shadow-[8px_8px_0_#0b1020]"
          
        >
          {children}
          <div
            ref={glare}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(420px circle at var(--gx, 50%) var(--gy, 50%), rgb(255 255 255 / .55), transparent 60%)",
              mixBlendMode: "soft-light",
            }}
          />
        </div>

        {/* one quiet chip floating in front */}
        <div
          aria-hidden
          className="hidden sm:block absolute -bottom-4 -left-4 lg:-left-8"
          style={{ transform: "translateZ(50px)" }}
        >
          <div className="bg-white text-slate-900 border-2 border-[#0b1020] rounded-xl px-4 py-3 shadow-[4px_4px_0_#0b1020]">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">✓</span>
              Answer + code
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
