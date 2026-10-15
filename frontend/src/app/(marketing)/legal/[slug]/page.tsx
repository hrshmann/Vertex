"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";

const SLUG_MAP: Record<string, { key: string; title: string }> = {
  "risk-disclosure": { key: "compliance.risk_disclosure", title: "Risk Disclosure" },
  terms: { key: "compliance.terms_and_conditions", title: "Terms & Conditions" },
  privacy: { key: "compliance.privacy_policy", title: "Privacy Policy" },
  cookies: { key: "compliance.cookie_policy", title: "Cookie Policy" },
  aml: { key: "compliance.aml_policy", title: "AML Policy" },
  kyc: { key: "compliance.kyc_policy", title: "KYC Policy" },
  execution: { key: "compliance.execution_policy", title: "Execution Policy" },
  "client-agreement": { key: "compliance.client_agreement", title: "Client Agreement" },
  fees: { key: "compliance.fees_and_charges", title: "Fees & Charges" },
  complaints: { key: "compliance.complaints_procedure", title: "Complaints Procedure" },
};

export default function LegalPage() {
  const params = useParams<{ slug: string }>();
  const meta = SLUG_MAP[params.slug];
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!meta) return;
    api.get<Record<string, string>>("/api/compliance").then((data) => setText(data[meta.key] ?? ""));
  }, [meta]);

  if (!meta) {
    return <div className="mx-auto max-w-3xl px-4 py-20 vx-muted">Page not found.</div>;
  }

  return (
    <div>
      <PageHeader title={meta.title} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="vx-surface rounded-xl p-6 text-sm leading-relaxed whitespace-pre-line">
          {text ?? "Loading…"}
        </div>
        <p className="mt-4 text-xs vx-muted">
          This text is configured by the platform operator and must match the licenses and
          jurisdiction of the actual operating entity.
        </p>
      </div>
    </div>
  );
}
