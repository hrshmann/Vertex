"use client";

import { useEffect, useRef, useState } from "react";
import { motionEnabled } from "./motion";

const DURATION_MS = 1400;

/**
 * A number that counts up from zero the first time it gets a value, then simply follows it.
 * Live figures change several times a second, so the count-up aims at the latest value rather
 * than restarting on every change. `format` renders the number.
 */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  className,
}: {
  value: number | null | undefined;
  format?: (n: number) => string;
  className?: string;
}) {
  const target = useRef(value);
  target.current = value;
  const [counting, setCounting] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const hasValue = value != null && Number.isFinite(value);

  useEffect(() => {
    if (!hasValue || done) return;
    if (!motionEnabled()) return setDone(true);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setCounting((target.current ?? 0) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hasValue, done]);

  const shown = !hasValue ? null : done ? value : counting;
  return <span className={className}>{shown == null ? "—" : format(shown)}</span>;
}
