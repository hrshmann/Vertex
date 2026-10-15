"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

type Outcome = "sent" | "unavailable" | null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ emailAvailable: boolean }>("/api/auth/forgot-password", { email });
      setOutcome(res.emailAvailable ? "sent" : "unavailable");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't send the link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (outcome === "sent") {
    return (
      <div>
        <MailCheck className="h-8 w-8 text-accent" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
        <p className="mt-3 text-sm text-muted">
          If <span className="font-medium text-ink">{email}</span> has an account, we've sent it a link to choose a new password. The link
          expires in 30 minutes. Check your spam folder if it hasn't arrived in a few minutes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/login">Back to log in</ButtonLink>
          <Button variant="secondary" onClick={() => setOutcome(null)}>
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  if (outcome === "unavailable") {
    return (
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-3 text-sm text-muted">
          We can't send reset emails right now. Contact our support team from the email address on your account and we'll help you get
          back in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/contact">Contact support</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Back to log in
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">Enter the email you signed up with and we'll send you a link to choose a new password.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && (
          <p role="alert" className="text-xs text-sell">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
