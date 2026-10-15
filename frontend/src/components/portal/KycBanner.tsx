"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useKyc } from "@/lib/usePortalData";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";

/** Keeps the next verification step in view on every portal page until it's done. */
export function KycBanner() {
  const { kyc } = useKyc();
  if (!kyc || kyc.status === "APPROVED") return null;

  if (kyc.status === "UNDER_REVIEW") {
    return (
      <div className="mb-6">
        <Notice tone="accent" icon={<ShieldCheck className="h-4 w-4" />} title="We're reviewing your documents">
          This usually takes one business day. We'll notify you when it's done.
        </Notice>
      </div>
    );
  }

  const needsChanges = kyc.status === "ADDITIONAL_INFORMATION_REQUIRED" || kyc.status === "REJECTED";
  return (
    <div className="mb-6">
      <Notice
        tone="warn"
        icon={<ShieldAlert className="h-4 w-4" />}
        title={needsChanges ? "Your verification needs changes" : "Verify your identity to complete your account"}
        action={
          <ButtonLink href="/kyc" size="sm">
            {needsChanges ? "See what to fix" : "Start verification"}
          </ButtonLink>
        }
      >
        {needsChanges && kyc.rejection_reason ? kyc.rejection_reason : "It takes about 3 minutes: an ID, a proof of address and a selfie."}
      </Notice>
    </div>
  );
}
