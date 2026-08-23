import nodemailer, { type Transporter } from "nodemailer";
import { db } from "../db/client.js";
import { emailOutbox } from "../db/schema.js";
import { env } from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const e = env();
  if (!e.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT ?? 587,
      secure: (e.SMTP_PORT ?? 587) === 465,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? "" } : undefined,
    });
  }
  return transporter;
}

interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends email via SMTP when configured; every mail is recorded in the
 * outbox table regardless (audit trail + dev visibility). Fire-and-forget:
 * failures are recorded and must not break business flows.
 */
export async function sendMail(input: MailInput): Promise<void> {
  let status = "sent";
  let error: string | null = null;
  try {
    const tx = getTransporter();
    if (!tx) throw new Error("smtp_not_configured");
    await tx.sendMail({
      from: env().SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : "unknown";
  }
  try {
    await db().db.insert(emailOutbox).values({
      toEmail: input.to,
      subject: input.subject.slice(0, 300),
      bodyHtml: input.html,
      bodyText: input.text,
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
    });
  } catch (err) {
    console.error("[mail] outbox insert failed", err);
  }
}

export function wrapEmail(title: string, bodyHtml: string): string {
  const url = env().APP_URL.replace(/\/$/, "");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#F5F6F2;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #DEDCD1">
<h2 style="color:#0E4F4A;margin-top:0">${title}</h2>
<div style="color:#16211E;font-size:14px;line-height:1.6">${bodyHtml}</div>
<p style="margin-top:24px"><a href="${url}" style="background:#0E4F4A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Open WishUBest</a></p>
</div></body></html>`;
}

// ---------- templates ----------
export const mails = {
  bookingRequested(to: string, bookingCode: string, providerName: string) {
    return sendMail({
      to,
      subject: `Booking request ${bookingCode} sent`,
      text: `Your booking request with ${providerName} (${bookingCode}) has been sent. We will notify you once it is confirmed.`,
      html: wrapEmail(
        "Booking request sent",
        `<p>Your booking request <b>${bookingCode}</b> with <b>${providerName}</b> has been sent to the provider.</p><p>You will receive an email when it is confirmed.</p>`,
      ),
    });
  },
  bookingNewRequest(toProvider: string, code: string, patientName: string) {
    return sendMail({
      to: toProvider,
      subject: `New booking request ${code}`,
      text: `Patient ${patientName} requested a booking (${code}). Please confirm or decline in your dashboard.`,
      html: wrapEmail(
        "New booking request",
        `<p>Patient <b>${patientName}</b> requested a booking <b>${code}</b>.</p><p>Please review it in your provider dashboard.</p>`,
      ),
    });
  },
  bookingConfirmed(to: string, code: string, meetingLink: string | null) {
    return sendMail({
      to,
      subject: `Booking confirmed — invoice ready`,
      text: `Booking ${code} is awaiting payment.${meetingLink ? ` Meeting link: ${meetingLink}` : ""}`,
      html: wrapEmail(
        "Booking confirmed",
        `<p>Booking <b>${code}</b> has been confirmed by the provider and is now awaiting payment.</p>${
          meetingLink ? `<p>Meeting link: <a href="${meetingLink}">${meetingLink}</a></p>` : ""
        }<p>Open your dashboard to pay the invoice securely.</p>`,
      ),
    });
  },
  invoicePaid(to: string, invoiceNumber: string, code: string) {
    return sendMail({
      to,
      subject: `Payment received — ${invoiceNumber}`,
      text: `We received your payment for invoice ${invoiceNumber} (booking ${code}). The appointment is confirmed.`,
      html: wrapEmail(
        "Payment received",
        `<p>Your payment for invoice <b>${invoiceNumber}</b> (booking <b>${code}</b>) was received successfully.</p>`,
      ),
    });
  },
  paymentFailed(to: string, code: string) {
    return sendMail({
      to,
      subject: `Payment failed — booking ${code}`,
      text: `The payment for booking ${code} failed or expired. You can retry from your dashboard.`,
      html: wrapEmail(
        "Payment failed",
        `<p>The payment for booking <b>${code}</b> did not go through. You can retry any time from your dashboard.</p>`,
      ),
    });
  },
  kycStatusChanged(to: string, status: string, note: string | null) {
    return sendMail({
      to,
      subject: `KYC verification ${status}`,
      text: `Your KYC verification is now "${status}".${note ? ` Note: ${note}` : ""}`,
      html: wrapEmail(
        "KYC verification update",
        `<p>Your KYC verification status changed to <b>${status}</b>.${note ? ` Reviewer note: ${note}` : ""}</p>`,
      ),
    });
  },
};
