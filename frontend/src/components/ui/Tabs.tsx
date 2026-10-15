"use client";

import clsx from "clsx";
import { useRef } from "react";

/** Segmented tabs with arrow-key navigation. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  }

  return (
    <div role="tablist" aria-label={label} className={clsx("inline-flex rounded-control border border-line bg-raised p-0.5", className)}>
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          tabIndex={value === tab.value ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => onChange(tab.value)}
          className={clsx(
            "h-8 rounded-[6px] px-3 text-xs font-medium transition-colors",
            value === tab.value ? "bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-muted hover:text-ink"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
