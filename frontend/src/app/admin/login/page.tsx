"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/admin/auth/login", { email, password });
      await refresh();
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
      <form onSubmit={onSubmit} className="w-full max-w-sm vx-surface rounded-2xl p-7">
        <h1 className="text-lg font-semibold mb-1">Vertex Admin</h1>
        <p className="vx-muted text-sm mb-6">Sign in to the admin panel.</p>
        <div className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          />
        </div>
        {error && <div className="mt-3 text-sm text-vx-sell">{error}</div>}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-vx-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-[11px] vx-muted">
          First time? Create a super-admin with:
          <code className="block mt-1 vx-surface-2 rounded px-2 py-1">
            ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run seed:admin
          </code>
        </p>
      </form>
    </div>
  );
}
