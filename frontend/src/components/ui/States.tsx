import clsx from "clsx";

/** An empty list says what goes here and offers the action that fills it. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-raised text-muted">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-control bg-raised", className)} />;
}

export function Notice({
  tone = "accent",
  title,
  children,
  action,
  icon,
}: {
  tone?: "accent" | "warn" | "sell" | "buy";
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const tones = {
    accent: "border-accent/30 bg-accent-soft",
    warn: "border-warn/30 bg-warn-soft",
    sell: "border-sell/30 bg-sell-soft",
    buy: "border-buy/30 bg-buy-soft",
  };
  const iconTones = { accent: "text-accent", warn: "text-warn", sell: "text-sell", buy: "text-buy" };
  return (
    <div role="status" className={clsx("flex flex-wrap items-start gap-3 rounded-panel border px-4 py-3", tones[tone])}>
      {icon && <div className={clsx("mt-0.5 shrink-0", iconTones[tone])}>{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {children && <div className="mt-0.5 text-xs text-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
