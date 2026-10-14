"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Withdrawal {
  id: string;
  amount: string;
  currency: string;
  method: string;
  destination: string;
  status: string;
  created_at: string;
  user_id: string;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  function load() {
    api.get<Withdrawal[]>("/api/admin/withdrawals?status=PENDING").then(setWithdrawals);
  }
  useEffect(load, []);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    await api.post(`/api/admin/withdrawals/${id}/decision`, { status });
    load();
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">Pending Withdrawals</h1>
      <div className="vx-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="vx-surface-2 text-xs uppercase vx-muted">
            <tr>
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Method</th>
              <th className="text-left px-4 py-2">Destination</th>
              <th className="text-left px-4 py-2">Requested</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {withdrawals.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 vx-muted">No pending withdrawals</td></tr>
            )}
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-2 vx-tabular">{w.amount} {w.currency}</td>
                <td className="px-4 py-2">{w.method}</td>
                <td className="px-4 py-2 vx-muted">{w.destination}</td>
                <td className="px-4 py-2 vx-muted">{new Date(w.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button onClick={() => decide(w.id, "APPROVED")} className="text-vx-buy hover:underline">Approve</button>
                  <button onClick={() => decide(w.id, "REJECTED")} className="text-vx-sell hover:underline">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
