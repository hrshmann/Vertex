"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/useAccount";
import { api, ApiRequestError } from "@/lib/api";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string | null;
  created_at: string;
}

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { account, reload } = useAccount("DEMO");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("1000");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/account");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.get<Transaction[]>("/api/account/transactions?mode=DEMO").then(setTransactions).catch(() => {});
    api.get<{ status: string }>("/api/kyc").then((k) => setKycStatus(k.status)).catch(() => {});
  }, [user]);

  async function deposit() {
    setMessage(null);
    try {
      await api.post("/api/deposits", { mode: "DEMO", amount: Number(depositAmount), currency: "USD", method: "BANK_TRANSFER" });
      setMessage("Demo deposit completed.");
      reload();
      api.get<Transaction[]>("/api/account/transactions?mode=DEMO").then(setTransactions);
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : "Deposit failed");
    }
  }

  async function withdraw() {
    setMessage(null);
    try {
      await api.post("/api/withdrawals", {
        mode: "DEMO",
        amount: Number(withdrawAmount),
        currency: "USD",
        method: "BANK_TRANSFER",
        destination: withdrawDestination,
      });
      setMessage("Withdrawal request submitted — pending approval.");
      setWithdrawAmount("");
      setWithdrawDestination("");
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : "Withdrawal failed");
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-semibold mb-1">Account</h1>
      <p className="vx-muted text-sm mb-8">{user.first_name} {user.last_name} · {user.email}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Balance" value={account ? `$${account.balance.toFixed(2)}` : "—"} />
        <Stat label="Equity" value={account ? `$${account.equity.toFixed(2)}` : "—"} />
        <Stat label="Free Margin" value={account ? `$${account.freeMargin.toFixed(2)}` : "—"} />
        <Stat label="KYC Status" value={kycStatus ?? "—"} link={{ href: "/kyc", label: "Manage" }} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="vx-surface rounded-xl p-5">
          <h2 className="font-medium mb-3">Deposit (demo)</h2>
          <p className="text-xs vx-muted mb-3">
            Demo deposits credit play money instantly. Live deposits require a connected payment
            provider and only complete once that provider confirms the payment.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
            />
            <button onClick={deposit} className="rounded-lg bg-vx-accent px-4 py-2 text-sm font-medium text-white">
              Deposit
            </button>
          </div>
        </div>

        <div className="vx-surface rounded-xl p-5">
          <h2 className="font-medium mb-3">Withdraw</h2>
          <p className="text-xs vx-muted mb-3">Requests are recorded PENDING until an admin approves them.</p>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
            />
            <input
              placeholder="Destination (IBAN / wallet address / card)"
              value={withdrawDestination}
              onChange={(e) => setWithdrawDestination(e.target.value)}
              className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
            />
            <button onClick={withdraw} className="rounded-lg vx-surface-2 px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--border))]">
              Request withdrawal
            </button>
          </div>
        </div>
      </div>

      {message && <div className="mb-6 text-sm text-vx-accent">{message}</div>}

      <h2 className="font-medium mb-3">Recent transactions</h2>
      <div className="vx-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="vx-surface-2 text-xs uppercase vx-muted">
            <tr>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-left px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {transactions.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 vx-muted">No transactions yet</td></tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2">{t.type}</td>
                <td className={`px-4 py-2 text-right vx-tabular ${Number(t.amount) >= 0 ? "text-vx-buy" : "text-vx-sell"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}{Number(t.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2 vx-muted">{t.description}</td>
                <td className="px-4 py-2 vx-muted">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/terminal" className="text-vx-accent text-sm hover:underline">← Back to trading terminal</Link>
      </div>
    </div>
  );
}

function Stat({ label, value, link }: { label: string; value: string; link?: { href: string; label: string } }) {
  return (
    <div className="vx-surface rounded-xl p-4">
      <div className="text-xs vx-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium vx-tabular">{value}</span>
        {link && (
          <Link href={link.href} className="text-xs text-vx-accent hover:underline">
            {link.label}
          </Link>
        )}
      </div>
    </div>
  );
}
