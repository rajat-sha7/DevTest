"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface MascotQuestion {
  id: string;
  topic: string;
  question: string;
}

type Mood = "calm" | "scared" | "caught" | "sleepy";

const GREETINGS = ["Okay okay! Pop quiz:", "Eep! Try this one:", "Fine, you win:", "Don't hurt me! Answer this:", "You're fast! Quick one:"];
const PANIC = ["Eek!", "Nope!", "Not today!", "Help!", "Aaah!", "Too close!", "Byeee!"];
const CORNERED = ["You got me…", "Okay, click me", "I give up!", "Be gentle!"];
const CATCH_KEY = "devqna-mascot-catches";
/** Full-screen tools where a walking mascot would sit on top of the editor or console. */
const HIDDEN_ON = ["/playground", "/coding-round"];

const SIZE = 64; // px, matches w-16
const WALK = 55; // px per second
const FLEE = 340; // px per second at the closest distance; slower than a quick mouse, so it can be caught
const FEAR = 170; // px: cursor distance that triggers fleeing
const JUMP_TRIGGER = 95; // px: when cornered and the cursor is this close, leap over it
const JUMP_TIME = 0.62; // s
const JUMP_COOLDOWN = 2200; // ms: after a leap it is tired and can be caught
const SLEEP_AFTER = 10000; // ms without any activity

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Qubi, the DevQnA mascot: a small robot that strolls along the bottom of the viewport.
 * Its eyes follow the cursor; get close and it panics, shouts and runs (kicking up dust).
 * Corner it and it leaps over the cursor; catch it (hover, or corner it once it is tired)
 * and click it for a random question. Left alone, it falls asleep. It counts catches
 * (remembered in this browser) and can be hidden until the next page load.
 * Movement is off with reduced motion.
 */
export function Mascot({ questions }: { questions: MascotQuestion[] }) {
  const [tip, setTip] = useState<{ greet: string; q: MascotQuestion; side: "left" | "center" | "right"; catches: number } | null>(null);
  const [hop, setHop] = useState(0);
  const [mood, setMood] = useState<Mood>("calm");
  const [moving, setMoving] = useState(true);
  const [jumping, setJumping] = useState(false);
  const [quip, setQuip] = useState<string | null>(null);
  // "Hide Qubi" lasts until the next page load (the layout keeps this state across client-side navigation)
  const [visible, setVisible] = useState(true);
  const pathname = usePathname();
  const hiddenHere = HIDDEN_ON.some((p) => pathname?.startsWith(p));

  const walkerRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);
  const sim = useRef({
    x: 24,
    y: 0,
    dir: 1,
    hover: false,
    mouse: null as null | { x: number; y: number },
    jump: null as null | { t: number; from: number; to: number },
    rested: 0, // timestamp until which it cannot jump again
    active: 0, // last user activity
  });
  const tipOpen = useRef(false);
  tipOpen.current = !!tip;
  const moodRef = useRef<Mood>("calm");
  moodRef.current = mood;


  // quips fade out on their own
  useEffect(() => {
    if (!quip) return;
    const t = setTimeout(() => setQuip(null), 1400);
    return () => clearTimeout(t);
  }, [quip]);

  // movement + reactions, driven by requestAnimationFrame (no React re-render per frame)
  useEffect(() => {
    if (!visible || hiddenHere) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = sim.current;
    s.active = performance.now();
    const wake = () => (s.active = performance.now());
    const onMove = (e: PointerEvent) => {
      wake();
      if (e.pointerType === "mouse" || e.pointerType === "pen") s.mouse = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => (s.mouse = null);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", wake, { passive: true });
    addEventListener("scroll", wake, { passive: true });
    addEventListener("keydown", wake);
    document.documentElement.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let lastMood: Mood = "calm";
    let lastMoving = true;
    let lastJumping = false;

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

      if (s.jump) {
        // leap over the cursor along an arc
        s.jump.t = Math.min(1, s.jump.t + dt / JUMP_TIME);
        const p = s.jump.t;
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        s.x = s.jump.from + (s.jump.to - s.jump.from) * ease;
        s.y = -Math.sin(Math.PI * p) * 78;
        s.dir = s.jump.to > s.jump.from ? 1 : -1;
        mood = "scared";
        speed = 1;
        if (p >= 1) {
          s.jump = null;
          s.y = 0;
          s.rested = now + JUMP_COOLDOWN;
        }
      } else if (tipOpen.current || s.hover) {
        mood = s.hover && !tipOpen.current ? "caught" : "calm";
      } else if (now - s.active > SLEEP_AFTER) {
        mood = "sleepy";
      } else if (dist < FEAR) {
        const away = dx > 0 ? -1 : 1;
        const cornered = (away < 0 && s.x <= 0) || (away > 0 && s.x >= max);
        if (cornered && dist < JUMP_TRIGGER && now > s.rested && !reduce) {
          // jump over the cursor to the other side
          s.jump = { t: 0, from: s.x, to: Math.min(max, Math.max(0, s.x - away * 220)) };
          mood = "scared";
          speed = 1;
        } else {
          mood = cornered ? "caught" : "scared";
          s.dir = away;
          speed = cornered ? 0 : FLEE * (0.45 + 0.55 * (1 - dist / FEAR));
        }
      } else {
        speed = WALK;
        if (s.x <= 0) s.dir = 1;
        if (s.x >= max) s.dir = -1;
      }
      if (reduce) speed = 0;

      if (!s.jump) s.x = Math.min(max, Math.max(0, s.x + s.dir * speed * dt));
      if (walkerRef.current) walkerRef.current.style.transform = `translateX(${s.x}px)`;
      // only the body leaves the ground when jumping; the shadow stays put
      if (flipRef.current) flipRef.current.style.transform = `translateY(${s.y}px) scaleX(${s.dir})`;

      // pupils look at the cursor (mirrored when Qubi faces left, since the whole body is flipped)
      if (pupilsRef.current) {
        const len = Math.hypot(dx, dy) || 1;
        const px = m ? (dx / len) * 2.2 * s.dir : 0;
        const py = m ? (dy / len) * 1.8 : 0;
        pupilsRef.current.style.transform = `translate(${px}px, ${py}px)`;
      }

      if (mood !== lastMood) {
        if (mood === "scared" && lastMood !== "caught") setQuip(pick(PANIC));
        else if (mood === "caught") setQuip(pick(CORNERED));
        else if (lastMood === "sleepy") {
          setQuip("Huh?!");
          setHop((n) => n + 1);
        }
        setMood((lastMood = mood));
      }
      const isMoving = speed > 0;
      if (isMoving !== lastMoving) setMoving((lastMoving = isMoving));
      const isJumping = !!s.jump;
      if (isJumping !== lastJumping) setJumping((lastJumping = isJumping));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", wake);
      removeEventListener("scroll", wake);
      removeEventListener("keydown", wake);
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
    // count a catch only when it was actually caught (not for "Another")
    let catches = tip?.catches ?? 0;
    if (!tip) {
      try {
        catches = Number(localStorage.getItem(CATCH_KEY) || 0) + 1;
        localStorage.setItem(CATCH_KEY, String(catches));
      } catch {
        catches += 1;
      }
    }
    // open the bubble towards the side with room so it never leaves the screen
    const r = walkerRef.current?.getBoundingClientRect();
    const side = !r ? "center" : r.left < 140 ? "left" : innerWidth - r.right < 140 ? "right" : "center";
    const greet = moodRef.current === "sleepy" ? "Zzz… oh! Hi! Quick one:" : pick(GREETINGS);
    setTip({ greet, q: pick(questions), side, catches });
    setQuip(null);
    setHop((n) => n + 1);
  };

  const hide = () => {
    setTip(null);
    setVisible(false);
  };

  if (!visible || hiddenHere) return null;

  const scared = mood === "scared" || mood === "caught";
  const sleepy = mood === "sleepy";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1 z-40 h-24 overflow-visible print:hidden">
      <div
        ref={walkerRef}
        data-mascot
        data-mood={mood}
        data-moving={moving ? "" : undefined}
        data-jumping={jumping ? "" : undefined}
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
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-extrabold">{tip.greet}</span>
              <span className="shrink-0 rounded-full bg-yellow-300 px-2 py-0.5 text-[11px] font-bold" title="Times you caught Qubi in this browser">
                caught ×{tip.catches}
              </span>
            </p>
            <p className="mt-1 font-medium leading-snug">{tip.q.question}</p>
            <div className="mt-2 flex items-center justify-between">
              <Link
                href={`/questions-answers?topic=${tip.q.topic}&q=${tip.q.id}`}
                onClick={() => setTip(null)}
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

        {/* panic shouts and wake-up reactions */}
        {quip && !tip && (
          <span
            key={quip}
            aria-hidden
            className="mascot-quip absolute -top-8 left-1/2 whitespace-nowrap rounded-full border-2 border-[#0b1020] bg-white px-2.5 py-0.5 text-xs font-black text-[#e11d48] shadow-[2px_2px_0_#0b1020]"
          >
            {quip}
          </span>
        )}

        {/* sleeping */}
        {sleepy && !tip && (
          <span aria-hidden className="absolute -top-6 right-0 font-black text-slate-500">
            <span className="mascot-z inline-block text-xs">z</span>
            <span className="mascot-z inline-block text-sm [animation-delay:.6s]">z</span>
            <span className="mascot-z inline-block text-base [animation-delay:1.2s]">Z</span>
          </span>
        )}

        <button
          type="button"
          onClick={poke}
          aria-label="Qubi the mascot: click for a random interview question"
          className="block w-16 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-300"
        >
          <div ref={flipRef} className="relative">
            {/* dust kicked up behind the feet while fleeing */}
            <span aria-hidden className="mascot-dust pointer-events-none absolute bottom-1 -left-3 flex gap-0.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300/80" />
              <span className="h-2 w-2 rounded-full bg-slate-300/70 [animation-delay:.12s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300/60 [animation-delay:.24s]" />
            </span>
            <span key={hop} className={`block ${hop ? "mascot-hop" : ""}`}>
              <span className="mascot-shake block">
                <svg viewBox="0 0 64 80" className="mascot-bob block w-16 overflow-visible" aria-hidden>
                  {/* antenna */}
                  <g className="mascot-antenna" style={{ transformOrigin: "32px 18px" }}>
                    <line x1="32" y1="18" x2="32" y2="6" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="32" cy="6" r="5" fill={scared ? "#e11d48" : sleepy ? "#94a3b8" : "#ffd84d"} stroke="#0b1020" strokeWidth="2.5" />
                  </g>
                  {/* legs (tucked up mid-jump) */}
                  <g stroke="#0b1020" strokeWidth="4" strokeLinecap="round">
                    <line className="mascot-leg-a" x1="24" y1="60" x2={jumping ? 20 : 24} y2={jumping ? 68 : 72} style={{ transformOrigin: "24px 60px" }} />
                    <line className="mascot-leg-b" x1="40" y1="60" x2={jumping ? 44 : 40} y2={jumping ? 68 : 72} style={{ transformOrigin: "40px 60px" }} />
                  </g>
                  {/* body */}
                  <rect x="10" y="18" width="44" height="44" rx="12" fill="#0b1020" transform="translate(3 3)" />
                  <rect x="10" y="18" width="44" height="44" rx="12" fill="#2b4bff" stroke="#0b1020" strokeWidth="2.5" />
                  {/* arms: one waves when calm, both fly up when scared, droop when sleepy */}
                  <g className="mascot-arm" style={{ transformOrigin: "54px 40px" }}>
                    <line x1="54" y1="40" x2="62" y2={scared ? 26 : sleepy ? 52 : 32} stroke="#0b1020" strokeWidth="4" strokeLinecap="round" />
                  </g>
                  <line x1="10" y1="42" x2="2" y2={scared ? 28 : sleepy ? 52 : 50} stroke="#0b1020" strokeWidth="4" strokeLinecap="round" />
                  {/* face screen */}
                  <rect x="16" y="25" width="32" height="20" rx="6" fill={sleepy ? "#e2e8f0" : "#fff8ec"} stroke="#0b1020" strokeWidth="2" />
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
                      <path className="mascot-sweat" d="M50 22 q3 4 0 6 q-3 -2 0 -6z" fill="#7dd3fc" stroke="#0b1020" strokeWidth="1" />
                    </>
                  ) : sleepy ? (
                    <>
                      {/* closed eyes and a little snore */}
                      <path d="M22 33 q3 2.5 6 0 M36 33 q3 2.5 6 0" fill="none" stroke="#0b1020" strokeWidth="2" strokeLinecap="round" />
                      <circle className="mascot-snore" cx="32" cy="40" r="1.8" fill="#0b1020" style={{ transformOrigin: "32px 40px" }} />
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
          {/* ground shadow shrinks while airborne */}
          <span aria-hidden className={`mx-auto mt-0.5 block h-1.5 rounded-full bg-black/25 transition-all duration-200 ${jumping ? "w-5 opacity-50" : "w-10"}`} />
        </button>
      </div>
    </div>
  );
}
