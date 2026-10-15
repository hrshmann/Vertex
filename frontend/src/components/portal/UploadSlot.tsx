"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { KycDocument } from "@/lib/types";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return "under 1 KB";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Checks a file before upload so problems show instantly, with the same rules as the server. */
export function checkFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return "Use a JPG, PNG or PDF file.";
  if (file.size > MAX_BYTES) return "This file is larger than 10 MB. Try a smaller photo or a compressed PDF.";
  return null;
}

/**
 * One document slot: drop or pick a file and it uploads straight away. Shows a preview of the
 * chosen image, then the stored file's name, with replace and remove while editing is allowed.
 */
export function UploadSlot({
  label,
  hint,
  document,
  editable,
  capture,
  onUpload,
  onRemove,
}: {
  label: string;
  hint?: string;
  document?: KycDocument;
  editable: boolean;
  capture?: "user" | "environment";
  onUpload: (file: File) => Promise<void>;
  onRemove: (doc: KycDocument) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handle(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload didn't go through. Try again.");
      setPreview(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT}
      capture={capture}
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => void handle(e.target.files?.[0])}
    />
  );

  if (document && !busy) {
    return (
      <div className="rounded-control border border-line bg-surface p-3">
        <div className="flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded-[6px] object-cover" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-raised text-muted">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-buy" aria-hidden />
              {label}
            </p>
            <p className="truncate text-2xs text-muted">
              {document.original_filename}
              {document.size_bytes ? `, ${formatBytes(document.size_bytes)}` : ""}
            </p>
          </div>
          {editable && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-raised hover:text-ink"
                aria-label={`Replace ${label.toLowerCase()}`}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRemove(document);
                    setPreview(null);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-sell-soft hover:text-sell"
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-2xs text-sell">{error}</p>}
        {fileInput}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={!editable || busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (editable) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (editable) void handle(e.dataTransfer.files?.[0]);
        }}
        className={clsx(
          "flex w-full items-center gap-3 rounded-control border border-dashed p-3 text-left transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-line bg-raised hover:border-accent/60",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {busy && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded-[6px] object-cover opacity-60" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-surface text-accent">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{busy ? `Uploading ${label.toLowerCase()}…` : label}</span>
          <span className="block text-2xs text-muted">{busy ? "Encrypting and saving your file" : hint ?? "Drop a file here or choose one. JPG, PNG or PDF up to 10 MB."}</span>
        </span>
      </button>
      {error && <p className="mt-1.5 text-2xs text-sell">{error}</p>}
      {fileInput}
    </div>
  );
}
