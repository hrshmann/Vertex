import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env";

export interface OutgoingMail {
  to: string;
  subject: string;
  /** Plain text; the HTML version is built from it, so what the admin edits is what is sent. */
  text: string;
}

export type MailResult = { sent: true; messageId: string } | { sent: false; reason: string };

let transporter: Transporter | null = null;

export function isMailConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

/** Sends one email. Never throws: a mail failure must not undo the decision that triggered it. */
export async function sendMail(mail: OutgoingMail): Promise<MailResult> {
  if (!isMailConfigured()) return { sent: false, reason: "Email sending isn't set up on the server." };
  try {
    const info = await getTransporter().sendMail({
      from: { name: env.mailFromName, address: env.mailFrom || env.smtp.user },
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: renderHtml(mail.subject, mail.text),
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mail] send failed:", err instanceof Error ? err.message : err);
    return { sent: false, reason: "The mail server didn't accept the email." };
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text to a simple, email-client-safe HTML layout: paragraphs, line breaks, live links. */
export function renderHtml(subject: string, text: string) {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) =>
      escapeHtml(p)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2f6bed">$1</a>')
        .replace(/\n/g, "<br>")
    )
    .map((p) => `<p style="margin:0 0 16px">${p}</p>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f3f5f9;font-family:Helvetica,Arial,sans-serif;color:#1b2333">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e6ef;border-radius:12px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e1e6ef;font-size:18px;font-weight:bold">Vertex Trading</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">${paragraphs}</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #e1e6ef;font-size:12px;color:#6b7588">You're receiving this because you have an account at ${escapeHtml(env.appUrl)}.</td></tr>
</table></td></tr></table></body></html>`;
}
