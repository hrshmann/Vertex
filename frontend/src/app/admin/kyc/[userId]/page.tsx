"use client";

import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, ExternalLink, FileText } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/components/portal/UploadSlot";
import { useAdminAuth } from "@/lib/AdminAuthContext";

interface ReviewDocument {
  id: string;
  document_type: string;
  side: string | null;
  original_filename: string;
  mime_type: string;
  size_bytes: number | null;
  uploaded_at: string;
  has_file: boolean;
}

interface Review {
  user_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
  country: string | null;
  user_created_at: string;
  documents: ReviewDocument[];
  requirements: { identity: boolean; proofOfAddress: boolean; selfie: boolean; complete: boolean };
}

const DOC_LABELS: Record<string, string> = {
  PASSPORT: "Passport",
  NATIONAL_ID: "National ID card",
  DRIVERS_LICENSE: "Driving licence",
  PROOF_OF_ADDRESS: "Proof of address",
  SELFIE: "Selfie with ID",
};

type Decision = "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

export default function AdminKycReviewPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { admin } = useAdminAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDecide = admin?.role === "SUPER_ADMIN" || admin?.role === "COMPLIANCE";

  const load = useCallback(() => {
    api.get<Review>(`/api/admin/kyc/${userId}`).then(setReview).catch(() => setError("This client's verification couldn't be loaded."));
  }, [userId]);
  useEffect(load, [load]);

  async function decide(status: Decision) {
    if (status !== "APPROVED" && !reason.trim()) {
      setError("Write the reason the client will see, so they know what to fix.");
      return;
    }
    setBusy(status);
    setError(null);
    try {
      await api.post(`/api/admin/users/${userId}/kyc`, { status, rejectionReason: status === "APPROVED" ? undefined : reason.trim() });
      toast(status === "APPROVED" ? "Client verified" : status === "REJECTED" ? "Verification declined" : "Asked the client for more information");
      router.push("/admin/kyc");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "The decision wasn't saved. Try again.");
      setBusy(null);
    }
  }

  if (!review) {
    return (
      <div className="p-6 sm:p-8">
        {error ? <p className="text-sm text-sell">{error}</p> : <Skeleton className="h-96" />}
      </div>
    );
  }

  const checks = [
    { ok: review.requirements.identity, label: "Identity document" },
    { ok: review.requirements.proofOfAddress, label: "Proof of address" },
    { ok: review.requirements.selfie, label: "Selfie" },
  ];

  return (
    <div className="p-6 sm:p-8">
      <Link href="/admin/kyc" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        All reviews
      </Link>
      <PageTitle
        title={`${review.first_name} ${review.last_name}`}
        description={`${review.email}${review.country ? `, ${review.country}` : ""}. Client since ${formatDateTime(review.user_created_at)}.`}
        actions={<StatusBadge status={review.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {review.documents.length === 0 && <p className="text-sm text-muted">No documents uploaded.</p>}
          {review.documents.map((doc) => {
            const url = `${API_BASE}/api/admin/kyc/documents/${doc.id}/file`;
            const isImage = doc.mime_type.startsWith("image/");
            return (
              <figure key={doc.id} className="overflow-hidden rounded-panel border border-line bg-surface">
                <div className="flex aspect-[4/3] items-center justify-center bg-raised">
                  {!doc.has_file ? (
                    <p className="px-6 text-center text-xs text-muted">Uploaded before files were stored. Ask the client to upload it again.</p>
                  ) : !canDecide ? (
                    <p className="px-6 text-center text-xs text-muted">Only compliance staff can view documents.</p>
                  ) : isImage ? (
                    <a href={url} target="_blank" rel="noreferrer" className="h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${DOC_LABELS[doc.document_type] ?? doc.document_type} uploaded by the client`} className="h-full w-full object-contain" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-sm font-medium text-accent hover:underline">
                      <FileText className="h-8 w-8" />
                      Open PDF
                    </a>
                  )}
                </div>
                <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {DOC_LABELS[doc.document_type] ?? doc.document_type}
                      {doc.side && doc.document_type !== "PASSPORT" ? `, ${doc.side === "FRONT" ? "front" : "back"}` : ""}
                    </p>
                    <p className="truncate text-2xs text-muted">
                      {doc.original_filename}
                      {doc.size_bytes ? `, ${formatBytes(doc.size_bytes)}` : ""}, {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                  {doc.has_file && canDecide && (
                    <a href={url} target="_blank" rel="noreferrer" aria-label="Open in a new tab" className="shrink-0 text-muted hover:text-ink">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Submission">
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.ok ? <Check className="h-4 w-4 text-buy" strokeWidth={3} /> : <Circle className="h-4 w-4 text-line" />}
                  <span className={c.ok ? "" : "text-muted"}>{c.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-2xs text-muted">
              Submitted {formatDateTime(review.submitted_at)}
              {review.reviewed_at ? `. Last decision ${formatDateTime(review.reviewed_at)}.` : "."}
            </p>
            {review.rejection_reason && <p className="mt-2 text-xs text-muted">Last reason given: {review.rejection_reason}</p>}
          </Panel>

          {canDecide ? (
            <Panel title="Decision">
              <label htmlFor="reason" className="text-xs font-medium">
                Reason for the client
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="For example: The proof of address is older than 3 months."
                className="mt-1.5 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-1 text-2xs text-muted">Needed when asking for more or declining. The client sees it.</p>
              {error && <p className="mt-2 text-xs text-sell">{error}</p>}
              <div className="mt-4 grid gap-2">
                <Button variant="buy" loading={busy === "APPROVED"} disabled={!!busy || !review.requirements.complete} onClick={() => void decide("APPROVED")}>
                  Approve
                </Button>
                <Button variant="secondary" loading={busy === "ADDITIONAL_INFORMATION_REQUIRED"} disabled={!!busy} onClick={() => void decide("ADDITIONAL_INFORMATION_REQUIRED")}>
                  Request more information
                </Button>
                <Button variant="ghost" className={clsx("text-sell hover:bg-sell-soft hover:text-sell")} loading={busy === "REJECTED"} disabled={!!busy} onClick={() => void decide("REJECTED")}>
                  Decline
                </Button>
              </div>
              {!review.requirements.complete && <p className="mt-2 text-2xs text-muted">Approval needs all three documents.</p>}
            </Panel>
          ) : (
            <p className="text-xs text-muted">Only compliance staff can make verification decisions.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
