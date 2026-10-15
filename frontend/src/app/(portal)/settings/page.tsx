"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { ThemePreference, useTheme } from "@/lib/ThemeContext";
import { COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageTitle, Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  return (
    <div>
      <PageTitle title="Settings" description="Your personal details, password and display preferences." />
      <div className="max-w-2xl space-y-6">
        <ProfileForm />
        <PasswordForm />
        <AppearanceForm />
      </div>
    </div>
  );
}

function ProfileForm() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", mobile: "", country: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setForm({ firstName: user.first_name, lastName: user.last_name, mobile: user.mobile ?? "", country: user.country ?? "" });
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.patch("/api/auth/me", {
        firstName: form.firstName,
        lastName: form.lastName,
        mobile: form.mobile.trim() || null,
        country: form.country || null,
      });
      await refresh();
      toast("Profile saved");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't save your profile. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Profile" description="Use your legal name, as it appears on your ID.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required autoComplete="given-name" />
          <TextField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required autoComplete="family-name" />
        </div>
        <TextField label="Email" value={user?.email ?? ""} disabled hint="Contact support to change the email on your account." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Mobile" type="tel" optional value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} autoComplete="tel" />
          <SelectField label="Country of residence" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="">Select a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </div>
        {error && <p className="text-xs text-sell">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== next;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password changed. Your other devices were signed out.");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't change your password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={<span id="security">Password</span>} description="Changing your password signs you out on every other device.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="New password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            hint="At least 10 characters, with upper and lower case letters and a number."
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            error={mismatch ? "The passwords don't match." : null}
          />
        </div>
        {error && <p className="text-xs text-sell">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={busy} disabled={!current || !next || mismatch}>
            Change password
          </Button>
        </div>
      </form>
    </Panel>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Match my device", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function AppearanceForm() {
  const { preference, setPreference } = useTheme();
  return (
    <Panel title="Appearance">
      <fieldset>
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                preference === value ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:border-accent/50"
              )}
            >
              <input type="radio" name="theme" className="sr-only" checked={preference === value} onChange={() => setPreference(value)} />
              <Icon className={clsx("h-4 w-4", preference === value && "text-accent")} aria-hidden />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </Panel>
  );
}
