"use client";

import { useEffect } from "react";

/**
 * Lights up the border of whichever panel (.vx-panel) the mouse is over, centred on the
 * pointer. One listener for the whole page; the glow itself is CSS (motion.css).
 */
export function PointerGlow() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let lit: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      if (!last) return;
      const panel = (last.target as Element | null)?.closest?.<HTMLElement>(".vx-panel") ?? null;
      if (panel !== lit) {
        lit?.classList.remove("is-lit");
        panel?.classList.add("is-lit");
        lit = panel;
      }
      if (panel) {
        const box = panel.getBoundingClientRect();
        panel.style.setProperty("--mx", `${last.clientX - box.left}px`);
        panel.style.setProperty("--my", `${last.clientY - box.top}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => {
      lit?.classList.remove("is-lit");
      lit = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      onLeave();
    };
  }, []);
  return null;
}
