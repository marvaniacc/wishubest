import { sql, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import type { Tx } from "../db/tx.js";
import { bookings, invoices, invoiceItems, services } from "../db/schema.js";
import { env } from "../config.js";

/** INV-YYYY-NNNNNN from a dedicated sequence. */
export async function nextInvoiceNumber(): Promise<string> {
  const res = await db().sql`select nextval('invoice_number_seq') as n`;
  const row = res[0] as { n: string };
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${String(row.n).padStart(6, "0")}`;
}

export interface IssuedInvoice {
  invoiceId: string;
  number: string;
  totalMinor: number;
  currencyIso: string;
}

/**
 * Creates an invoice for a booking with a full snapshot of the service
 * (title, description, price, duration). Later service changes never affect
 * existing invoices. Exactly one invoice per booking.
 */
export async function issueInvoiceForBooking(
  bookingId: string,
  existingTx?: Tx,
): Promise<IssuedInvoice> {
  const run = async (tx: Tx): Promise<IssuedInvoice> => {
    const bkRows = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update").limit(1);
    const booking = bkRows[0];
    if (!booking) throw Object.assign(new Error("booking_not_found"), { statusCode: 404 });

    const existing = await tx.select({ id: invoices.id, number: invoices.number, totalMinor: invoices.totalMinor, currencyIso: invoices.currencyIso })
      .from(invoices).where(eq(invoices.bookingId, bookingId)).limit(1);
    if (existing[0]) {
      return {
        invoiceId: existing[0].id,
        number: existing[0].number,
        totalMinor: existing[0].totalMinor,
        currencyIso: existing[0].currencyIso,
      };
    }

    const svcRows = await tx.select().from(services).where(eq(services.id, booking.serviceId)).limit(1);
    const svc = svcRows[0];
    if (!svc) throw new Error("service_missing_for_invoice");

    const cur = await getActiveCurrency();
    const now = new Date();
    const number = await nextInvoiceNumber();

    // Snapshot line item — immutable record of what was purchased at this instant.
    const snapshot = {
      serviceId: svc.id,
      title: svc.title,
      serviceMode: svc.serviceMode,
      pricingModel: svc.pricingModel,
      priceAmountMinorAtIssue: svc.priceAmountMinor,
      durationMinutes: svc.durationMinutes,
      providerId: booking.providerId,
      bookingCode: booking.code,
      issuedAtIso: now.toISOString(),
    };

    const invRows = await tx
      .insert(invoices)
      .values({
        number,
        bookingId,
        patientId: booking.patientId,
        providerId: booking.providerId,
        currencyIso: cur.isoCode,
        totalMinor: svc.priceAmountMinor,
        status: "PENDING_PAYMENT",
        issuedAt: now,
        dueAt: new Date(now.getTime() + env().BOOKING_EXPIRY_HOURS * 3600 * 1000),
      })
      .returning({ id: invoices.id });
    const invoiceId = invRows[0]!.id;

    await tx.insert(invoiceItems).values({
      invoiceId,
      label: svc.title.slice(0, 250),
      descriptionSnapshot: svc.description.slice(0, 4000),
      quantity: 1,
      unitAmountMinor: svc.priceAmountMinor,
      amountMinor: svc.priceAmountMinor,
      currencyIso: cur.isoCode,
      serviceId: svc.id,
      snapshotJson: snapshot as never,
    });

    return { invoiceId, number, totalMinor: svc.priceAmountMinor, currencyIso: cur.isoCode };
  };

  if (existingTx) return run(existingTx);
  return db().db.transaction(run);
}

import { currencyConfig } from "../db/schema.js";

export async function getActiveCurrency(): Promise<{
  isoCode: string;
  symbol: string;
  decimalPlaces: number;
}> {
  const rows = await db()
    .db.select()
    .from(currencyConfig)
    .where(eq(currencyConfig.id, 1))
    .limit(1);
  if (rows[0]) return rows[0];
  return {
    isoCode: env().PAYMENT_CURRENCY_FALLBACK,
    symbol: "$",
    decimalPlaces: 2,
  };
}

export async function bookingCodeExists(code: string): Promise<boolean> {
  const rows = await db()
    .db.select({ id: bookings.id })
    .from(bookings)
    .where(sql`code = ${code}`)
    .limit(1);
  return !!rows[0];
}
