"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import clsx from "clsx";
import { LayoutGrid, LogOut, ShieldCheck, Users } from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/lib/AdminAuthContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/portal/HeaderMenus";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/kyc", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/users", label: "Clients", icon: Users },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  COMPLIANCE: "Compliance",
  TRADING_ADMIN: "Trading admin",
  SUPPORT: "Support",
  FINANCE: "Finance",
};

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, loading, logout } = useAdminAuth();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isLogin && !loading && !admin) window.location.href = "/admin/login";
  }, [isLogin, loading, admin]);

  if (isLogin) return <>{children}</>;
  if (loading || !admin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Logo className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5 font-semibold">
          <Logo className="h-6 w-6" />
          Vertex admin
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-xs font-medium">{admin.email}</p>
          <p className="text-2xs text-muted">{ROLE_LABELS[admin.role] ?? admin.role}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => void logout()} className="flex items-center gap-2 text-xs text-muted hover:text-sell">
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Phones: a compact top navigation instead of the sidebar. */}
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={clsx("shrink-0 rounded-control px-3 py-1.5 text-xs", active ? "bg-accent-soft font-medium text-accent" : "text-muted")}>
                {label}
              </Link>
            );
          })}
        </nav>
        <main>{children}</main>
      </div>
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
