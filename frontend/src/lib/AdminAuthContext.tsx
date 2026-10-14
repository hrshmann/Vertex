"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiRequestError } from "./api";

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface AdminAuthState {
  admin: AdminUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<AdminUser>("/api/admin/auth/me");
      setAdmin(me);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post("/api/admin/auth/logout");
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refresh, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
