"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Check, Circle, Clock, Lock, ShieldCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useKyc } from "@/lib/usePortalData";
import { KycDocument, KycDocumentType } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { Notice, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { UploadSlot } from "@/components/portal/UploadSlot";

type IdentityType = "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE";

const IDENTITY_OPTIONS: { value: IdentityType; label: string; body: string }[] = [
  { value: "PASSPORT", label: "Passport", body: "Photo page only" },
  { value: "NATIONAL_ID", label: "National ID card", body: "Front and back" },
  { value: "DRIVERS_LICENSE", label: "Driving licence", body: "Front and back" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("This file couldn't be read. Try choosing it again."));
    reader.readAsDataURL(file);
  });
}

export default function VerificationPage() {
  const { kyc, reload } = useKyc();
  const toast = useToast();
  const [identityType, setIdentityType] = useState<IdentityType>("PASSPORT");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Start on whichever ID the user already uploaded.
  useEffect(() => {
    const existing = kyc?.documents.find((d) => IDENTITY_OPTIONS.some((o) => o.value === d.document_type));
    if (existing) setIdentityType(existing.document_type as IdentityType);
  }, [kyc?.documents]);

  if (!kyc) {
    return (
      <div>
        <PageTitle title="Verification" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const find = (type: KycDocumentType, side?: "FRONT" | "BACK") =>
    kyc.documents.find((d) => d.document_type === type && (side === undefined || (d.side ?? "FRONT") === side));

  async function upload(type: KycDocumentType, file: File, side?: "FRONT" | "BACK") {
    try {
      await api.post("/api/kyc/documents", {
        documentType: type,
        side,
        filename: file.name,
        mimeType: file.type,
        fileBase64: await fileToBase64(file),
      });
      await reload();
    } catch (err) {
      throw new Error(err instanceof ApiRequestError ? err.message : "The upload didn't go through. Try again.");
    }
  }

  async function remove(doc: KycDocument) {
    try {
      await api.delete(`/api/kyc/documents/${doc.id}`);
      await reload();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : "Couldn't remove that file.", "error");
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/api/kyc/submit");
      await reload();
      toast("Documents submitted for review");
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : "Couldn't submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const editable = kyc.canEdit;
  const twoSided = identityType !== "PASSPORT";
  const req = kyc.requirements;
  const steps = [
    { done: req.identity, label: "Identity document" },
    { done: req.proofOfAddress, label: "Proof of address" },
    { done: req.selfie, label: "Selfie with your ID" },
  ];

  return (
    <div>
      <PageTitle
        title="Verification"
        description="We verify every client's identity. This protects your account and is required by financial regulation."
        actions={<StatusBadge status={kyc.status} />}
      />

      <StatusSummary status={kyc.status} submittedAt={kyc.submitted_at} reviewedAt={kyc.reviewed_at} reason={kyc.rejection_reason} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ol className="min-w-0 space-y-6">
          <Step number={1} done={req.identity} title="Identity document" description="A valid, government-issued photo ID. All four corners visible, no glare.">
            <fieldset disabled={!editable} className="mb-4">
              <legend className="sr-only">Type of identity document</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {IDENTITY_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={clsx(
                      "flex cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                      identityType === o.value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50",
                      !editable && "cursor-default"
                    )}
                  >
                    <input
                      type="radio"
                      name="identity-type"
                      value={o.value}
                      checked={identityType === o.value}
                      onChange={() => setIdentityType(o.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={clsx(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        identityType === o.value ? "border-accent" : "border-line"
                      )}
                    >
                      {identityType === o.value && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="block text-2xs text-muted">{o.body}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {/* grid-cols-1 lets long filenames truncate instead of widening the column on phones. */}
            <div className={clsx("grid grid-cols-1 gap-3", twoSided && "sm:grid-cols-2")}>
              <UploadSlot
                label={twoSided ? "Front" : "Photo page"}
                document={find(identityType, "FRONT")}
                editable={editable}
                onUpload={(f) => upload(identityType, f, "FRONT")}
                onRemove={remove}
              />
              {twoSided && (
                <UploadSlot
                  label="Back"
                  document={find(identityType, "BACK")}
                  editable={editable}
                  onUpload={(f) => upload(identityType, f, "BACK")}
                  onRemove={remove}
                />
              )}
            </div>
          </Step>

          <Step
            number={2}
            done={req.proofOfAddress}
            title="Proof of address"
            description="A utility bill, bank statement or government letter from the last 3 months, showing your full name and address."
          >
            <UploadSlot
              label="Proof of address"
              document={find("PROOF_OF_ADDRESS")}
              editable={editable}
              onUpload={(f) => upload("PROOF_OF_ADDRESS", f)}
              onRemove={remove}
            />
          </Step>

          <Step
            number={3}
            done={req.selfie}
            title="Selfie with your ID"
            description="A clear photo of your face, holding the ID from step 1 next to it. On a phone, this opens your camera."
          >
            <UploadSlot
              label="Selfie"
              hint="Good light, no sunglasses or hat. JPG or PNG up to 10 MB."
              capture="user"
              document={find("SELFIE")}
              editable={editable}
              onUpload={(f) => upload("SELFIE", f)}
              onRemove={remove}
            />
          </Step>
        </ol>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="Checklist">
            <ul className="space-y-2.5">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-sm">
                  {s.done ? <Check className="h-4 w-4 text-buy" strokeWidth={3} /> : <Circle className="h-4 w-4 text-line" />}
                  <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
                </li>
              ))}
            </ul>
            {editable ? (
              <>
                <Button className="mt-5 w-full" disabled={!req.complete} loading={submitting} onClick={() => void submit()}>
                  Submit for review
                </Button>
                {!req.complete && <p className="mt-2 text-center text-2xs text-muted">Add all three documents to submit.</p>}
                {submitError && <p className="mt-2 text-2xs text-sell">{submitError}</p>}
              </>
            ) : (
              <p className="mt-5 text-xs text-muted">
                {kyc.status === "APPROVED" ? "Your documents are approved." : "Your documents are locked while we review them."}
              </p>
            )}
            <p className="mt-5 flex gap-2 border-t border-line pt-4 text-2xs text-muted">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Files are encrypted when stored. Only our compliance team can open them, and every view is logged.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Step({
  number,
  done,
  title,
  description,
  children,
}: {
  number: number;
  done: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-panel border border-line bg-surface p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={clsx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            done ? "bg-buy text-white" : "bg-accent-soft text-accent"
          )}
          aria-hidden
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
        </span>
        <div>
          <h2 className="text-sm font-semibold">
            <span className="sr-only">Step {number}: </span>
            {title}
            {done && <span className="sr-only"> (done)</span>}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
      </div>
      {children}
    </li>
  );
}

function StatusSummary({
  status,
  submittedAt,
  reviewedAt,
  reason,
}: {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reason: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <div className="mb-6">
        <Notice tone="buy" icon={<ShieldCheck className="h-4 w-4" />} title="Your identity is verified" action={<ButtonLink href="/prices" size="sm" variant="secondary">See live prices</ButtonLink>}>
          Verified {formatDateTime(reviewedAt)}. Your account is complete.
        </Notice>
      </div>
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <div className="mb-6">
        <Notice tone="accent" icon={<Clock className="h-4 w-4" />} title="We're reviewing your documents">
          Submitted {formatDateTime(submittedAt)}. Reviews usually take one business day, and we'll notify you of the result.
        </Notice>
      </div>
    );
  }
  if (status === "ADDITIONAL_INFORMATION_REQUIRED" || status === "REJECTED") {
    return (
      <div className="mb-6">
        <Notice tone={status === "REJECTED" ? "sell" : "warn"} title={status === "REJECTED" ? "We couldn't verify your identity" : "We need a little more from you"}>
          {reason ?? "Check your documents below and upload clearer copies."} Replace the affected files, then submit again.
        </Notice>
      </div>
    );
  }
  return null;
}
