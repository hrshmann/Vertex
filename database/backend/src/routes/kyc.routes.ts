import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { query } from "./mariaDbQuery";
import { ApiError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { encryptBuffer } from "../utils/crypto";
import {
  EDITABLE_STATUSES,
  MAX_DOCUMENT_BYTES,
  TWO_SIDED_DOCUMENTS,
  detectDocumentMime,
  evaluateRequirements,
  sanitizeFilename,
} from "../services/kyc/kycRules";

/**
 * Identity verification. The user uploads an identity document, proof of address and a selfie,
 * then submits them for review; an admin with the COMPLIANCE role approves, rejects or asks for
 * more (see routes/admin/kyc.routes.ts). Files are stored AES-256-GCM encrypted in the database
 * (Hostinger replaces the app directory on every deploy, so local disk isn't durable).
 */
export function kycRouter() {
  const router = Router();
  router.use(requireAuth);

  async function loadProfile(userId: string) {
    const profile = await query(
      `SELECT id, status, submitted_at, reviewed_at, rejection_reason, created_at, updated_at
       FROM kyc_profiles WHERE user_id = ?`,
      [userId]
    );
    if (!profile.rows[0]) throw new ApiError(404, "KYC profile not found");
    return profile.rows[0];
  }

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const profile = await loadProfile(req.user!.sub);
      const docs = await query(
        `SELECT id, document_type, side, original_filename, mime_type, size_bytes, uploaded_at
         FROM kyc_documents WHERE kyc_profile_id = ? ORDER BY uploaded_at DESC`,
        [profile.id]
      );
      res.json({
        ...profile,
        documents: docs.rows,
        requirements: evaluateRequirements(docs.rows),
        canEdit: EDITABLE_STATUSES.includes(profile.status),
      });
    })
  );

  const uploadSchema = z.object({
    documentType: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE", "PROOF_OF_ADDRESS", "SELFIE"]),
    side: z.enum(["FRONT", "BACK"]).optional(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().optional(), // informational only; the type is detected from the bytes
    fileBase64: z.string().min(1),
  });

  router.post(
    "/documents",
    asyncHandler(async (req, res) => {
      const body = uploadSchema.parse(req.body);
      const side = TWO_SIDED_DOCUMENTS.includes(body.documentType) ? body.side ?? "FRONT" : null;

      const file = Buffer.from(body.fileBase64, "base64");
      if (file.byteLength === 0) throw new ApiError(400, "The file is empty.");
      if (file.byteLength > MAX_DOCUMENT_BYTES) throw new ApiError(400, "The file is larger than 10 MB.");
      const mimeType = detectDocumentMime(file);
      if (!mimeType) throw new ApiError(400, "Upload a JPG, PNG or PDF file.");

      const profile = await loadProfile(req.user!.sub);
      if (!EDITABLE_STATUSES.includes(profile.status)) {
        throw new ApiError(409, "Your documents are already under review or approved and can't be changed.");
      }

      // A new upload replaces the previous file for the same document and side.
      await query(
        `DELETE FROM kyc_documents WHERE kyc_profile_id = ? AND document_type = ? AND (side <=> ?)`,
        [profile.id, body.documentType, side]
      );
      const documentId = crypto.randomUUID();
      await query(
        `INSERT INTO kyc_documents
           (id, kyc_profile_id, document_type, side, storage_key, original_filename, mime_type, content_encrypted, size_bytes, sha256)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          documentId,
          profile.id,
          body.documentType,
          side,
          `db:${documentId}`,
          sanitizeFilename(body.filename),
          mimeType,
          encryptBuffer(file),
          file.byteLength,
          crypto.createHash("sha256").update(file).digest("hex"),
        ]
      );

      await logAudit({
        actorType: "user",
        actorId: req.user!.sub,
        action: "KYC_DOCUMENT_UPLOADED",
        targetType: "kyc_document",
        targetId: documentId,
        metadata: { documentType: body.documentType, side, sizeBytes: file.byteLength },
      });

      res.status(201).json({ id: documentId, documentType: body.documentType, side, mimeType, sizeBytes: file.byteLength });
    })
  );

  router.delete(
    "/documents/:id",
    asyncHandler(async (req, res) => {
      const profile = await loadProfile(req.user!.sub);
      if (!EDITABLE_STATUSES.includes(profile.status)) {
        throw new ApiError(409, "Your documents are already under review or approved and can't be changed.");
      }
      const result = await query(`DELETE FROM kyc_documents WHERE id = ? AND kyc_profile_id = ?`, [
        req.params.id,
        profile.id,
      ]);
      if (result.rowCount !== 1) throw new ApiError(404, "Document not found");
      res.status(204).send();
    })
  );

  router.post(
    "/submit",
    asyncHandler(async (req, res) => {
      const profile = await loadProfile(req.user!.sub);
      if (!EDITABLE_STATUSES.includes(profile.status)) {
        throw new ApiError(409, "Your documents have already been submitted.");
      }
      const docs = await query(`SELECT document_type, side FROM kyc_documents WHERE kyc_profile_id = ?`, [profile.id]);
      const requirements = evaluateRequirements(docs.rows);
      if (!requirements.complete) {
        const missing = [
          !requirements.identity && "an identity document (both sides for an ID card or driving licence)",
          !requirements.proofOfAddress && "a proof of address",
          !requirements.selfie && "a selfie",
        ].filter(Boolean) as string[];
        const list = missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}` : missing[0];
        throw new ApiError(400, `Add ${list} before submitting.`);
      }

      await query(
        `UPDATE kyc_profiles SET status = 'UNDER_REVIEW', submitted_at = now(), rejection_reason = NULL, updated_at = now()
         WHERE id = ?`,
        [profile.id]
      );
      await query(
        `INSERT INTO notifications (user_id, type, title, body) VALUES (?,'KYC_UPDATE','Documents submitted',?)`,
        [req.user!.sub, "We're reviewing your documents. You'll get a notification when that's done."]
      );
      await logAudit({ actorType: "user", actorId: req.user!.sub, action: "KYC_SUBMITTED", targetType: "kyc_profile", targetId: profile.id });

      res.json({ ok: true, status: "UNDER_REVIEW" });
    })
  );

  return router;
}
