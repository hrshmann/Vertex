import { describe, expect, it, vi } from "vitest";

vi.mock("../../config/env", () => ({ env: { appUrl: "https://vertexfxs.com", smtp: {} } }));

import { kycDecisionEmail, passwordResetEmail, welcomeEmail } from "./templates";
import { renderHtml } from "./mailer";

const ctx = { firstName: "Asha", email: "asha@example.com", appUrl: "https://vertexfxs.com" };

describe("client email templates", () => {
  it("congratulates on approval and gives the login ID, never a password", () => {
    const mail = kycDecisionEmail("APPROVED", ctx);
    expect(mail.subject).toMatch(/Congratulations/);
    expect(mail.text).toContain("Dear Asha,");
    expect(mail.text).toContain("Login ID: asha@example.com");
    expect(mail.text).toContain("https://vertexfxs.com/login");
    expect(mail.text).toContain("https://vertexfxs.com/forgot-password");
  });

  it("asks for more information with the admin's reason", () => {
    const mail = kycDecisionEmail("ADDITIONAL_INFORMATION_REQUIRED", { ...ctx, reason: "Your bill is older than 3 months." });
    expect(mail.subject).toMatch(/more information/);
    expect(mail.text).toContain("Unfortunately");
    expect(mail.text).toContain("Your bill is older than 3 months.");
    expect(mail.text).toContain("https://vertexfxs.com/kyc");
  });

  it("apologises on decline and leaves a visible gap when no reason is written yet", () => {
    const mail = kycDecisionEmail("REJECTED", ctx);
    expect(mail.text).toContain("We're sorry");
    expect(mail.text).toContain("[write what the client needs to do]");
  });

  it("falls back to a neutral greeting without a first name", () => {
    expect(kycDecisionEmail("APPROVED", { ...ctx, firstName: " " }).text).toContain("Dear there,");
  });

  it("welcomes new clients with their login ID and the verification link", () => {
    const mail = welcomeEmail("Asha", "asha@example.com", "https://vertexfxs.com");
    expect(mail.text).toContain("Login ID: asha@example.com");
    expect(mail.text).toContain("https://vertexfxs.com/kyc");
  });

  it("puts the reset link and its expiry in the reset email", () => {
    const mail = passwordResetEmail("Asha", "https://vertexfxs.com/reset-password?token=abc", 30);
    expect(mail.text).toContain("https://vertexfxs.com/reset-password?token=abc");
    expect(mail.text).toContain("30 minutes");
  });
});

describe("renderHtml", () => {
  it("escapes text, keeps paragraphs and line breaks, and links URLs", () => {
    const html = renderHtml("Hi", "Hello <b>there</b> & co\nline two\n\nSee https://vertexfxs.com/kyc");
    expect(html).toContain("Hello &lt;b&gt;there&lt;/b&gt; &amp; co<br>line two");
    expect(html).toContain('<a href="https://vertexfxs.com/kyc"');
    expect(html.match(/<p /g)).toHaveLength(2);
  });
});
