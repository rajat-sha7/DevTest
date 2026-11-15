import type { CSSProperties } from "react";

const INK = "#0b1020";
const BLUE = "#2b4bff";
const YELLOW = "#fde047";

const mono = '"Courier New", Courier, monospace';

/** The `</>` tile, drawn with plain divs so next/og (satori) can render it. */
function Tile({ size }: { size: number }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    background: YELLOW,
    border: `${Math.max(4, Math.round(size * 0.05))}px solid ${INK}`,
    borderRadius: Math.round(size * 0.24),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: INK,
    fontFamily: mono,
    fontWeight: 700,
    fontSize: Math.round(size * 0.4),
    boxShadow: `${Math.round(size * 0.06)}px ${Math.round(size * 0.06)}px 0 ${INK}`,
  };
  return <div style={style}>{"</>"}</div>;
}

/** 180x180 touch icon. */
export function AppleIconImage() {
  return (
    <div style={{ width: "100%", height: "100%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Tile size={128} />
    </div>
  );
}

/** 1200x630 social share card. */
export function ShareImage({ title }: { title: string }) {
  const chips: [string, string][] = [
    ["Next.js", "#ffffff"],
    ["React", "#7dd3fc"],
    ["JavaScript", "#fde047"],
    ["CSS", "#f9a8d4"],
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: BLUE,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Tile size={120} />
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>DevQnA</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 34, color: "#dbe4ff" }}>Answers, runnable code, coding tasks and a live playground.</div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {chips.map(([label, bg]) => (
          <div
            key={label}
            style={{
              display: "flex",
              background: bg,
              color: INK,
              border: `4px solid ${INK}`,
              borderRadius: 999,
              padding: "10px 28px",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
