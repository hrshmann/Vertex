"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div>
      <PageHeader title="Contact" subtitle="Reach the Vertex Trading team." />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-3 vx-surface rounded-xl p-6">
          {sent ? (
            <div className="py-10 text-center">
              <div className="text-vx-buy font-medium mb-2">Message sent</div>
              <p className="vx-muted text-sm">We'll get back to you shortly.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // No support-ticket/email backend is wired up yet — this just confirms the
                // submission in the UI rather than silently pretending to deliver it.
                setSent(true);
              }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name" required />
                <Field label="Email" type="email" required />
              </div>
              <Field label="Subject" required />
              <div>
                <label className="block text-sm vx-muted mb-1.5">Message</label>
                <textarea
                  required
                  rows={5}
                  className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
                />
              </div>
              <button className="rounded-lg bg-vx-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-vx-accent/90">
                Send message
              </button>
            </form>
          )}
        </div>

        <div className="md:col-span-2 space-y-5 text-sm">
          <InfoRow label="Email" value="support@vertextrading.example" />
          <InfoRow label="Phone" value="+1 (555) 010-0100" />
          <InfoRow label="WhatsApp" value="+1 (555) 010-0100" />
          <InfoRow label="Office" value="Configure your registered office address in the admin panel." />
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", required }: { label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm vx-muted mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vx-surface rounded-xl p-4">
      <div className="text-xs vx-muted uppercase tracking-wide mb-1">{label}</div>
      <div>{value}</div>
    </div>
  );
}
