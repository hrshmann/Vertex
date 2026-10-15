"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { AppNotification, KycProfile } from "./types";
import { useMarketSocket } from "./useMarketSocket";

/** Loads a GET endpoint, with reload; `null` until the first response arrives. */
function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api.get<T>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}

type KycState = { kyc: KycProfile | null; error: string | null; reload: () => Promise<void> };
const KycContext = createContext<KycState | null>(null);

/** Shares one KYC fetch between the banner, navigation badges and the page (see AppShell). */
export function KycProvider({ children }: { children: React.ReactNode }) {
  const { data, error, reload } = useResource<KycProfile>("/api/kyc");
  return createElement(KycContext.Provider, { value: { kyc: data, error, reload } }, children);
}

export function useKyc(): KycState {
  const shared = useContext(KycContext);
  const own = useResource<KycProfile>(shared ? null : "/api/kyc");
  return shared ?? { kyc: own.data, error: own.error, reload: own.reload };
}

/** Notifications with unread count; refreshes on push events and every 30 s as a fallback. */
export function useNotifications() {
  const { data, reload } = useResource<AppNotification[]>("/api/notifications");

  useEffect(() => {
    const interval = setInterval(() => void reload(), 30_000);
    return () => clearInterval(interval);
  }, [reload]);

  useMarketSocket((evt) => {
    if (evt.event === "notification.created") void reload();
  });

  const markAllRead = useCallback(async () => {
    await api.post("/api/notifications/read-all");
    await reload();
  }, [reload]);

  const notifications = data ?? [];
  return { notifications, unread: notifications.filter((n) => !n.read_at).length, loaded: data !== null, markAllRead, reload };
}
