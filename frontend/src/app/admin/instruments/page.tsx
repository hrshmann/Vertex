"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Instrument {
  id: string;
  symbol: string;
  class: string;
  provider: string;
  is_executable: boolean;
  trading_enabled: boolean;
  min_volume: string;
  max_volume: string;
  max_leverage: number;
}

export default function AdminInstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  function load() {
    api.get<Instrument[]>("/api/admin/instruments").then(setInstruments);
  }
  useEffect(load, []);

  async function toggleEnabled(i: Instrument) {
    await api.patch(`/api/admin/instruments/${i.id}`, { tradingEnabled: !i.trading_enabled });
    load();
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-1">Instruments</h1>
      <p className="vx-muted text-sm mb-6">
        Trading permissions and limits only — live prices always come from the connected market-data source.
      </p>
      <div className="vx-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="vx-surface-2 text-xs uppercase vx-muted">
            <tr>
              <th className="text-left px-4 py-2">Symbol</th>
              <th className="text-left px-4 py-2">Class</th>
              <th className="text-left px-4 py-2">Provider</th>
              <th className="text-left px-4 py-2">Executable</th>
              <th className="text-right px-4 py-2">Min / Max Vol</th>
              <th className="text-right px-4 py-2">Max Leverage</th>
              <th className="text-left px-4 py-2">Trading</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {instruments.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2 font-medium vx-tabular">{i.symbol}</td>
                <td className="px-4 py-2">{i.class}</td>
                <td className="px-4 py-2 vx-muted">{i.provider}</td>
                <td className="px-4 py-2">{i.is_executable ? "Yes" : "No (indicative)"}</td>
                <td className="px-4 py-2 text-right vx-tabular">{i.min_volume} / {i.max_volume}</td>
                <td className="px-4 py-2 text-right vx-tabular">1:{i.max_leverage}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleEnabled(i)}
                    className={`px-3 py-1 rounded-md text-xs ${
                      i.trading_enabled ? "bg-vx-buy/15 text-vx-buy" : "bg-vx-sell/15 text-vx-sell"
                    }`}
                  >
                    {i.trading_enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
