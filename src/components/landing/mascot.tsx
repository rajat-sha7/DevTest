"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface MascotQuestion {
  id: string;
  topic: string;
  question: string;
}

type Mood = "calm" | "scared" | "caught";

const GREETINGS = ["You caught me! Quick one:", "Okay okay! Pop quiz:", "Eep! Try this one:", "Fine, you win:", "Don't hurt me! Answer this:"];
const HIDE_KEY = "devqna-mascot-hidden";
/** Full-screen tools where a walking mascot would sit on top of the editor or console. */
const HIDDEN_ON = ["/playground", "/coding-round"];

const SIZE = 64; // px, matches w-16
const WALK = 55; // px per second
const FLEE = 340; // px per second at the closest distance; slower than a quick mouse, so it can be caught
const FEAR = 170; // px: cursor distance that triggers fleeing

/**
 * Qubi, the DevQnA mascot: a small robot that strolls along the bottom of the viewport.
 * Its eyes follow the cursor; get close and it panics and runs away. Catch it (hover, or
 * corner it at the screen edge) and click it for a random question. It can be hidden
 * (remembered in this browser). Movement is off for people who prefer reduced motion.
 */
export function Mascot({ questions }: { questions: MascotQuestion[] }) {
  const [tip, setTip] = useState<{ greet: string; q: MascotQuestion; side: "left" | "center" | "right" } | null>(null);
  const [hop, setHop] = useState(0);
  const [mood, setMood] = useState<Mood>("calm");
  const [moving, setMoving] = useState(true);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const hiddenHere = HIDDEN_ON.some((p) => pathname?.startsWith(p));

  const walkerRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);
  const sim = useRef({ x: 24, dir: 1, hover: false, mouse: null as null | { x: number; y: number } });
  const tipOpen = useRef(false);
  tipOpen.current = !!tip;

  // render nothing until mounted, so people who hid Qubi never see a flash of it
  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE_KEY) === "1";
    } catch {}
    setVisible(!hidden);
  }, []);

  // movement + reactions, driven by requestAnimationFrame (no React re-render per frame)
  useEffect(() => {
    if (!visible || hiddenHere) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = sim.current;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") s.mouse = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => (s.mouse = null);
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let lastMood: Mood = "calm";
    let lastMoving = true;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const max = Math.max(0, innerWidth - SIZE - 8);
      const cx = s.x + SIZE / 2;
      const cy = innerHeight - 52;
      const m = s.mouse;
      const dx = m ? m.x - cx : 0;
      const dy = m ? m.y - cy : 0;
      const dist = m ? Math.hypot(dx, dy) : Infinity;

      let mood: Mood = "calm";
      let speed = 0;
      if (tipOpen.current || s.hover) {
        mood = s.hover && !tipOpen.current ? "caught" : "calm";
      } else if (dist < FEAR) {
        // run away from the cursor, faster the closer it is
        const away = dx > 0 ? -1 : 1;
        const cornered = (away < 0 && s.x <= 0) || (away > 0 && s.x >= max);
        mood = cornered ? "caught" : "scared";
        s.dir = away;
        speed = cornered ? 0 : FLEE * (0.45 + 0.55 * (1 - dist / FEAR));
      } else {
        speed = WALK;
        if (s.x <= 0) s.dir = 1;
        if (s.x >= max) s.dir = -1;
      }
      if (reduce) speed = 0;

      s.x = Math.min(max, Math.max(0, s.x + s.dir * speed * dt));
      if (walkerRef.current) walkerRef.current.style.transform = `translateX(${s.x}px)`;
      if (flipRef.current) flipRef.current.style.transform = `scaleX(${s.dir})`;

      // pupils look at the cursor (mirrored when Qubi faces left, since the whole body is flipped)
      if (pupilsRef.current) {
        const len = Math.hypot(dx, dy) || 1;
        const px = m ? (dx / len) * 2.2 * s.dir : 0;
        const py = m ? (dy / len) * 1.8 : 0;
        pupilsRef.current.style.transform = `translate(${px}px, ${py}px)`;
      }

      if (mood !== lastMood) setMood((lastMood = mood));
      const isMoving = speed > 0;
      if (isMoving !== lastMoving) setMoving((lastMoving = isMoving));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [visible, hiddenHere]);

  // close the bubble with Escape or a click elsewhere
  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-mascot]")) setTip(null);
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onDown);
    };
  }, [tip]);

  const poke = () => {
    if (!questions.length) return;
    const q = questions[Math.floor(Math.random() * questions.length)];
    // open the bubble towards the side with room so it never leaves the screen
    const r = walkerRef.current?.getBoundingClientRect();
    const side = !r ? "center" : r.left < 140 ? "left" : innerWidth - r.right < 140 ? "right" : "center";
    setTip({ greet: GREETINGS[Math.floor(Math.random() * GREETINGS.length)], q, side });
    setHop((n) => n + 1);
  };

  const hide = () => {
    setTip(null);
    setVisible(false);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {}
  };

  if (!visible || hiddenHere) return null;

  const scared = mood !== "calm";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1 z-40 h-24 overflow-visible print:hidden">
      <div
        ref={walkerRef}
        data-mascot
        data-mood={mood}
        data-moving={moving ? "" : undefined}
        className="mascot pointer-events-auto absolute bottom-0 left-0 w-16 will-change-transform"
        onPointerEnter={(e) => e.pointerType === "mouse" && (sim.current.hover = true)}
        onPointerLeave={() => (sim.current.hover = false)}
      >
        {tip && (
          <div
            role="status"
            // positioned with left/right (not transform) because the pop-in animation owns transform
            style={tip.side === "left" ? { left: 0 } : tip.side === "right" ? { right: 0 } : { left: "calc(50% - 8rem)" }}
            className="absolute bottom-full mb-3 w-64 rounded-2xl border-2 border-[#0b1020] bg-white p-3 text-sm text-[#0b1020] shadow-[4px_4px_0_#0b1020] anim-card-in"
          >
            <p className="font-extrabold">{tip.greet}</p>
            <p className="mt-1 font-medium leading-snug">{tip.q.question}</p>
            <div className="mt-2 flex items-center justify-between">
              <Link
                href={`/questions-answers?topic=${tip.q.topic}&q=${tip.q.id}`}
                className="font-bold text-[#2b4bff] underline underline-offset-2"
              >
                See the answer →
              </Link>
              <span className="flex gap-3">
                <button type="button" onClick={poke} className="text-xs font-semibold text-slate-500 hover:text-[#0b1020]">
                  Another
                </button>
                <button type="button" onClick={hide} className="text-xs font-semibold text-slate-500 hover:text-[#0b1020]">
                  Hide Qubi
                </button>
              </span>
            </div>
            <span
              aria-hidden
              className="absolute -bottom-[9px] h-4 w-4 rotate-45 border-b-2 border-r-2 border-[#0b1020] bg-white"
              // tail points down at Qubi (2rem = half the mascot's width)
              style={{ left: tip.side === "left" ? "1.5rem" : tip.side === "right" ? "calc(100% - 2.5rem)" : "calc(50% - 0.5rem)" }}
            />
          </div>
        )}

        {/* "!" pops above the head when frightened */}
        {scared && !tip && (
          <span aria-hidden className="mascot-alert absolute -top-5 left-1/2 -ml-2 text-xl font-black text-[#e11d48] [text-shadow:2px_2px_0_#0b1020]">
            !
          </span>
        )}

        <button
          type="button"
          onClick={poke}
          aria-label="Qubi the mascot: click for a random interview question"
          className="block w-16 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300"
        >
          <div ref={flipRef}>
            <span key={hop} className={`block ${hop ? "mascot-hop" : ""}`}>
              <span className="mascot-shake block">
                <svg viewBox="0 0 64 80" className="mascot-bob block w-16 overflow-visible" aria-hidden>
                  {/* antenna */}
                  <g className="mascot-antenna" style={{ transformOrigin: "32px 18px" }}>
                    <line x1="32" y1="18" x2="32" y2="6" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="32" cy="6" r="5" fill={scared ? "#e11d48" : "#ffd84d"} stroke="#0b1020" strokeWidth="2.5" />
                  </g>
                  {/* legs */}
                  <g stroke="#0b1020" strokeWidth="4" strokeLinecap="round">
                    <line className="mascot-leg-a" x1="24" y1="60" x2="24" y2="72" style={{ transformOrigin: "24px 60px" }} />
                    <line className="mascot-leg-b" x1="40" y1="60" x2="40" y2="72" style={{ transformOrigin: "40px 60px" }} />
                  </g>
                  {/* body */}
                  <rect x="10" y="18" width="44" height="44" rx="12" fill="#0b1020" transform="translate(3 3)" />
                  <rect x="10" y="18" width="44" height="44" rx="12" fill="#2b4bff" stroke="#0b1020" strokeWidth="2.5" />
                  {/* arms: one waves when calm, both fly up when scared */}
                  <g className="mascot-arm" style={{ transformOrigin: "54px 40px" }}>
                    <line x1="54" y1="40" x2="62" y2={scared ? 26 : 32} stroke="#0b1020" strokeWidth="4" strokeLinecap="round" />
                  </g>
                  <line x1="10" y1="42" x2="2" y2={scared ? 28 : 50} stroke="#0b1020" strokeWidth="4" strokeLinecap="round" />
                  {/* face screen */}
                  <rect x="16" y="25" width="32" height="20" rx="6" fill="#fff8ec" stroke="#0b1020" strokeWidth="2" />
                  {scared ? (
                    <>
                      {/* wide eyes with tiny pupils that still track the cursor */}
                      <circle cx="25" cy="33" r="4.5" fill="white" stroke="#0b1020" strokeWidth="1.5" />
                      <circle cx="39" cy="33" r="4.5" fill="white" stroke="#0b1020" strokeWidth="1.5" />
                      <g ref={pupilsRef}>
                        <circle cx="25" cy="33" r="1.6" fill="#0b1020" />
                        <circle cx="39" cy="33" r="1.6" fill="#0b1020" />
                      </g>
                      <ellipse cx="32" cy="41" rx="2.6" ry="2.2" fill="#0b1020" />
                      {/* sweat drop */}
                      <path className="mascot-sweat" d="M50 22 q3 4 0 6 q-3 -2 0 -6z" fill="#7dd3fc" stroke="#0b1020" strokeWidth="1" />
                    </>
                  ) : (
                    <>
                      <g className="mascot-eyes" style={{ transformOrigin: "32px 33px" }}>
                        <g ref={pupilsRef}>
                          <circle cx="25" cy="33" r="3" fill="#0b1020" />
                          <circle cx="39" cy="33" r="3" fill="#0b1020" />
                        </g>
                      </g>
                      <path d="M27 39 q5 4 10 0" fill="none" stroke="#0b1020" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="20" cy="39" r="2" fill="#ff7ab8" opacity=".8" />
                      <circle cx="44" cy="39" r="2" fill="#ff7ab8" opacity=".8" />
                    </>
                  )}
                  {/* chest "?" badge */}
                  <circle cx="32" cy="53" r="5" fill="#ffd84d" stroke="#0b1020" strokeWidth="2" />
                  <text x="32" y="56.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0b1020" fontFamily="system-ui">
                    ?
                  </text>
                </svg>
              </span>
            </span>
          </div>
          <span aria-hidden className="mx-auto mt-0.5 block h-1.5 w-10 rounded-full bg-black/25" />
        </button>
      </div>
    </div>
  );
}
