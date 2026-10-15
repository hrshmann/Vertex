"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { isStrongPassword, PasswordRules } from "@/components/ui/PasswordRules";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) return setError("Your new password doesn't meet the requirements.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't reset your password. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-xl font-semibold">This link is incomplete</h1>
        <p className="mt-3 text-sm text-muted">Open the link from your email again, or request a new one.</p>
        <div className="mt-8">
          <ButtonLink href="/forgot-password">Request a new link</ButtonLink>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <CircleCheck className="h-8 w-8 text-buy" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">Password changed</h1>
        <p className="mt-3 text-sm text-muted">You can now log in with your new password. For your security, all your devices were signed out.</p>
        <div className="mt-8">
          <ButtonLink href="/login">Log in</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">Pick one you don't use on other sites.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <TextField
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
          <PasswordRules password={password} />
        </div>
        <TextField
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p role="alert" className="text-xs text-sell">
            {error}
          </p>
        )}
        {error?.includes("expired") && (
          <Link href="/forgot-password" className="block text-xs font-medium text-accent hover:underline">
            Request a new link
          </Link>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Change password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
