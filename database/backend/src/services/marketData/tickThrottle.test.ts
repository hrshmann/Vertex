import { afterEach, describe, expect, it, vi } from "vitest";
import { createTickThrottle } from "./tickThrottle";

describe("tick throttle", () => {
  afterEach(() => vi.useRealTimers());

  it("sends the first value at once, then at most one per interval, always ending on the latest", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const throttle = createTickThrottle<number>(send, 500);

    throttle.push("BTC/USD", 1);
    throttle.push("BTC/USD", 2);
    throttle.push("BTC/USD", 3);
    expect(send.mock.calls).toEqual([["BTC/USD", 1]]);

    vi.advanceTimersByTime(500);
    expect(send.mock.calls).toEqual([["BTC/USD", 1], ["BTC/USD", 3]]);

    vi.advanceTimersByTime(1_000);
    expect(send).toHaveBeenCalledTimes(2); // nothing new arrived
  });

  it("throttles each symbol independently", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const throttle = createTickThrottle<number>(send, 500);

    throttle.push("BTC/USD", 1);
    throttle.push("ETH/USD", 10);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
