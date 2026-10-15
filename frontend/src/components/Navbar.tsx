"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/AuthContext";
import { ThemeToggle } from "./portal/HeaderMenus";
import { ButtonLink } from "./ui/Button";

const NAV_LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/trading", label: "Trading" },
  { href: "/account-types", label: "Account types" },
  { href: "/education", label: "Learn" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const actions = loading ? null : user ? (
    <ButtonLink href="/dashboard" size="sm">
      Go to dashboard
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/register" size="sm">
        Open an account
      </ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 vx-glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <Logo />
          Vertex Trading
        </Link>

        <nav aria-label="Site" className="hidden items-center gap-7 text-sm md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={clsx("transition-colors hover:text-ink", pathname === l.href ? "text-ink" : "text-muted")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {actions}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-raised md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-line bg-surface px-4 py-4 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-control px-2 py-2 text-sm hover:bg-raised" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 border-t border-line pt-4">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      )}
    </header>
  );
}
