"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { AdminAuthProvider, useAdminAuth } from "@/lib/AdminAuthContext";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/instruments", label: "Instruments" },
];

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, loading, logout } = useAdminAuth();

  if (pathname === "/admin/login") return <>{children}</>;

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-sm vx-muted">Loading admin…</div>;
  }

  if (!admin) {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }

  return (
    <div className="h-screen flex bg-[rgb(var(--bg))]">
      <aside className="w-56 border-r border-[rgb(var(--border))] vx-surface flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 font-semibold border-b border-[rgb(var(--border))]">
          Vertex <span className="text-vx-accent ml-1">Admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === n.href ? "bg-vx-accent/15 text-vx-accent" : "vx-muted hover:text-[rgb(var(--text))]"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[rgb(var(--border))] text-xs">
          <div className="vx-muted mb-2">{admin.email} · {admin.role}</div>
          <button onClick={() => logout()} className="text-vx-sell hover:underline">Log out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminChrome>{children}</AdminChrome>
    </AdminAuthProvider>
  );
}
