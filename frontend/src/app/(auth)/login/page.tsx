"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { safeNext } from "@/lib/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get("next"));

  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      await refresh();
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't log in. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-muted">Welcome back.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          trailing={
            <Link href="/forgot-password" className="text-2xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          }
        />
        {error && (
          <p role="alert" className="text-xs text-sell">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New to Vertex?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Open a free account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
