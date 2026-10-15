"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

/** A button that opens a panel; closes on outside click, Escape, or choosing an item. */
export function Popover({
  trigger,
  label,
  children,
  align = "right",
  panelClassName,
}: {
  trigger: React.ReactNode;
  label: string;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center justify-center rounded-control px-2 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          className={clsx(
            "absolute top-full z-50 mt-2 rounded-panel border border-line bg-surface shadow-[0_12px_32px_rgb(0_0_0/0.14)]",
            align === "right" ? "right-0" : "left-0",
            panelClassName
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
