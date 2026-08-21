import { describe, expect, it } from "vitest";
import { formatMoney, lineTotalMinor, splitCommission, sumMinor } from "./money.js";

describe("splitCommission", () => {
  it("splits 10% exactly on a round amount", () => {
    expect(splitCommission(10_000, 1000)).toEqual({
      grossMinor: 10_000,
      platformFeeRateBps: 1000,
      platformFeeMinor: 1_000,
      providerNetMinor: 9_000,
    });
  });

  it("rounds half-up on indivisible amounts and preserves the invariant fee+net=gross", () => {
    // 999 * 1000 / 10000 = 99.9 -> 100
    const s = splitCommission(999, 1000);
    expect(s.platformFeeMinor).toBe(100);
    expect(s.providerNetMinor).toBe(899);
    expect(s.platformFeeMinor + s.providerNetMinor).toBe(999);
  });

  it("rounds down below half", () => {
    // 999 * 500 / 10000 = 49.95 -> 50? no: 49.95 half-up -> 50
    const s = splitCommission(999, 500);
    expect(s.platformFeeMinor).toBe(50);
    expect(s.providerNetMinor).toBe(949);
  });

  it("handles zero rate and 100% rate", () => {
    expect(splitCommission(1234, 0).platformFeeMinor).toBe(0);
    expect(splitCommission(1234, 10_000).providerNetMinor).toBe(0);
  });

  it("large amounts stay exact", () => {
    const s = splitCommission(1_000_000_000_00, 1234); // $1B, 12.34%
    expect(s.platformFeeMinor + s.providerNetMinor).toBe(1_000_000_000_00);
    expect(s.platformFeeMinor).toBe(12_340_000_000_0 / 10); // sanity: 12.34%
  });

  it("rejects invalid inputs", () => {
    expect(() => splitCommission(1.5, 1000)).toThrow();
    expect(() => splitCommission(-1, 1000)).toThrow();
    expect(() => splitCommission(100, 10_001)).toThrow();
    expect(() => splitCommission(100, -1)).toThrow();
  });
});

describe("lineTotalMinor / sumMinor", () => {
  it("multiplies exactly", () => {
    expect(lineTotalMinor(19_99, 3)).toBe(59_97);
  });
  it("sums exactly", () => {
    expect(sumMinor([100, 200, 3])).toBe(303);
  });
  it("rejects bad input", () => {
    expect(() => lineTotalMinor(10, 0)).toThrow();
    expect(() => sumMinor([1.5])).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats 2dp", () => {
    expect(formatMoney(12_34, "$", 2)).toBe("$12.34");
    expect(formatMoney(5, "$", 2)).toBe("$0.05");
  });
  it("formats 0dp", () => {
    expect(formatMoney(1500, "¥", 0)).toBe("¥1500");
  });
});
