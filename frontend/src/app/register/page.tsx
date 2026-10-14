"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const COUNTRIES = ["US", "GB", "AE", "IN", "PK", "CA", "AU", "DE", "FR", "SG"];

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    country: "US",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      await refresh();
      router.push("/terminal");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold mb-1">Open an account</h1>
      <p className="vx-muted text-sm mb-8">Start with a free demo account — no deposit required.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <Field label="Mobile" type="tel" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} />
        <div>
          <label className="block text-sm vx-muted mb-1.5">Country</label>
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required hint="At least 10 characters, with upper, lower case and a number." />
        <Field label="Confirm password" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} required />

        {error && <div className="text-sm text-vx-sell">{error}</div>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-vx-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-vx-accent/90 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm vx-muted">
        Already have an account? <Link href="/login" className="text-vx-accent hover:underline">Log in</Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm vx-muted mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
      />
      {hint && <p className="mt-1 text-xs vx-muted">{hint}</p>}
    </div>
  );
}
