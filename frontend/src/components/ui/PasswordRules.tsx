import clsx from "clsx";
import { Check } from "lucide-react";

/** Mirrors the server's isPasswordStrongEnough. */
const RULES = [
  { label: "10 or more characters", test: (p: string) => p.length >= 10 },
  { label: "Upper and lower case letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
];

export const isStrongPassword = (password: string) => RULES.every((r) => r.test(password));

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={clsx("flex items-center gap-2 text-2xs", ok ? "text-buy" : "text-muted")}>
            <Check className={clsx("h-3.5 w-3.5", ok ? "opacity-100" : "opacity-30")} strokeWidth={3} aria-hidden />
            {r.label}
            <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
