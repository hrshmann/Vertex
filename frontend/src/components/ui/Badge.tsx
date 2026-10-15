import clsx from "clsx";

export type Tone = "neutral" | "accent" | "buy" | "sell" | "warn";

const TONES: Record<Tone, string> = {
  neutral: "bg-raised text-muted border border-line",
  accent: "bg-accent-soft text-accent",
  buy: "bg-buy-soft text-buy",
  sell: "bg-sell-soft text-sell",
  warn: "bg-warn-soft text-warn",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Plain-language labels and tones for every status the API returns. */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  // KYC
  PENDING: { label: "Not submitted", tone: "neutral" },
  UNDER_REVIEW: { label: "In review", tone: "accent" },
  APPROVED: { label: "Verified", tone: "buy" },
  REJECTED: { label: "Declined", tone: "sell" },
  ADDITIONAL_INFORMATION_REQUIRED: { label: "Action needed", tone: "warn" },
  // Deposits and withdrawals
  PROCESSING: { label: "Processing", tone: "accent" },
  COMPLETED: { label: "Completed", tone: "buy" },
  FAILED: { label: "Failed", tone: "sell" },
  // Orders
  OPEN: { label: "Working", tone: "accent" },
  FILLED: { label: "Filled", tone: "buy" },
  PARTIALLY_FILLED: { label: "Part filled", tone: "accent" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};

export function StatusBadge({ status, labels }: { status: string; labels?: Partial<Record<string, string>> }) {
  const s = STATUS[status] ?? { label: status.replace(/_/g, " ").toLowerCase(), tone: "neutral" as Tone };
  return <Badge tone={s.tone}>{labels?.[status] ?? s.label}</Badge>;
}
