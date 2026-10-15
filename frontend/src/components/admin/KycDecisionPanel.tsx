"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Mail, RotateCcw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { inputClass, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";

export type Decision = "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

interface Draft {
  to: string;
  subject: string;
  text: string;
  mailConfigured: boolean;
}

type EmailResult = { sent: true } | { sent: false; reason: string } | null;

const OPTIONS: { value: Decision; label: string; action: string; short: string }[] = [
  { value: "APPROVED", label: "Approve", action: "Approve", short: "Approve" },
  { value: "ADDITIONAL_INFORMATION_REQUIRED", label: "Ask for more", action: "Request more information", short: "Request info" },
  { value: "REJECTED", label: "Decline", action: "Decline", short: "Decline" },
];

/**
 * Pick a decision, write the reason, check the prewritten email, then save. The email is
 * regenerated from the template as the decision or reason changes, until the admin edits it.
 */
export function KycDecisionPanel({
  userId,
  clientEmail,
  canApprove,
  onDecided,
}: {
  userId: string;
  clientEmail: string;
  canApprove: boolean;
  onDecided: (decision: Decision, email: EmailResult) => void;
}) {
  const [decision, setDecision] = useState<Decision>(canApprove ? "APPROVED" : "ADDITIONAL_INFORMATION_REQUIRED");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [mailConfigured, setMailConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRequest = useRef(0);

  const needsReason = decision !== "APPROVED";

  // Refresh the template (debounced while typing the reason) unless the admin has edited the email.
  useEffect(() => {
    if (edited) return;
    const request = ++draftRequest.current;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ decision });
      if (reason.trim()) params.set("reason", reason.trim());
      api
        .get<Draft>(`/api/admin/kyc/${userId}/email-draft?${params}`)
        .then((draft) => {
          if (request !== draftRequest.current) return;
          setSubject(draft.subject);
          setText(draft.text);
          setMailConfigured(draft.mailConfigured);
        })
        .catch(() => {});
    }, reason ? 300 : 0);
    return () => clearTimeout(timer);
  }, [decision, reason, edited, userId]);

  function resetTemplate() {
    setEdited(false);
  }

  async function submit() {
    setError(null);
    if (needsReason && !reason.trim()) {
      setError("Write the reason the client will see, so they know what to fix.");
      return;
    }
    if (sendEmail && text.includes("[write what the client needs to do]")) {
      setError("The email still has the placeholder for the reason. Write the reason, or edit the email.");
      return;
    }
    setBusy(true);
    try {
      const email = sendEmail ? { to: to.trim(), subject: subject.trim(), text: text.trim() } : undefined;
      const result = await api.post<{ email: EmailResult }>(`/api/admin/users/${userId}/kyc`, {
        status: decision,
        rejectionReason: needsReason ? reason.trim() : undefined,
        email,
      });
      // No mail server yet: hand the same email to the admin's own mail app.
      if (email && result.email && !result.email.sent) {
        window.location.href = `mailto:${encodeURIComponent(email.to)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`;
      }
      onDecided(decision, result.email);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "The decision wasn't saved. Try again.");
      setBusy(false);
    }
  }

  const option = OPTIONS.find((o) => o.value === decision)!;
  const submitLabel = sendEmail ? `${option.short} and ${mailConfigured ? "send" : "write"} email` : option.action;

  return (
    <Panel title="Decision">
      <div role="radiogroup" aria-label="Decision" className="grid grid-cols-3 gap-1 rounded-control bg-raised p-1">
        {OPTIONS.map((o) => {
          const disabled = o.value === "APPROVED" && !canApprove;
          const selected = decision === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || busy}
              onClick={() => {
                // A different decision needs a different email, so start again from its template.
                setDecision(o.value);
                setEdited(false);
              }}
              className={clsx(
                "rounded-[6px] px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? o.value === "APPROVED"
                    ? "bg-buy text-white"
                    : o.value === "REJECTED"
                      ? "bg-sell text-white"
                      : "bg-surface text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!canApprove && <p className="mt-2 text-2xs text-muted">Approval needs all three documents.</p>}

      {needsReason && (
        <div className="mt-4">
          <label htmlFor="reason" className="text-xs font-medium">
            Reason for the client
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            rows={3}
            maxLength={500}
            placeholder="For example: The proof of address is older than 3 months. Please upload a bill from the last 3 months."
            className={clsx(inputClass, "mt-1.5 h-auto py-2")}
          />
          <p className="mt-1 text-2xs text-muted">Shown on their verification page and put into the email.</p>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          <Mail className="h-4 w-4 text-muted" />
          Email the client
        </label>

        {sendEmail && (
          <div className="mt-3 space-y-3">
            <TextField label="To" type="email" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" />
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setEdited(true);
              }}
            />
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="email-body" className="text-xs font-medium">
                  Message
                </label>
                {edited && (
                  <button type="button" onClick={resetTemplate} className="inline-flex items-center gap-1 text-2xs text-accent hover:underline">
                    <RotateCcw className="h-3 w-3" />
                    Use the template again
                  </button>
                )}
              </div>
              <textarea
                id="email-body"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setEdited(true);
                }}
                rows={12}
                className={clsx(inputClass, "h-auto py-2 text-xs leading-relaxed")}
              />
            </div>
            {!mailConfigured && (
              <p className="rounded-control bg-warn-soft px-3 py-2 text-2xs text-ink">
                Sending from the website isn't set up yet, so after saving, this email opens in your own mail app, ready to send.
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-sell">{error}</p>}
      <Button
        className="mt-4 w-full"
        variant={decision === "APPROVED" ? "buy" : decision === "REJECTED" ? "sell" : "primary"}
        loading={busy}
        disabled={busy || (sendEmail && !text)}
        onClick={() => void submit()}
      >
        {submitLabel}
      </Button>
    </Panel>
  );
}
