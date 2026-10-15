"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";

type Status = "UNDER_REVIEW" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED" | "APPROVED" | "PENDING";

interface QueueItem {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string | null;
  submitted_at: string | null;
  updated_at: string;
  document_count: number;
}

const TABS: { value: Status; label: string }[] = [
  { value: "UNDER_REVIEW", label: "To review" },
  { value: "ADDITIONAL_INFORMATION_REQUIRED", label: "Waiting on user" },
  { value: "REJECTED", label: "Declined" },
  { value: "APPROVED", label: "Verified" },
  { value: "PENDING", label: "Not submitted" },
];

export default function AdminKycQueuePage() {
  const [status, setStatus] = useState<Status>("UNDER_REVIEW");
  const [data, setData] = useState<{ items: QueueItem[]; counts: Record<string, number> } | null>(null);

  useEffect(() => {
    setData(null);
    api.get<{ items: QueueItem[]; counts: Record<string, number> }>(`/api/admin/kyc?status=${status}`).then(setData).catch(() => setData({ items: [], counts: {} }));
  }, [status]);

  return (
    <div className="p-6 sm:p-8">
      <PageTitle title="Verification reviews" description="Check each client's documents, then approve them, ask for more, or decline with a reason." />
      <Panel
        title={
          <Tabs
            label="Review status"
            value={status}
            onChange={setStatus}
            tabs={TABS.map((t) => ({
              value: t.value,
              label: (
                <>
                  {t.label}
                  {data?.counts[t.value] ? <span className="ml-1.5 text-muted vx-tabular">{data.counts[t.value]}</span> : null}
                </>
              ),
            }))}
          />
        }
        bodyClassName=""
      >
        {data === null ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title={status === "UNDER_REVIEW" ? "Nothing to review" : "No clients here"}
            body={status === "UNDER_REVIEW" ? "New submissions appear here, oldest first." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Country</th>
                  <th className="px-3 py-2.5 text-right font-medium">Documents</th>
                  <th className="px-3 py-2.5 font-medium">{status === "UNDER_REVIEW" ? "Submitted" : "Updated"}</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.user_id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        {item.first_name} {item.last_name}
                      </p>
                      <p className="text-xs text-muted">{item.email}</p>
                    </td>
                    <td className="px-3 py-3 text-muted">{item.country ?? "—"}</td>
                    <td className="px-3 py-3 text-right vx-tabular">{item.document_count}</td>
                    <td className="px-3 py-3 text-muted">{formatDateTime(status === "UNDER_REVIEW" ? item.submitted_at : item.updated_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/kyc/${item.user_id}`} className="text-sm font-medium text-accent hover:underline">
                        {status === "UNDER_REVIEW" ? "Review" : "Open"}
                      </Link>
                    </td>
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
