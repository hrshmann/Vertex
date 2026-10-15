"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Bell, LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { Popover } from "./Popover";
import { useNotifications } from "@/lib/usePortalData";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { timeAgo } from "@/lib/format";

export function NotificationsMenu() {
  const { notifications, unread, loaded, markAllRead } = useNotifications();

  return (
    <Popover
      label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      trigger={
        <span className="relative">
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sell px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      }
    >
      {() => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={() => void markAllRead()} className="text-xs font-medium text-accent hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {loaded && notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-muted">
                Verification updates and security alerts appear here.
              </li>
            )}
            {notifications.slice(0, 30).map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                <span
                  aria-hidden
                  className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">{n.title.charAt(0) + n.title.slice(1).toLowerCase()}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                  <p className="mt-1 text-2xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
      className="flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Popover
      label="Account menu"
      panelClassName="w-60"
      trigger={
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-2xs font-semibold text-accent">
          {initials(user?.first_name, user?.last_name)}
        </span>
      }
    >
      {(close) => (
        <div className="py-1">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <MenuLink href="/settings" icon={<UserRound className="h-4 w-4" />} onClick={close}>
            Profile
          </MenuLink>
          <MenuLink href="/settings#security" icon={<Settings className="h-4 w-4" />} onClick={close}>
            Settings
          </MenuLink>
          <button
            onClick={async () => {
              close();
              await logout();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-muted hover:bg-raised hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </Popover>
  );
}

function MenuLink({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-2 text-sm text-muted hover:bg-raised hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}
