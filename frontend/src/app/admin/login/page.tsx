"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

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
      setError(err instanceof ApiRequestError ? err.message : "Couldn't log in. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-panel border border-line bg-surface p-7">
        <ShieldCheck className="h-7 w-7 text-accent" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold">Vertex staff log in</h1>
        <p className="mt-1 text-sm text-muted">For the Vertex Trading team only.</p>
        <div className="mt-6 space-y-4">
          <TextField label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs text-sell">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-5 w-full" loading={loading}>
          Log in
        </Button>
      </form>
    </div>
  );
}
