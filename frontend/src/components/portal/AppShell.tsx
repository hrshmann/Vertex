"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import clsx from "clsx";
import { CandlestickChart, History, LayoutGrid, Settings, ShieldCheck, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/useAccount";
import { KycProvider, useKyc } from "@/lib/usePortalData";
import { formatMoney } from "@/lib/format";
import { NotificationsMenu, ThemeToggle, UserMenu } from "./HeaderMenus";
import { KycBanner } from "./KycBanner";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/terminal", label: "Trade", icon: CandlestickChart },
  { href: "/funds", label: "Funds", icon: Wallet },
  { href: "/kyc", label: "Verification", icon: ShieldCheck },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Tabs on phones; Settings lives in the account menu there. */
const MOBILE_NAV = NAV.filter((n) => n.href !== "/settings");

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Logo className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  return (
    <KycProvider>
    <div className="min-h-screen lg:flex">
      <Sidebar pathname={pathname} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold lg:hidden">
            <Logo className="h-6 w-6" />
            Vertex
          </Link>
          <p className="hidden text-xs text-muted lg:block">
            Demo account. Prices are live; trades and balances use virtual money.
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsMenu />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {/* Verification has its own page, and the overview's onboarding track already shows it. */}
          {pathname !== "/kyc" && pathname !== "/dashboard" && <KycBanner />}
          {children}
        </main>
      </div>
      <MobileNav pathname={pathname} />
    </div>
    </KycProvider>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function KycDot() {
  const { kyc } = useKyc();
  if (!kyc || kyc.status === "APPROVED" || kyc.status === "UNDER_REVIEW") return null;
  return <span aria-label="Action needed" className="ml-auto h-2 w-2 rounded-full bg-warn" />;
}

function Sidebar({ pathname }: { pathname: string }) {
  const { account } = useAccount("DEMO");
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <Link href="/dashboard" className="flex h-14 items-center gap-2 border-b border-line px-5 font-semibold">
        <Logo className="h-6 w-6" />
        Vertex Trading
      </Link>
      <nav aria-label="Main" className="flex-1 space-y-0.5 p-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
              isActive(pathname, href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink"
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {label}
            {href === "/kyc" && <KycDot />}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-panel border border-line bg-raised p-4">
        <p className="text-2xs text-muted">Demo account equity</p>
        <p className="mt-1 text-lg font-semibold vx-tabular">{account ? formatMoney(account.equity) : "—"}</p>
        <Link href="/funds" className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
          Add funds
        </Link>
      </div>
    </aside>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={clsx(
            "relative flex flex-col items-center gap-1 py-2.5 text-[11px]",
            isActive(pathname, href) ? "font-medium text-accent" : "text-muted"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
          {label === "Verification" ? "Verify" : label}
          {href === "/kyc" && (
            <span className="absolute right-[calc(50%-14px)] top-2">
              <KycDot />
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
