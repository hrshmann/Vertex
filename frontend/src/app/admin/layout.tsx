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
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 font-semibold">
            <Logo className="h-6 w-6" />
            <span className="hidden sm:inline">Vertex admin</span>
          </Link>
          <nav aria-label="Admin" className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm transition-colors",
                    active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink"
                  )}
                >
                  <Icon className="hidden h-4 w-4 sm:block" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="max-w-[14rem] truncate text-xs font-medium">{admin.email}</p>
              <p className="text-2xs text-muted">{ROLE_LABELS[admin.role] ?? admin.role}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={() => void logout()}
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-sell"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">{children}</main>
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
