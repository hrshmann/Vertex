"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { isStrongPassword, PasswordRules } from "@/components/ui/PasswordRules";

function guessCountry() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && COUNTRIES.some((c) => c.code === region) ? region : "";
  } catch {
    return "";
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "", country: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((f) => (f.country ? f : { ...f, country: guessCountry() }));
  }, []);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  const strong = isStrongPassword(form.password);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong || !agreed) return;
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim() || undefined,
        country: form.country || undefined,
        password: form.password,
        confirmPassword: form.password,
      });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't create your account. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Open a free account</h1>
      <p className="mt-1 text-sm text-muted">It takes a minute. You'll verify your identity next.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="First name" required autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
          <TextField label="Last name" required autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
        </div>
        <TextField label="Email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Country" value={form.country} onChange={set("country")} required>
            <option value="" disabled>
              Select
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextField label="Mobile" type="tel" optional autoComplete="tel" value={form.mobile} onChange={set("mobile")} />
        </div>
        <div>
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
          <PasswordRules password={form.password} />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-[rgb(var(--accent))]"
          />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" target="_blank" className="font-medium text-accent hover:underline">
              terms and conditions
            </Link>{" "}
            and have read the{" "}
            <Link href="/legal/risk-disclosure" target="_blank" className="font-medium text-accent hover:underline">
              risk disclosure
            </Link>
            .
          </span>
        </label>

        {error && (
          <p role="alert" className="text-xs text-sell">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!strong || !agreed}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
