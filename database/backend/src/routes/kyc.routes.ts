import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { query } from "./mariaDbQuery";
import { ApiError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

/**
 * KYC document upload. Accepts a base64-encoded file in JSON for MVP simplicity; swap for
 * multipart/form-data + direct-to-object-storage upload (S3/GCS with signed URLs) in production
 * so large files never transit the API process. storage_key here is a local path placeholder —
 * point it at private, access-controlled object storage before going live, never a public bucket.
 */
export function kycRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const profile = await query(`SELECT * FROM kyc_profiles WHERE user_id = ?`, [req.user!.sub]);
      if (!profile.rows[0]) throw new ApiError(404, "KYC profile not found");
      const docs = await query(
        `SELECT id, document_type, original_filename, mime_type, uploaded_at FROM kyc_documents WHERE kyc_profile_id = ? ORDER BY uploaded_at DESC`,
        [profile.rows[0].id]
      );
      res.json({ ...profile.rows[0], documents: docs.rows });
    })
  );

  const uploadSchema = z.object({
    documentType: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE", "PROOF_OF_ADDRESS", "SELFIE", "OTHER"]),
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    fileBase64: z.string().min(1),
  });

  router.post(
    "/documents",
    asyncHandler(async (req, res) => {
      const body = uploadSchema.parse(req.body);
      const allowedMime = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedMime.includes(body.mimeType)) {
        throw new ApiError(400, `Unsupported file type: ${body.mimeType}`);
      }
      const buffer = Buffer.from(body.fileBase64, "base64");
      if (buffer.byteLength > 10 * 1024 * 1024) throw new ApiError(400, "File exceeds 10MB limit");

      const profileRes = await query(`SELECT id, status FROM kyc_profiles WHERE user_id = ?`, [
        req.user!.sub,
      ]);
      if (!profileRes.rows[0]) throw new ApiError(404, "KYC profile not found");
      const profile = profileRes.rows[0];

      // Placeholder storage key — in production this is the object-storage key returned by
      // the upload, under a private bucket/prefix with per-user access control.
      const storageKey = `kyc/${req.user!.sub}/${crypto.randomUUID()}-${body.filename}`;

      await query(
        `INSERT INTO kyc_documents (kyc_profile_id, document_type, storage_key, original_filename, mime_type)
         VALUES (?,?,?,?,?)`,
        [profile.id, body.documentType, storageKey, body.filename, body.mimeType]
      );

      if (profile.status === "PENDING") {
        await query(`UPDATE kyc_profiles SET status = 'UNDER_REVIEW', updated_at = now() WHERE id = ?`, [
          profile.id,
        ]);
      }

      await logAudit({
        actorType: "user",
        actorId: req.user!.sub,
        action: "KYC_DOCUMENT_UPLOADED",
        metadata: { documentType: body.documentType },
      });

      res.status(201).json({ ok: true, status: "UNDER_REVIEW" });
    })
  );

  return router;
}
