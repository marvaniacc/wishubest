import { describe, it, expect } from "vitest";
import { feeMinor, netMinor, toMinor, formatMinor } from "@wishubest/shared";

describe("money", () => {
  it("converts major to minor exactly", () => {
    expect(toMinor("10.99", 2)).toBe(1099);
    expect(toMinor(150, 2)).toBe(15000);
    expect(toMinor("0.5", 2)).toBe(50);
    expect(toMinor("1234.5678", 4)).toBe(12345678);
  });

  it("rejects invalid amounts", () => {
    expect(() => toMinor("-1", 2)).toThrow();
    expect(() => toMinor("1,000", 2)).toThrow();
    expect(() => toMinor("abc", 2)).toThrow();
  });

  it("computes fees with round-half-up on basis points", () => {
    expect(feeMinor(10000, 1500)).toBe(1500); // 15%
    expect(feeMinor(999, 1500)).toBe(150); // 149.85 → 150
    expect(feeMinor(100, 500)).toBe(5); // 5%
    expect(feeMinor(1, 1500)).toBe(0);
    expect(feeMinor(1050, 1500)).toBe(158); // 157.5 → 158
  });

  it("nets gross minus fee", () => {
    expect(netMinor(10000, 1500)).toBe(8500);
    expect(netMinor(999, 1500)).toBe(849);
  });

  it("never loses money: fee + net === gross across fuzz cases", () => {
    for (const gross of [1, 7, 99, 1000, 12345, 999999, 2147483]) {
      for (const bps of [0, 1, 137, 500, 1500, 3333, 5000]) {
        const fee = feeMinor(gross, bps);
        const net = netMinor(gross, bps);
        expect(fee + net).toBe(gross);
      }
    }
  });

  it("formats minor units for locales", () => {
    const usd = { isoCode: "USD", symbol: "$", decimalPlaces: 2 };
    expect(formatMinor(1099, usd, "en")).toMatch(/10\.99/);
    const aed = { isoCode: "AED", symbol: "د.إ", decimalPlaces: 2 };
    expect(formatMinor(25000, aed, "en")).toMatch(/250\.00/);
  });
});
