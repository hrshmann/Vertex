import { describe, expect, it } from "vitest";
import { parseLimit } from "./pagination";

describe("parseLimit", () => {
  it("uses the fallback for missing or invalid values", () => {
    for (const raw of [undefined, "abc", "", "0", "-5", "2.5"]) {
      expect(parseLimit(raw, 50, 200), String(raw)).toBe(50);
    }
  });

  it("accepts valid values and caps them at max", () => {
    expect(parseLimit("25", 50, 200)).toBe(25);
    expect(parseLimit("5000", 50, 200)).toBe(200);
  });
});
