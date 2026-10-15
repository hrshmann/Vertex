import { query } from "../../routes/mariaDbQuery";
import { MailResult, OutgoingMail, sendMail } from "./mailer";

/** Sends an email to a client and records the attempt in email_log. */
export async function sendClientMail(
  mail: OutgoingMail & { userId: string | null; kind: string; adminId?: string }
): Promise<MailResult> {
  const result = await sendMail(mail);
  await query(
    `INSERT INTO email_log (user_id, kind, to_address, subject, status, error, sent_by_admin) VALUES (?,?,?,?,?,?,?)`,
    [
      mail.userId,
      mail.kind,
      mail.to,
      mail.subject.slice(0, 200),
      result.sent ? "SENT" : "FAILED",
      result.sent ? null : result.reason.slice(0, 255),
      mail.adminId ?? null,
    ]
  ).catch((err) => console.error("[mail] couldn't record email:", err instanceof Error ? err.message : err));
  return result;
}
