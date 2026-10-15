/**
 * KYC rules shared by the user and admin routes: what a complete submission contains, which
 * statuses let the user change documents, and how uploaded files are checked.
 */

export type KycDocumentType = "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE" | "PROOF_OF_ADDRESS" | "SELFIE" | "OTHER";
export type KycSide = "FRONT" | "BACK";

export const IDENTITY_DOCUMENTS: KycDocumentType[] = ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"];
/** ID types with information on both sides; a passport only needs its photo page. */
export const TWO_SIDED_DOCUMENTS: KycDocumentType[] = ["NATIONAL_ID", "DRIVERS_LICENSE"];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** The user may add or replace documents only before review starts, or when asked for more. */
export const EDITABLE_STATUSES = ["PENDING", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED"];

/** A kyc_documents row; only document_type and side are read. */
export type KycDocumentRef = Record<string, unknown>;

export interface KycRequirements {
  identity: boolean;
  proofOfAddress: boolean;
  selfie: boolean;
  complete: boolean;
}

export function evaluateRequirements(documents: readonly KycDocumentRef[]): KycRequirements {
  const has = (type: string, side?: KycSide) =>
    documents.some((d) => d.document_type === type && (side === undefined || (d.side ?? "FRONT") === side));
  const identity = IDENTITY_DOCUMENTS.some((type) =>
    TWO_SIDED_DOCUMENTS.includes(type) ? has(type, "FRONT") && has(type, "BACK") : has(type)
  );
  const proofOfAddress = has("PROOF_OF_ADDRESS");
  const selfie = has("SELFIE");
  return { identity, proofOfAddress, selfie, complete: identity && proofOfAddress && selfie };
}

const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
];

/**
 * The file type from the file's own bytes, or null if it isn't JPEG, PNG or PDF. The type the
 * browser declares is ignored: it is just the file extension and is trivially spoofed.
 */
export function detectDocumentMime(file: Buffer): string | null {
  const match = SIGNATURES.find((s) => s.bytes.every((byte, i) => file[i] === byte));
  return match?.mime ?? null;
}

/** Keeps a display-safe filename: no path, no control characters, bounded length. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "document";
  const clean = base.replace(/[\u0000-\u001f\u007f"<>|]/g, "").trim();
  return (clean || "document").slice(0, 200);
}
