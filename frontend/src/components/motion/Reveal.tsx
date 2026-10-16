"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rises into view out of a blur the first time it scrolls onto the screen. Children with the
 * vx-cascade-pop / vx-cascade-slide classes (and a --i index) follow one after another.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Extra wait before this block starts, in ms, to stagger neighbouring blocks. */
  delay?: number;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={[className, inView && "is-in"].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}
