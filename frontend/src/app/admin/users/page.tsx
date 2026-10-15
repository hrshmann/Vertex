"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_suspended: boolean;
  email_verified_at: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");

  function load() {
    api.get<UserRow[]>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(setUsers);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex gap-2">
          <input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm w-64"
          />
          <button onClick={load} className="rounded-lg bg-vx-accent px-4 py-2 text-sm text-white">Search</button>
        </div>
      </div>

      <div className="vx-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="vx-surface-2 text-xs uppercase vx-muted">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Joined</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2"><Link href={`/admin/users/${u.id}`} className="hover:text-vx-accent hover:underline">{u.first_name} {u.last_name}</Link></td>
                <td className="px-4 py-2 vx-muted">{u.email}</td>
                <td className="px-4 py-2">
                  {u.is_suspended ? <span className="text-vx-sell">Suspended</span> : <span className="text-vx-buy">Active</span>}
                </td>
                <td className="px-4 py-2 vx-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-vx-accent hover:underline">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
