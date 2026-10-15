"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { formatPrice } from "@/lib/format";

/** Renders a numeric price and briefly flashes green/red when it changes up or down. */
export function PriceFlash({
  value,
  decimals = 5,
  className,
}: {
  value: number | null | undefined;
  decimals?: number;
  className?: string;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef<number | null | undefined>(value);

  useEffect(() => {
    if (value == null || prev.current == null) {
      prev.current = value;
      return;
    }
    if (value > prev.current) setFlash("up");
    else if (value < prev.current) setFlash("down");
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={clsx(
        "vx-tabular inline-block px-1 rounded",
        flash === "up" && "vx-flash-up",
        flash === "down" && "vx-flash-down",
        className
      )}
    >
      {formatPrice(value, decimals)}
    </span>
  );
}
