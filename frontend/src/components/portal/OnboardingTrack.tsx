"use client";

import clsx from "clsx";
import { Check, Clock } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { OnboardingStep, useOnboarding } from "@/lib/usePortalData";

type StepState = "done" | "waiting" | "current" | "upcoming";

const STEPS: { key: OnboardingStep; title: string; body: string; cta?: { label: string; href: string } }[] = [
  { key: "account", title: "Open your account", body: "Your demo account is ready with $10,000 of virtual funds." },
  {
    key: "verify",
    title: "Verify your identity",
    body: "Upload an ID, a proof of address and a selfie. It takes about 3 minutes.",
    cta: { label: "Start verification", href: "/kyc" },
  },
  {
    key: "fund",
    title: "Add funds",
    body: "Make your first deposit to see how funding works before you trade with real money.",
    cta: { label: "Add funds", href: "/funds" },
  },
  {
    key: "trade",
    title: "Place your first trade",
    body: "Open the terminal, pick a market and place a small order with a stop loss.",
    cta: { label: "Open the terminal", href: "/terminal" },
  },
];

/**
 * The path from sign-up to trading. The line fills up to the step the user is on; the first
 * step that still needs the user shows its action. Verification under review doesn't block the
 * later steps, so the user can keep going while they wait.
 */
export function OnboardingTrack() {
  const { loaded, done, kyc, complete } = useOnboarding();
  if (!loaded || complete) return null;

  const states: StepState[] = STEPS.map((s) => {
    if (done[s.key]) return "done";
    if (s.key === "verify" && kyc?.status === "UNDER_REVIEW") return "waiting";
    return "upcoming";
  });
  const currentIndex = states.findIndex((s) => s === "upcoming");
  if (currentIndex >= 0) states[currentIndex] = "current";
  // The line runs up to the step the user is on.
  const progressIndex = currentIndex >= 0 ? currentIndex : STEPS.length - 1;
  const current = currentIndex >= 0 ? STEPS[currentIndex] : null;
  const finished = states.filter((s) => s === "done").length;
  const verifyNeedsChanges = kyc?.status === "ADDITIONAL_INFORMATION_REQUIRED" || kyc?.status === "REJECTED";

  return (
    <section aria-labelledby="path-title" className="mb-6 rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="path-title" className="text-base font-semibold">
          Your path to live trading
        </h2>
        <p className="text-xs text-muted">
          {finished} of {STEPS.length} steps done
        </p>
      </div>

      {/* Desktop: one horizontal track. */}
      <ol className="relative mt-6 hidden grid-cols-4 md:grid">
        <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-4 h-0.5 bg-line" />
        <div
          aria-hidden
          className="vx-track-fill absolute left-[12.5%] top-4 h-0.5 bg-accent"
          style={{ width: `${(progressIndex / (STEPS.length - 1)) * 75}%` }}
        />
        {STEPS.map((step, i) => (
          <li key={step.key} className="relative flex flex-col items-center px-3 text-center">
            <StepMarker state={states[i]} number={i + 1} />
            <p className={clsx("mt-3 text-sm font-medium", states[i] === "upcoming" ? "text-muted" : "text-ink")}>{step.title}</p>
            <p className="mt-0.5 text-2xs text-muted">{stateLabel(states[i], step.key, verifyNeedsChanges)}</p>
          </li>
        ))}
      </ol>

      {/* Phones: a vertical list. */}
      <ol className="mt-5 space-y-4 md:hidden">
        {STEPS.map((step, i) => (
          <li key={step.key} className="flex items-center gap-3">
            <StepMarker state={states[i]} number={i + 1} />
            <div>
              <p className={clsx("text-sm font-medium", states[i] === "upcoming" ? "text-muted" : "text-ink")}>{step.title}</p>
              <p className="text-2xs text-muted">{stateLabel(states[i], step.key, verifyNeedsChanges)}</p>
            </div>
          </li>
        ))}
      </ol>

      {current?.cta && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-control bg-raised px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              Next: {current.key === "verify" && verifyNeedsChanges ? "update your documents" : current.title.toLowerCase()}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {current.key === "verify" && verifyNeedsChanges && kyc?.rejection_reason ? kyc.rejection_reason : current.body}
            </p>
          </div>
          <ButtonLink href={current.cta.href}>
            {current.key === "verify" && verifyNeedsChanges ? "Update documents" : current.cta.label}
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

function stateLabel(state: StepState, key: OnboardingStep, verifyNeedsChanges: boolean) {
  if (state === "done") return "Done";
  if (state === "waiting") return "In review";
  if (key === "verify" && verifyNeedsChanges) return "Needs changes";
  return state === "current" ? "Up next" : "Not started";
}

function StepMarker({ state, number }: { state: StepState; number: number }) {
  return (
    <span
      className={clsx(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
        state === "done" && "border-accent bg-accent text-accent-ink",
        state === "waiting" && "border-accent bg-surface text-accent",
        state === "current" && "border-accent bg-accent-soft text-accent ring-4 ring-accent/15",
        state === "upcoming" && "border-line bg-surface text-muted"
      )}
    >
      {state === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : state === "waiting" ? <Clock className="h-4 w-4" /> : number}
    </span>
  );
}
