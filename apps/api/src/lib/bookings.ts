import { randomBytes } from "node:crypto";
import { and, eq, lt, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookings, invoices } from "../db/schema.js";
import { env } from "../config.js";

export function newBookingCode(): string {
  return `WB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Lazy expiry: REQUESTED/AWAITING_PAYMENT bookings past their expiry become EXPIRED. */
export async function expireStaleBookings(): Promise<number> {
  const d = db().db;
  const now = new Date();
  const res = await d
    .update(bookings)
    .set({ status: "EXPIRED", updatedAt: now })
    .where(
      and(
        inArray(bookings.status, ["REQUESTED", "AWAITING_PAYMENT"]),
        lt(bookings.expiresAt, now),
      ),
    )
    .returning({ id: bookings.id });
  if (res.length > 0) {
    // Unpaid invoices tied to expired bookings are CANCELLED (no money moved yet).
    await d
      .update(invoices)
      .set({ status: "CANCELLED", cancelledAt: now, updatedAt: now })
      .where(
        and(
          eq(invoices.status, "PENDING_PAYMENT"),
          inArray(invoices.bookingId, res.map((r) => r.id)),
        ),
      );
  }
  return res.length;
}

export function startExpirySweeper(): NodeJS.Timeout {
  const sweep = async () => {
    try {
      await expireStaleBookings();
    } catch (err) {
      console.error("[expiry] sweep failed", err);
    }
  };
  const timer = setInterval(sweep, 15 * 60 * 1000);
  timer.unref?.();
  void sweep();
  return timer;
}

export function bookingExpiryDate(): Date {
  return new Date(Date.now() + env().BOOKING_EXPIRY_HOURS * 3600 * 1000);
}
