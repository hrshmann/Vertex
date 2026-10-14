"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      await refresh();
      router.push("/terminal");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-semibold mb-1">Log in</h1>
      <p className="vx-muted text-sm mb-8">Welcome back to Vertex Trading.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm vx-muted mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm vx-muted">Password</label>
            <Link href="/forgot-password" className="text-xs text-vx-accent hover:underline">Forgot password?</Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          />
        </div>

        {error && <div className="text-sm text-vx-sell">{error}</div>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-vx-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-vx-accent/90 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm vx-muted">
        New here? <Link href="/register" className="text-vx-accent hover:underline">Open an account</Link>
      </p>
    </div>
  );
}
