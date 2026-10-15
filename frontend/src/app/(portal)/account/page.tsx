import { redirect } from "next/navigation";

// The old account page was split into Overview, Funds and History.
export default function AccountPage() {
  redirect("/dashboard");
}
