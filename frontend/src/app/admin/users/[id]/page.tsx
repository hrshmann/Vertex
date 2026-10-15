"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/ui/Badge";

interface UserDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
  country: string | null;
  is_suspended: boolean;
  kyc: { status: string } | null;
  tradingAccounts: { id: string; mode: string; tier: string; currency: string }[];
  loginHistory: { ip_address: string | null; created_at: string }[];
}


export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);

  function load() {
    api.get<UserDetail>(`/api/admin/users/${params.id}`).then(setUser);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function toggleSuspend() {
    if (!user) return;
    await api.post(`/api/admin/users/${user.id}/${user.is_suspended ? "activate" : "suspend"}`);
    load();
  }

  if (!user) return <div className="p-8 vx-muted">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">{user.first_name} {user.last_name}</h1>
      <p className="vx-muted text-sm mb-6">{user.email} · {user.mobile ?? "no mobile"} · {user.country ?? "—"}</p>

      <div className="vx-surface rounded-xl p-5 mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs vx-muted uppercase tracking-wide mb-1">Account status</div>
          <div className={user.is_suspended ? "text-vx-sell" : "text-vx-buy"}>
            {user.is_suspended ? "Suspended" : "Active"}
          </div>
        </div>
        <button onClick={toggleSuspend} className="rounded-lg vx-surface-2 px-4 py-2 text-sm hover:bg-[rgb(var(--border))]">
          {user.is_suspended ? "Activate" : "Suspend"}
        </button>
      </div>

      <div className="vx-surface rounded-xl p-5 mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs vx-muted mb-2">Verification</div>
          {user.kyc ? <StatusBadge status={user.kyc.status} /> : <span className="text-sm vx-muted">No profile</span>}
        </div>
        <Link href={`/admin/kyc/${user.id}`} className="text-sm font-medium text-accent hover:underline">
          Review documents
        </Link>
      </div>

      <div className="vx-surface rounded-xl p-5 mb-5">
        <div className="text-xs vx-muted uppercase tracking-wide mb-2">Trading accounts</div>
        {user.tradingAccounts.map((a) => (
          <div key={a.id} className="text-sm py-1">{a.mode} · {a.tier} · {a.currency}</div>
        ))}
      </div>

      <div className="vx-surface rounded-xl p-5">
        <div className="text-xs vx-muted uppercase tracking-wide mb-2">Recent logins</div>
        {user.loginHistory.map((l, i) => (
          <div key={i} className="text-sm vx-muted py-1">
            {l.ip_address ?? "unknown IP"} — {new Date(l.created_at).toLocaleString()}
          </div>
        ))}
        {user.loginHistory.length === 0 && <div className="text-sm vx-muted">No login history yet.</div>}
      </div>
    </div>
  );
}
