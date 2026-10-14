"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  pendingKyc: number;
  tradingAccounts: number;
  totalDeposits: number;
  pendingWithdrawals: number;
  openPositions: number;
  systemStatus: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/admin/dashboard/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Users" value={stats?.totalUsers} />
        <Card label="Verified Users" value={stats?.verifiedUsers} />
        <Card label="Pending KYC" value={stats?.pendingKyc} warn={!!stats?.pendingKyc} />
        <Card label="Trading Accounts" value={stats?.tradingAccounts} />
        <Card label="Total Deposits" value={stats ? `$${stats.totalDeposits.toLocaleString()}` : undefined} />
        <Card label="Pending Withdrawals" value={stats?.pendingWithdrawals} warn={!!stats?.pendingWithdrawals} />
        <Card label="Open Positions" value={stats?.openPositions} />
        <Card label="System Status" value={stats?.systemStatus} ok />
      </div>
    </div>
  );
}

function Card({ label, value, warn, ok }: { label: string; value?: string | number; warn?: boolean; ok?: boolean }) {
  return (
    <div className="vx-surface rounded-xl p-5">
      <div className="text-xs vx-muted uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-semibold vx-tabular ${warn ? "text-vx-warn" : ok ? "text-vx-buy" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
