"use client";

import { useEffect, useState } from "react";
import { motionEnabled } from "./motion";

const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEF";
const FRAME_MS = 30;

/**
 * Text that decodes itself like a terminal readout whenever it changes: characters cycle
 * through random glyphs and settle left to right. Screen readers get the final text.
 */
export function Scramble({ text, className, duration = 700 }: { text: string; className?: string; duration?: number }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!motionEnabled()) {
      setShown(text);
      return;
    }
    // Characters settle left to right over `duration`.
    const frames = Math.max(1, Math.round(duration / FRAME_MS));
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      const settled = Math.floor((frame / frames) * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("")
      );
      if (frame >= frames) clearInterval(timer);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [text, duration]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
