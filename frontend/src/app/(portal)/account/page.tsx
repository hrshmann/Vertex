import { redirect } from "next/navigation";

// Old address; the account overview lives at /dashboard.
export default function AccountPage() {
  redirect("/dashboard");
}
