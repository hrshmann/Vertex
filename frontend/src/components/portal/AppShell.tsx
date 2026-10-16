"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import clsx from "clsx";
import { CandlestickChart, LayoutGrid, Settings, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/AuthContext";
import { KycProvider, useKyc } from "@/lib/usePortalData";
import { NotificationsMenu, ThemeToggle, UserMenu } from "./HeaderMenus";
import { KycBanner } from "./KycBanner";
import { TickerTape } from "@/components/markets/TickerTape";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/prices", label: "Live prices", icon: CandlestickChart },
  { href: "/kyc", label: "Verification", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Data pages use the full screen width; forms and account pages stay at a readable width. */
const WIDE_PAGES = ["/prices", "/dashboard"];

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
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-6 px-4 sm:px-6">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold">
              <Logo className="h-6 w-6" />
              Vertex Trading
            </Link>
            <TopNav pathname={pathname} />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <NotificationsMenu />
              <UserMenu />
            </div>
          </div>
        </header>
        <TickerTape href="/prices" />
        <main
          className={clsx(
            "mx-auto px-3 pb-28 sm:px-4 lg:pb-12",
            WIDE_PAGES.includes(pathname) ? "max-w-[1680px] pt-3 lg:px-6" : "max-w-6xl pt-8 sm:px-6"
          )}
        >
          {/* Verification has its own page, and the overview already shows it. */}
          {pathname !== "/kyc" && pathname !== "/dashboard" && <KycBanner />}
          {children}
        </main>
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
  return <span aria-label="Action needed" className="h-2 w-2 rounded-full bg-warn" />;
}

/** Desktop navigation: four links in the header, no sidebar. */
function TopNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2 rounded-control px-3 py-2 text-sm transition-colors",
              active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
            {href === "/kyc" && <KycDot />}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
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
          {label === "Verification" ? "Verify" : label === "Live prices" ? "Prices" : label}
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
