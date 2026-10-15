/**
 * Limits how often each key (instrument symbol) is sent to clients, without dropping the latest
 * value: a value arriving within `intervalMs` of the previous send is held and sent when the
 * interval ends, replacing any value already held. Upstream feeds can fire dozens of times a
 * second per symbol (Coinbase ticks on every trade), far more than a screen can show or a
 * visitor's connection should carry.
 */
export function createTickThrottle<T>(send: (key: string, value: T) => void, intervalMs: number) {
  const lastSentAt = new Map<string, number>();
  const pending = new Map<string, T>();
  const timers = new Map<string, NodeJS.Timeout>();

  const flush = (key: string) => {
    timers.delete(key);
    const value = pending.get(key);
    if (value === undefined) return;
    pending.delete(key);
    lastSentAt.set(key, Date.now());
    send(key, value);
  };

  return {
    push(key: string, value: T) {
      const elapsed = Date.now() - (lastSentAt.get(key) ?? 0);
      if (elapsed >= intervalMs && !timers.has(key)) {
        lastSentAt.set(key, Date.now());
        send(key, value);
        return;
      }
      pending.set(key, value);
      if (!timers.has(key)) timers.set(key, setTimeout(() => flush(key), intervalMs - elapsed));
    },
    stop() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      pending.clear();
    },
  };
}
