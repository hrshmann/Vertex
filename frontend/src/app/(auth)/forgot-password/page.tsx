import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

// Password reset by email needs an email provider, which isn't connected yet. Rather than
// pretend a link was sent, point people to support.
export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-3 text-sm text-muted">
        Resetting your password by email isn't available yet. Contact our support team from the email address on your
        account and we'll help you get back in.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/contact">Contact support</ButtonLink>
        <ButtonLink href="/login" variant="secondary">
          Back to log in
        </ButtonLink>
      </div>
      <p className="mt-6 text-xs text-muted">
        Remembered it? If you're signed in on another device, you can change your password in{" "}
        <Link href="/settings#security" className="font-medium text-accent hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
