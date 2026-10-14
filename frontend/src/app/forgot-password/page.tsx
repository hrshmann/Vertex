"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-semibold mb-1">Reset your password</h1>
      <p className="vx-muted text-sm mb-8">We'll send a reset link if an account exists for that email.</p>

      {sent ? (
        <div className="vx-surface rounded-xl p-5 text-sm">
          If that email exists, a reset link has been sent.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post("/api/auth/forgot-password", { email });
            setSent(true);
          }}
          className="space-y-4"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
          />
          <button className="w-full rounded-lg bg-vx-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-vx-accent/90">
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
