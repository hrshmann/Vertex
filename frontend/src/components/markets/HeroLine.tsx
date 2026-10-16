"use client";

import { useSparklines } from "@/lib/useSparklines";

const W = 800;
const H = 300;

/**
 * A large, faint price line that draws itself behind the home page headline: the real last
 * 24 hours of a market (Bitcoin by default), smoothed into a curve.
 */
export function HeroLine({ symbol = "BTC/USD", className }: { symbol?: string; className?: string }) {
  const points = useSparklines()[symbol]?.points;
  if (!points || points.length < 3) return null;

  const min = Math.min(...points);
  const span = Math.max(...points) - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 20 - ((p - min) / span) * (H - 60)] as const);
  // Catmull-Rom through the points, drawn as cubic Béziers, for a smooth line.
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [x0, y0] = xy[Math.max(0, i - 1)];
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[i + 1];
    const [x3, y3] = xy[Math.min(xy.length - 1, i + 2)];
    d += ` C${x1 + (x2 - x0) / 6},${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6},${y2 - (y3 - y1) / 6} ${x2},${y2}`;
  }
  const [lastX, lastY] = xy[xy.length - 1];

  return (
    <div aria-hidden className={className}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="vx-hero-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          <stop offset="35%" stopColor="rgb(var(--accent))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="rgb(var(--glow))" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="vx-hero-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.16" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="vx-draw-fill" d={`${d} L${W},${H} L0,${H} Z`} fill="url(#vx-hero-fill)" />
      <path className="vx-draw" pathLength={1} d={d} fill="none" stroke="url(#vx-hero-stroke)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
      {/* The live end of the line, pulsing. */}
      <span
        className="vx-draw-fill absolute flex h-3 w-3 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(lastX / W) * 100}%`, top: `${(lastY / H) * 100}%` }}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-glow/60" />
        <span className="relative m-auto h-2 w-2 rounded-full bg-glow shadow-[0_0_12px_rgb(var(--glow))]" />
      </span>
    </div>
  );
}
