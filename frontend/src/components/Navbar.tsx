"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

const NAV_LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/trading", label: "Trading" },
  { href: "/account-types", label: "Account Types" },
  { href: "/education", label: "Education" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/terminal")) {
    return null; // those sections render their own chrome
  }

  return (
    <header className="sticky top-0 z-40 vx-glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg">
            <Logo />
            Vertex <span className="text-vx-accent">Trading</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm vx-muted">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "transition-colors hover:text-[rgb(var(--text))]",
                  pathname === l.href && "text-[rgb(var(--text))]"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="h-9 w-9 rounded-lg vx-surface-2 flex items-center justify-center text-sm"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            {user ? (
              <>
                <Link href="/account" className="text-sm vx-muted hover:text-[rgb(var(--text))]">
                  {user.first_name}
                </Link>
                <Link
                  href="/terminal"
                  className="rounded-lg bg-vx-accent px-4 py-2 text-sm font-medium text-white hover:bg-vx-accent/90 transition-colors"
                >
                  Start Trading
                </Link>
                <button onClick={() => logout()} className="text-sm vx-muted hover:text-[rgb(var(--text))]">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm vx-muted hover:text-[rgb(var(--text))]">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-vx-accent px-4 py-2 text-sm font-medium text-white hover:bg-vx-accent/90 transition-colors"
                >
                  Open Account
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden h-9 w-9 flex items-center justify-center" onClick={() => setOpen((o) => !o)}>
            <span className="sr-only">Menu</span>
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden vx-surface border-t border-[rgb(var(--border))] px-4 py-4 space-y-3">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block text-sm" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[rgb(var(--border))] flex gap-3">
            {user ? (
              <>
                <Link href="/terminal" className="rounded-lg bg-vx-accent px-4 py-2 text-sm font-medium text-white">
                  Start Trading
                </Link>
                <button onClick={() => logout()} className="text-sm vx-muted">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm vx-muted">
                  Login
                </Link>
                <Link href="/register" className="rounded-lg bg-vx-accent px-4 py-2 text-sm font-medium text-white">
                  Open Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
