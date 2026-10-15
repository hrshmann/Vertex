/**
 * Prewritten client emails. Admins see the result as an editable draft before it's sent, so
 * templates only produce plain text from facts the system knows.
 */

export type KycDecision = "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

export interface KycEmailContext {
  firstName: string;
  email: string;
  appUrl: string;
  reason?: string | null;
}

export interface EmailDraft {
  subject: string;
  text: string;
}

const signOff = "Kind regards,\nThe Vertex Trading compliance team";

export function kycDecisionEmail(decision: KycDecision, ctx: KycEmailContext): EmailDraft {
  const name = ctx.firstName.trim() || "there";
  const reason = ctx.reason?.trim() || "[write what the client needs to do]";

  switch (decision) {
    case "APPROVED":
      return {
        subject: "Congratulations, your Vertex Trading account is verified",
        text: [
          `Dear ${name},`,
          "Congratulations! We've reviewed your documents and your identity is now verified. Your account is fully active.",
          `Your login details:\nLogin ID: ${ctx.email}\nPassword: the password you chose when you signed up\nLog in: ${ctx.appUrl}/login`,
          `For your security we never send passwords by email. If you've forgotten yours, set a new one here: ${ctx.appUrl}/forgot-password`,
          "Welcome aboard.",
          signOff,
        ].join("\n\n"),
      };
    case "ADDITIONAL_INFORMATION_REQUIRED":
      return {
        subject: "We need a little more information to verify your account",
        text: [
          `Dear ${name},`,
          "Thank you for submitting your documents. Unfortunately we can't complete your verification yet, because we need a little more information:",
          reason,
          `Please log in, update your documents and submit them again: ${ctx.appUrl}/kyc`,
          "Once you resubmit, we'll review them as quickly as possible. If you have any questions, just reply to this email.",
          signOff,
        ].join("\n\n"),
      };
    case "REJECTED":
      return {
        subject: "Your Vertex Trading verification was not approved",
        text: [
          `Dear ${name},`,
          "Thank you for applying. We're sorry, but we weren't able to verify your identity with the documents provided, for this reason:",
          reason,
          `You can upload new documents and try again here: ${ctx.appUrl}/kyc`,
          "If you think this is a mistake or have any questions, just reply to this email.",
          signOff,
        ].join("\n\n"),
      };
  }
}

export function welcomeEmail(firstName: string, email: string, appUrl: string): EmailDraft {
  return {
    subject: "Welcome to Vertex Trading",
    text: [
      `Dear ${firstName.trim() || "there"},`,
      "Welcome to Vertex Trading. Your account is open.",
      `You can follow live forex and crypto prices and charts any time: ${appUrl}/markets`,
      `Your login details:\nLogin ID: ${email}\nPassword: the password you chose when you signed up\nLog in: ${appUrl}/login`,
      `Next step: verify your identity to complete your account. It takes about five minutes: ${appUrl}/kyc`,
      "The Vertex Trading team",
    ].join("\n\n"),
  };
}

export function passwordResetEmail(firstName: string, link: string, minutes: number): EmailDraft {
  return {
    subject: "Reset your Vertex Trading password",
    text: [
      `Dear ${firstName.trim() || "there"},`,
      `We received a request to reset your password. Use this link to choose a new one. It works once and expires in ${minutes} minutes:`,
      link,
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
      "The Vertex Trading team",
    ].join("\n\n"),
  };
}
