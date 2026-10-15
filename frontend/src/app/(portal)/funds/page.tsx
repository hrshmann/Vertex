"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Bitcoin, CreditCard, Landmark, Lock, ReceiptText } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useAccount } from "@/lib/useAccount";
import { useDeposits, useKyc, useWithdrawals } from "@/lib/usePortalData";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/Field";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Method = "BANK_TRANSFER" | "CARD" | "CRYPTO";

const METHODS: { value: Method; label: string; icon: typeof Landmark; destination: { label: string; placeholder: string } }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: Landmark, destination: { label: "IBAN or account number", placeholder: "AE07 0331 2345 6789 0123 456" } },
  { value: "CARD", label: "Card", icon: CreditCard, destination: { label: "Card's last 4 digits", placeholder: "4242" } },
  { value: "CRYPTO", label: "Crypto (USDT)", icon: Bitcoin, destination: { label: "Wallet address", placeholder: "0x…" } },
];

const PRESETS = [500, 1000, 5000, 10000];

export default function FundsPage() {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const { deposits, reload: reloadDeposits } = useDeposits();
  const { withdrawals, reload: reloadWithdrawals } = useWithdrawals();
  const { account, reload: reloadAccount } = useAccount("DEMO");

  const history = useMemo(() => {
    if (!deposits || !withdrawals) return null;
    return [
      ...deposits.map((d) => ({ ...d, kind: "Deposit" as const })),
      ...withdrawals.map((w) => ({ ...w, kind: "Withdrawal" as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [deposits, withdrawals]);

  return (
    <div>
      <PageTitle title="Funds" description="Add money to your account or withdraw it. On the demo account, deposits are virtual and added instantly." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel
          title={<Tabs label="Funds action" value={tab} onChange={setTab} tabs={[{ value: "deposit", label: "Deposit" }, { value: "withdraw", label: "Withdraw" }]} />}
        >
          {tab === "deposit" ? (
            <DepositForm
              onDone={() => {
                void reloadDeposits();
                reloadAccount();
              }}
            />
          ) : (
            <WithdrawForm available={account?.freeMargin ?? null} onDone={() => void reloadWithdrawals()} />
          )}
        </Panel>

        <Panel title="Balance">
          {account ? (
            <dl className="space-y-3 text-sm">
              <Row label="Balance" value={formatMoney(account.balance)} />
              <Row label="Equity" value={formatMoney(account.equity)} />
              <Row label="Available to withdraw" value={formatMoney(Math.max(0, account.freeMargin))} strong />
            </dl>
          ) : (
            <Skeleton className="h-20" />
          )}
          <p className="mt-4 text-2xs text-muted">Money used as margin for open trades can't be withdrawn until those trades close.</p>
        </Panel>
      </div>

      <Panel title="Deposits and withdrawals" className="mt-6" bodyClassName="">
        {history === null ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon={<ReceiptText className="h-5 w-5" />} title="No deposits or withdrawals yet" body="Your first deposit will show here with its status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Method</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={`${h.kind}-${h.id}`} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-medium">{h.kind}</td>
                    <td className="px-3 py-3 text-muted">{METHODS.find((m) => m.value === h.method)?.label ?? h.method}</td>
                    <td className={clsx("px-3 py-3 text-right font-medium vx-tabular", h.kind === "Deposit" ? "text-buy" : "text-ink")}>
                      {h.kind === "Deposit" ? "+" : "−"}
                      {formatMoney(h.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={h.status} labels={{ PENDING: "Awaiting approval", APPROVED: "Approved" }} />
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDateTime(h.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={clsx("vx-tabular", strong ? "font-semibold text-ink" : "text-ink")}>{value}</dd>
    </div>
  );
}

function MethodPicker({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium">Method</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {METHODS.map(({ value: v, label, icon: Icon }) => (
          <label
            key={v}
            className={clsx(
              "flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
              value === v ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:border-accent/50"
            )}
          >
            <input type="radio" name="method" className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            <Icon className={clsx("h-4 w-4", value === v ? "text-accent" : "")} aria-hidden />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DepositForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState<Method>("BANK_TRANSFER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 10 && value <= 1_000_000;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Enter an amount between $10 and $1,000,000.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/deposits", { mode: "DEMO", amount: value, currency: "USD", method });
      toast(`Deposit added: ${formatMoney(value)}`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "The deposit didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <TextField
          label="Amount"
          type="number"
          inputMode="decimal"
          min={10}
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="USD"
          error={error}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={clsx(
                "h-8 rounded-full border px-3 text-xs font-medium vx-tabular transition-colors",
                value === p ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
              )}
            >
              {formatMoney(p).replace(".00", "")}
            </button>
          ))}
        </div>
      </div>
      <MethodPicker value={method} onChange={setMethod} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-xs text-muted">Demo deposits use virtual money and are added straight away.</p>
        <Button type="submit" loading={busy} disabled={!valid}>
          Deposit {valid ? formatMoney(value) : ""}
        </Button>
      </div>
    </form>
  );
}

function WithdrawForm({ available, onDone }: { available: number | null; onDone: () => void }) {
  const toast = useToast();
  const { kyc } = useKyc();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("BANK_TRANSFER");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!kyc) return <Skeleton className="h-40" />;
  if (kyc.status !== "APPROVED") {
    return (
      <EmptyState
        icon={<Lock className="h-5 w-5" />}
        title="Verify your identity to withdraw"
        body={
          kyc.status === "UNDER_REVIEW"
            ? "We're reviewing your documents. Withdrawals open as soon as you're verified."
            : "We confirm who you are before sending money anywhere. It takes about 3 minutes."
        }
        action={kyc.status !== "UNDER_REVIEW" && <ButtonLink href="/kyc">Start verification</ButtonLink>}
      />
    );
  }

  const max = Math.max(0, Math.floor((available ?? 0) * 100) / 100);
  const value = Number(amount);
  const dest = METHODS.find((m) => m.value === method)!.destination;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(value) || value <= 0) return setError("Enter the amount to withdraw.");
    if (value > max) return setError(`You can withdraw up to ${formatMoney(max)}.`);
    if (destination.trim().length < 3) return setError(null);
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/withdrawals", { mode: "DEMO", amount: value, currency: "USD", method, destination: destination.trim() });
      toast("Withdrawal requested. We'll review it within one business day.");
      setAmount("");
      setDestination("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "The request didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <TextField
        label="Amount"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        suffix="USD"
        error={error}
        hint={`Available: ${formatMoney(max)}`}
        trailing={
          <button type="button" onClick={() => setAmount(String(max))} className="text-2xs font-medium text-accent hover:underline">
            Withdraw all
          </button>
        }
      />
      <MethodPicker value={method} onChange={setMethod} />
      <TextField
        label={dest.label}
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder={dest.placeholder}
        required
        minLength={3}
        hint="Withdrawals can only go to an account in your own name."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-xs text-muted">Each request is reviewed by our team before it's paid out.</p>
        <Button type="submit" loading={busy} disabled={!amount || !destination}>
          Request withdrawal
        </Button>
      </div>
      <Notice tone="accent" title="Demo account">
        Approved demo withdrawals reduce your virtual balance; no real money moves.
      </Notice>
    </form>
  );
}
