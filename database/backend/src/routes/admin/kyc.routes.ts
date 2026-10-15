import { Router } from "express";
import { z } from "zod";
import { query } from "../mariaDbQuery";
import { requireAdmin, requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/errorHandler";
import { logAudit } from "../../utils/audit";
import { decryptBuffer } from "../../utils/crypto";
import { evaluateRequirements } from "../../services/kyc/kycRules";
import { isMailConfigured } from "../../services/mail/mailer";
import { kycDecisionEmail } from "../../services/mail/templates";
import { env } from "../../config/env";

const STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"] as const;

/** KYC review queue and document viewer. Viewing documents is limited to compliance staff. */
export function adminKycRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const status = z.enum(STATUSES).default("UNDER_REVIEW").parse(req.query.status ?? undefined);
      const result = await query(
        `SELECT k.user_id, k.status, k.submitted_at, k.reviewed_at, k.updated_at,
                u.first_name, u.last_name, u.email, u.country,
                (SELECT COUNT(*) FROM kyc_documents d WHERE d.kyc_profile_id = k.id) AS document_count
         FROM kyc_profiles k JOIN users u ON u.id = k.user_id
         WHERE k.status = ?
         ORDER BY COALESCE(k.submitted_at, k.updated_at) ASC
         LIMIT 200`,
        [status]
      );
      const counts = await query(`SELECT status, COUNT(*) AS count FROM kyc_profiles GROUP BY status`);
      res.json({
        status,
        items: result.rows.map((r) => ({ ...r, document_count: Number(r.document_count) })),
        counts: Object.fromEntries(counts.rows.map((r) => [r.status, Number(r.count)])),
      });
    })
  );

  router.get(
    "/:userId",
    asyncHandler(async (req, res) => {
      const profile = await query(
        `SELECT k.id, k.user_id, k.status, k.submitted_at, k.reviewed_at, k.rejection_reason,
                u.first_name, u.last_name, u.email, u.mobile, u.country, u.created_at AS user_created_at
         FROM kyc_profiles k JOIN users u ON u.id = k.user_id WHERE k.user_id = ?`,
        [req.params.userId]
      );
      if (!profile.rows[0]) throw new ApiError(404, "KYC profile not found");
      const docs = await query(
        `SELECT id, document_type, side, original_filename, mime_type, size_bytes, uploaded_at,
                content_encrypted IS NOT NULL AS has_file
         FROM kyc_documents WHERE kyc_profile_id = ? ORDER BY document_type, side`,
        [profile.rows[0].id]
      );
      const emails = await query(
        `SELECT kind, to_address, subject, status, error, created_at FROM email_log
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
        [req.params.userId]
      );
      res.json({
        ...profile.rows[0],
        documents: docs.rows.map((d) => ({ ...d, has_file: Boolean(Number(d.has_file)) })),
        requirements: evaluateRequirements(docs.rows),
        emails: emails.rows,
        mailConfigured: isMailConfigured(),
      });
    })
  );

  // The prewritten email for a decision, for the admin to check and edit before sending.
  router.get(
    "/:userId/email-draft",
    asyncHandler(async (req, res) => {
      const decision = z.enum(["APPROVED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED"]).parse(req.query.decision);
      const reason = z.string().max(500).optional().parse(req.query.reason ?? undefined);
      const user = await query(`SELECT first_name, email FROM users WHERE id = ?`, [req.params.userId]);
      if (!user.rows[0]) throw new ApiError(404, "User not found");
      const draft = kycDecisionEmail(decision, {
        firstName: user.rows[0].first_name,
        email: user.rows[0].email,
        appUrl: env.appUrl,
        reason,
      });
      res.json({ to: user.rows[0].email, ...draft, mailConfigured: isMailConfigured() });
    })
  );

  router.get(
    "/documents/:id/file",
    requireRole("SUPER_ADMIN", "COMPLIANCE"),
    asyncHandler(async (req, res) => {
      const result = await query(
        `SELECT d.mime_type, d.original_filename, d.content_encrypted, k.user_id
         FROM kyc_documents d JOIN kyc_profiles k ON k.id = d.kyc_profile_id WHERE d.id = ?`,
        [req.params.id]
      );
      const doc = result.rows[0];
      if (!doc) throw new ApiError(404, "Document not found");
      if (!doc.content_encrypted) throw new ApiError(410, "This document was uploaded before files were stored. Ask the user to upload it again.");

      const file = decryptBuffer(doc.content_encrypted as Buffer);
      await logAudit({
        actorType: "admin",
        actorId: req.admin!.id,
        action: "KYC_DOCUMENT_VIEWED",
        targetType: "kyc_document",
        targetId: req.params.id,
        metadata: { userId: doc.user_id },
      });

      res.setHeader("Content-Type", doc.mime_type);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(file);
    })
  );

  return router;
}
