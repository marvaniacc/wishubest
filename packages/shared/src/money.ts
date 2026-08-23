/**
 * Money utilities. All amounts are integer minor units. No floats ever.
 * Rates are integer basis points (1 bp = 0.01%). 1500 bps = 15%.
 */

export interface CurrencyInfo {
  isoCode: string;
  symbol: string;
  decimalPlaces: number;
}

/** Round-half-up division of non-negative integers. */
function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

/** platform fee for a gross amount at the given bps rate. */
export function feeMinor(grossMinor: number, rateBps: number): number {
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 0) throw new Error("invalid gross");
  if (!Number.isSafeInteger(rateBps) || rateBps < 0) throw new Error("invalid rate");
  return divRoundHalfUp(grossMinor * rateBps, 10000);
}

export function netMinor(grossMinor: number, rateBps: number): number {
  const fee = feeMinor(grossMinor, rateBps);
  const net = grossMinor - fee;
  if (net < 0) throw new Error("fee exceeds gross");
  return net;
}

export function toMinor(major: string | number, decimalPlaces: number): number {
  const s = typeof major === "number" ? major.toString() : major.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("invalid amount");
  const [intPart, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(decimalPlaces)).slice(0, decimalPlaces);
  const value = Number(intPart) * 10 ** decimalPlaces + Number(frac || "0");
  if (!Number.isSafeInteger(value)) throw new Error("amount out of range");
  return value;
}

const INTL_LOCALES: Record<string, string> = { en: "en", ar: "ar" };

export function formatMinor(
  minor: number,
  currency: CurrencyInfo,
  locale = "en",
): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error("invalid minor");
  const major = minor / 10 ** currency.decimalPlaces;
  try {
    return new Intl.NumberFormat(INTL_LOCALES[locale] ?? "en", {
      style: "currency",
      currency: currency.isoCode,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(major);
  } catch {
    return `${currency.symbol}${major.toFixed(currency.decimalPlaces)}`;
  }
}
