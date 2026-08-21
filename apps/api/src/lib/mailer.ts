import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config.js";
import { formatMoney, type Locale } from "@wishubest/shared";
import type { CurrencyDTO } from "@wishubest/shared";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    // No SMTP configured — fall back to logging (never crash the request path).
    console.warn("[mail] SMTP not configured; email content follows:");
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return Promise.resolve();
  }
  return t
    .sendMail({ from: env.MAIL_FROM, to, subject, html, text })
    .then((info) => console.log(`[mail] sent to ${to}: ${info.messageId}`))
    .catch((err) => {
      // Never let a mail failure break the business flow; log for ops.
      console.error(`[mail] FAILED to ${to}:`, err.message);
    });
}

const layout = (title: string, bodyHtml: string) => `
<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2933">
<h2 style="color:#0b6e4f;margin-bottom:4px">WishUBest</h2>
<p style="color:#6b7280;margin-top:0;font-size:13px">${title}</p>
<div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;font-size:15px;line-height:1.6">${bodyHtml}</div>
<p style="color:#9ca3af;font-size:12px;margin-top:20px">WishUBest — medical tourism marketplace · dev.wishubest.com</p>
</body></html>`;

export async function sendBookingRequestedEmail(to: string, patientName: string, providerName: string, serviceTitle: string): Promise<void> {
  return send(
    to,
    `New booking request — ${serviceTitle}`,
    layout("New booking request", `<p>Dear ${providerName},</p><p><strong>${patientName}</strong> has requested a booking for <strong>${serviceTitle}</strong>.</p><p>Please review and confirm or decline this request in your provider dashboard.</p><p><a href="${env.WEB_URL}/provider/bookings" style="background:#0b6e4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review booking</a></p>`),
    `Dear ${providerName}, ${patientName} has requested a booking for ${serviceTitle}. Review it at ${env.WEB_URL}/provider/bookings`,
  );
}

export async function sendBookingConfirmedEmail(to: string, patientName: string, providerName: string, serviceTitle: string, startAt: string | null, invoiceId: string | null): Promise<void> {
  const when = startAt ? new Date(startAt).toUTCString() : "to be scheduled";
  const pay = invoiceId ? `<p><a href="${env.WEB_URL}/patient/invoices/${invoiceId}" style="background:#0b6e4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View &amp; pay invoice</a></p>` : "";
  return send(
    to,
    `Booking confirmed — ${serviceTitle}`,
    layout("Your booking is confirmed", `<p>Dear ${patientName},</p><p><strong>${providerName}</strong> confirmed your booking for <strong>${serviceTitle}</strong>${startAt ? ` scheduled for <strong>${when}</strong> (UTC)` : ""}.</p>${pay}`),
    `Dear ${patientName}, ${providerName} confirmed your booking for ${serviceTitle} (${when}). ${invoiceId ? `Pay your invoice: ${env.WEB_URL}/patient/invoices/${invoiceId}` : ""}`,
  );
}

export async function sendInvoicePaidEmail(to: string, name: string, invoiceNumber: string, amountMinor: number, currency: CurrencyDTO): Promise<void> {
  const amount = formatMoney(amountMinor, currency.symbol, currency.decimalPlaces);
  return send(
    to,
    `Payment received — invoice ${invoiceNumber}`,
    layout("Payment confirmation", `<p>Dear ${name},</p><p>We received your payment of <strong>${amount}</strong> for invoice <strong>${invoiceNumber}</strong>. Thank you!</p>`),
    `Dear ${name}, we received your payment of ${amount} for invoice ${invoiceNumber}.`,
  );
}

export async function sendPaymentFailedEmail(to: string, name: string, invoiceNumber: string, amountMinor: number, currency: CurrencyDTO): Promise<void> {
  const amount = formatMoney(amountMinor, currency.symbol, currency.decimalPlaces);
  return send(
    to,
    `Payment failed — invoice ${invoiceNumber}`,
    layout("Payment failed", `<p>Dear ${name},</p><p>Your payment of <strong>${amount}</strong> for invoice <strong>${invoiceNumber}</strong> could not be processed. No money has been charged.</p><p>You can retry the payment from your dashboard.</p>`),
    `Dear ${name}, your payment of ${amount} for invoice ${invoiceNumber} failed. Please retry from your dashboard.`,
  );
}

export async function sendKycStatusEmail(to: string, name: string, kycStatus: string, locale: Locale = "en"): Promise<void> {
  const msg =
    kycStatus === "approved"
      ? locale === "ar"
        ? "تم اعتماد هويتك. يمكنك الآن نشر خدماتك واستقبال الحجوزات."
        : "Your identity verification has been approved. You can now publish services and receive bookings."
      : locale === "ar"
        ? "لم نتمكن من اعتماد مستندات هويتك. يرجى تحميل مستندات صحيحة."
        : "We could not approve your identity documents. Please upload valid documents and resubmit.";
  const subject = kycStatus === "approved" ? "KYC approved — WishUBest" : "KYC update — WishUBest";
  return send(to, subject, layout("KYC status update", `<p>Dear ${name},</p><p>${msg}</p>`), `Dear ${name}, ${msg}`);
}
