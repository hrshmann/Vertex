"use client";

import { useRef } from "react";
import { motionEnabled } from "./motion";

const PULL = 0.25; // share of the pointer's offset from centre the content follows
const MAX_PX = 10;

/** Wraps a button so it leans towards the pointer while hovered and springs back on leave. */
export function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || !motionEnabled()) return;
    const box = el.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-MAX_PX, Math.min(MAX_PX, v));
    const x = clamp((e.clientX - box.left - box.width / 2) * PULL);
    const y = clamp((e.clientY - box.top - box.height / 2) * PULL);
    el.style.transition = "transform 150ms ease-out";
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transform = "";
  };

  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={leave} className={["inline-block", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
