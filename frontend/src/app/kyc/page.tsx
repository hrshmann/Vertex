"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api, ApiRequestError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

type DocType = "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE" | "PROOF_OF_ADDRESS" | "SELFIE" | "OTHER";

interface KycProfile {
  status: string;
  rejection_reason: string | null;
  documents: { id: string; document_type: string; original_filename: string; uploaded_at: string }[];
}

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "PASSPORT", label: "Passport" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "PROOF_OF_ADDRESS", label: "Proof of Address" },
  { value: "SELFIE", label: "Selfie" },
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-vx-muted",
  UNDER_REVIEW: "text-vx-warn",
  APPROVED: "text-vx-buy",
  REJECTED: "text-vx-sell",
  ADDITIONAL_INFORMATION_REQUIRED: "text-vx-warn",
};

export default function KycPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [docType, setDocType] = useState<DocType>("PASSPORT");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/kyc");
  }, [loading, user, router]);

  function load() {
    api.get<KycProfile>("/api/kyc").then(setProfile).catch(() => {});
  }
  useEffect(() => {
    if (user) load();
  }, [user]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const base64 = await fileToBase64(file);
      await api.post("/api/kyc/documents", {
        documentType: docType,
        filename: file.name,
        mimeType: file.type,
        fileBase64: base64,
      });
      setMessage("Document uploaded — status moved to Under Review.");
      setFile(null);
      load();
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div>
      <PageHeader title="Identity Verification (KYC)" subtitle="Upload your documents to verify your account." />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="vx-surface rounded-xl p-5 mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs vx-muted uppercase tracking-wide mb-1">Status</div>
            <div className={`text-lg font-medium ${STATUS_COLOR[profile?.status ?? "PENDING"]}`}>
              {profile?.status?.replace(/_/g, " ") ?? "Loading…"}
            </div>
            {profile?.rejection_reason && (
              <div className="text-xs text-vx-sell mt-1">{profile.rejection_reason}</div>
            )}
          </div>
        </div>

        <div className="vx-surface rounded-xl p-5 mb-8">
          <h2 className="font-medium mb-4">Upload a document</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <button
            onClick={upload}
            disabled={!file || uploading}
            className="rounded-lg bg-vx-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload document"}
          </button>
          {message && <div className="mt-3 text-sm text-vx-accent">{message}</div>}
        </div>

        <h2 className="font-medium mb-3">Uploaded documents</h2>
        <div className="vx-surface rounded-xl divide-y divide-[rgb(var(--border))]">
          {(profile?.documents?.length ?? 0) === 0 && (
            <div className="px-5 py-6 text-sm vx-muted">No documents uploaded yet.</div>
          )}
          {profile?.documents.map((d) => (
            <div key={d.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <span>{d.document_type.replace(/_/g, " ")} — {d.original_filename}</span>
              <span className="vx-muted text-xs">{new Date(d.uploaded_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
