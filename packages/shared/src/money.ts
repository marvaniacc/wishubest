/**
 * Money utilities — the single source of truth for all financial math.
 *
 * Rules enforced here (non-negotiable, see spec §D-financial):
 * - All amounts are integer minor units (cents). Never floats.
 * - Commission rates are integer basis points (1 bp = 0.01%); 1000 bps = 10.00%.
 * - All calculations are exact (BigInt intermediates) with half-up rounding.
 * - These helpers are pure and shared, but ONLY the server may call them for
 *   anything that gets persisted. Clients may use them for display only.
 */

export type MinorUnits = number; // integer amount in minor units (cents)

/** Commission split result in minor units. provider_net + platform_fee === gross. */
export interface CommissionSplit {
  grossMinor: number;
  platformFeeRateBps: number; // e.g. 1000 = 10%
  platformFeeMinor: number;
  providerNetMinor: number;
}

const MINOR_MAX = 90_007_199_254_740_991; // Number.MAX_SAFE_INTEGER
const BPS_SCALE = 10_000n;

function assertMinor(amount: number, label: string): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Invalid ${label} amount (must be a safe non-negative integer of minor units): ${amount}`);
  }
}

/**
 * Split a gross amount into platform fee and provider net.
 * platform_fee = round_half_up(gross * rate_bps / 10000)
 * provider_net = gross - platform_fee   (invariant: fee + net === gross, no dust)
 */
export function splitCommission(grossMinor: number, platformFeeRateBps: number): CommissionSplit {
  assertMinor(grossMinor, "gross");
  if (!Number.isSafeInteger(platformFeeRateBps) || platformFeeRateBps < 0 || platformFeeRateBps > BPS_SCALE) {
    throw new Error(`Invalid platform fee rate bps (0..10000): ${platformFeeRateBps}`);
  }

  const gross = BigInt(grossMinor);
  const bps = BigInt(platformFeeRateBps);
  const numerator = gross * bps;
  const quotient = numerator / BPS_SCALE;
  const remainder = numerator % BPS_SCALE;
  // half-up rounding: remainder >= scale/2 rounds up
  const fee = remainder * 2n >= BPS_SCALE ? quotient + 1n : quotient;

  const platformFeeMinor = Number(fee);
  const providerNetMinor = grossMinor - platformFeeMinor;
  if (platformFeeMinor > MINOR_MAX || providerNetMinor > MINOR_MAX) {
    throw new Error("Commission split exceeds safe integer range");
  }
  return { grossMinor, platformFeeRateBps, platformFeeMinor, providerNetMinor };
}

/** Multiply a unit price by a quantity, exactly. */
export function lineTotalMinor(unitPriceMinor: number, quantity: number): number {
  assertMinor(unitPriceMinor, "unit price");
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  const total = unitPriceMinor * quantity;
  if (total > MINOR_MAX) throw new Error("Line total exceeds safe integer range");
  return total;
}

/** Sum minor-unit amounts, guarding against overflow. */
export function sumMinor(amounts: number[]): number {
  const total = amounts.reduce((acc, a) => {
    assertMinor(a, "sum term");
    return acc + a;
  }, 0);
  if (total > MINOR_MAX) throw new Error("Sum exceeds safe integer range");
  return total;
}

/** Format minor units for display. Display-only — never use for persistence or math. */
export function formatMoney(amountMinor: number, symbol: string, decimalPlaces: number): string {
  assertMinor(amountMinor, "format");
  const factor = 10 ** decimalPlaces;
  const whole = Math.floor(amountMinor / factor);
  const frac = amountMinor % factor;
  const fracStr = frac.toString().padStart(decimalPlaces, "0");
  return decimalPlaces > 0 ? `${symbol}${whole}.${fracStr}` : `${symbol}${whole}`;
}
