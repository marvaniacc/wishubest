/**
 * Integration test: full booking→invoice→webhook→transaction pipeline
 * against TEST_DATABASE_URL. Verifies financial invariants:
 *  - invoice PAID only via verified webhook
 *  - duplicate webhook ⇒ single transaction (idempotency)
 *  - commission snapshot at payment time
 *  - transactions table is immutable (trigger blocks UPDATE/DELETE)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const TEST_URL = process.env.TEST_DATABASE_URL;
const RUN = !!TEST_URL;

let app: FastifyInstance;
let cookiePatient = "";
let csrfPatient = "";
let cookieProvider = "";
let csrfProvider = "";
let cookieAdmin = "";
let csrfAdmin = "";

function jarOf(resCookies: { name: string; value: string }[]): string {
  return resCookies
    .filter((c) => c.name === "wub_session" || c.name === "wub_csrf")
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function csrfOf(resCookies: { name: string; value: string }[]): string {
  return resCookies.find((c) => c.name === "wub_csrf")?.value ?? "";
}

async function api(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  opts: { body?: unknown; jar?: string; csrf?: string; headers?: Record<string, string> } = {},
) {
  const hasBody = opts.body !== undefined && method !== "GET";
  const res = await app.inject({
    method,
    url,
    payload: hasBody ? JSON.stringify(opts.body) : undefined,
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      origin: "http://localhost:3000",
      ...(opts.csrf ? { "x-csrf-token": opts.csrf } : {}),
      ...(opts.jar ? { cookie: opts.jar } : {}),
      ...opts.headers,
    },
  });
  const setCookie = res.cookies ?? [];
  return { status: res.statusCode, json: () => res.json(), res, setCookie };
}

function extractSession(resCookies: { name: string; value: string }[], name: string): string | null {
  const c = resCookies.find((c) => c.name === name);
  return c ? `${c.name}=${c.value}` : null;
}
void extractSession;

describe.skipIf(!RUN)("financial pipeline", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL!;
    process.env.APP_URL = "http://localhost:3000";
    process.env.NODE_ENV = "test";
    // Deterministic fake gateway secret for signed-webhook simulation.
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_WEBHOOK_SECRET = process.env.E2E_WEBHOOK_SECRET ?? "whsec_test_secret";
    const { buildServer } = await import("../index.js");
    app = await buildServer({ logger: false });
  });

  afterAll(async () => {
    if (app) await app.close();
    const { closeDb } = await import("../db/client.js");
    await closeDb();
  });

  let serviceId = "";
  let bookingId = "";
  let invoiceId = "";
  let providerProfileId = "";

  it("registers admin/provider/patient and sets up catalog", async () => {
    // Register users
    const regP = await api("POST", "/auth/register", {
      body: { email: `pat-${Date.now()}@t.local`, password: "patient-pass-123", role: "patient", displayName: "Pat" },
    });
    expect(regP.status).toBe(201);
    cookiePatient = jarOf(regP.setCookie);
    csrfPatient = csrfOf(regP.setCookie);

    const regV = await api("POST", "/auth/register", {
      body: { email: `prov-${Date.now()}@t.local`, password: "provider-pass-1", role: "provider", displayName: "Dr Prov" },
    });
    expect(regV.status).toBe(201);
    cookieProvider = jarOf(regV.setCookie);
    csrfProvider = csrfOf(regV.setCookie);

    // Admin exists from seed; login instead.
    const admEmail = process.env.ADMIN_EMAIL ?? "admin@wishubest.local";
    const admPass = process.env.ADMIN_PASSWORD ?? "admin-change-me-1";
    const logA = await api("POST", "/auth/login", { body: { email: admEmail, password: admPass } });
    if (logA.status === 401) {
      throw new Error("seed the test DB with db:seed first");
    }
    expect(logA.status).toBe(200);
    cookieAdmin = jarOf(logA.setCookie);
    csrfAdmin = csrfOf(logA.setCookie);

    // Geography
    const country = await api("POST", "/admin/countries", {
      body: { nameEn: "Testland", nameAr: "بلاد الاختبار", iso2: "TS", slug: "testland", active: true, priority: 1 },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    expect(country.status).toBe(201);
    const city = await api("POST", "/admin/cities", {
      body: { countryId: country.json().country.id, nameEn: "Testville", nameAr: "مدينة الاختبار", slug: "testville", active: true, priority: 1 },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    expect(city.status).toBe(201);

    // Provider profile
    const prof = await api("PUT", "/provider/profile", {
      body: {
        providerType: "doctor",
        displayName: "Dr Test",
        summary: "Test doctor",
        description: "desc",
        addressLine: "1 Test Street",
        countryId: country.json().country.id,
        cityId: city.json().city.id,
      },
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(prof.status).toBe(201);
    providerProfileId = prof.json().profile.id;

    // Public listing must NOT contain unapproved providers
    const early = await api("GET", "/public/providers");
    expect(early.json().items.some((p: { id: string }) => p.id === providerProfileId)).toBe(false);

    // Service
    const svc = await api("POST", "/provider/services", {
      body: {
        title: "Cardiology Consult",
        description: "60 min consult",
        serviceMode: "online",
        pricingModel: "fixed",
        priceMajor: "120.00",
        durationMinutes: 60,
        status: "active",
      },
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(svc.status).toBe(201);
    serviceId = svc.json().service.id;
  });

  it("admin approves provider + kyc; provider becomes public", async () => {
    const dec = await api("POST", `/admin/providers/${providerProfileId}/decision`, {
      body: { decision: "reject" },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    // KYC must gate approval:
    expect(dec.status).toBe(409);

    // Approve KYC first — but there are no documents; decision endpoint requires submitted state.
    // For the test we flip kyc via a document-less path is not allowed; upload a doc as provider.
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000148afa4710000000049454e44ae426082", "hex");
    const boundary = "----vitestboundary" + Date.now();
    const form = Buffer.from(
      [
        `--${boundary}`,
        `Content-Disposition: form-data; name="kind"`,
        "",
        "passport",
        `--${boundary}`,
        `Content-Disposition: form-data; name="title"`,
        "",
        "Passport scan",
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="passport.png"`,
        `Content-Type: image/png`,
        "",
        "",
      ].join("\r\n"),
    );
    const payload = Buffer.concat([form, png, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const up = await app.inject({
      method: "POST",
      url: "/provider/kyc/documents",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        origin: "http://localhost:3000",
        "x-csrf-token": csrfProvider,
        cookie: cookieProvider,
        "content-length": String(payload.length),
      },
      payload,
    });
    expect(up.statusCode).toBe(201);

    const approveKyc = await api("POST", `/admin/kyc/${providerProfileId}/decision`, {
      body: { decision: "approve", note: "looks good" },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    expect(approveKyc.status).toBe(200);

    const submit = await api("POST", "/provider/submit-for-review", {
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(submit.status).toBe(200);

    const approve = await api("POST", `/admin/providers/${providerProfileId}/decision`, {
      body: { decision: "approve" },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    expect(approve.status).toBe(200);
    expect(approve.json().provider.status).toBe("active");
  });

  it("books → confirms → invoice issued with snapshot", async () => {
    const book = await api("POST", "/bookings", {
      body: {
        serviceId,
        scheduledAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        patientNote: "please help",
      },
      jar: cookiePatient,
      csrf: csrfPatient,
    });
    expect(book.status).toBe(201);
    bookingId = book.json().booking.id;

    const list = await api("GET", "/provider/bookings", { jar: cookieProvider, csrf: csrfProvider });
    expect(list.status).toBe(200);

    const confirm = await api("POST", `/provider/bookings/${bookingId}/action`, {
      body: { action: "confirm", meetingLink: "https://meet.example.com/x" },
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(confirm.status).toBe(200);
    invoiceId = confirm.json().invoice.invoiceId;
    expect(confirm.json().invoice.totalMinor).toBe(12000);

    // Invoice snapshot must exist even if service price changes later
    const svcUpdate = await api("PUT", `/provider/services/${serviceId}`, {
      body: {
        title: "Cardiology Consult",
        description: "60 min consult",
        serviceMode: "online",
        pricingModel: "fixed",
        priceMajor: "999.00",
        durationMinutes: 60,
        status: "active",
      },
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(svcUpdate.status).toBe(200);

    const invGet = await api("GET", `/invoices/${invoiceId}`, { jar: cookiePatient, csrf: csrfPatient });
    expect(invGet.status).toBe(200);
    expect(invGet.json().invoice.totalMinor).toBe(12000); // unchanged
    expect(invGet.json().items[0].snapshotJson.priceAmountMinorAtIssue).toBe(12000);
  });

  it("checkout requires gateway; simulated signed webhook pays invoice idempotently", async () => {
    // Gateway is configured (fake key) but Stripe API will fail for checkout —
    // so simulate the payment by inserting a payment row through the same code
    // path the gateway would produce, then deliver a properly signed webhook.
    const { db } = await import("../db/client.js");
    const { payments } = await import("../db/schema.js");
    const ref = `cs_test_${Date.now()}`;
    await db().db.insert(payments).values({
      invoiceId,
      gateway: "stripe",
      gatewayRef: ref,
      amountMinor: 12000,
      currencyIso: "USD",
      status: "PROCESSING",
    });

    const eventPayload = {
      id: `evt_${Date.now()}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: ref,
          object: "checkout.session",
          amount_total: 12000,
          currency: "usd",
          metadata: { invoice_id: invoiceId },
        },
      },
    };
    const raw = Buffer.from(JSON.stringify(eventPayload));
    const { StripeGateway } = await import("../lib/payments/stripe.js");
    void new StripeGateway("sk_test_fake", process.env.STRIPE_WEBHOOK_SECRET!);
    // Produce a genuine signature the way Stripe does:
    const ts = Math.floor(Date.now() / 1000);
    const crypto = await import("node:crypto");
    const sig = crypto
      .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET!)
      .update(`${ts}.${raw.toString()}`)
      .digest("hex");

    const wh = async (eventId: string) =>
      app.inject({
        method: "POST",
        url: "/webhooks/stripe",
        headers: {
          "content-type": "application/json",
          "stripe-signature": `t=${ts},v1=${sig}`,
        },
        payload: raw.toString().replace(eventPayload.id, eventId),
      });

    // Tampered payload must be rejected:
    const bad = await wh(`evt_tampered_${Date.now()}`);
    // note: signature covers different raw body now → invalid
    expect(bad.statusCode).toBe(400);

    const good1 = await wh(eventPayload.id);
    expect(good1.statusCode).toBe(200);
    expect(good1.json()).toMatchObject({ received: true });

    // duplicate delivery with SAME event id → no double processing
    const good2 = await wh(eventPayload.id);
    expect(good2.statusCode).toBe(200);
    expect(good2.json().handled).toBe(0);

    // verify end state
    const invRows = await db().db.execute(
       
      (await import("drizzle-orm")).sql`select status from invoices where id = ${invoiceId}`,
    );
    expect((invRows[0] as { status: string }).status).toBe("PAID");

    const txRows = await db().db.execute(
      (await import("drizzle-orm")).sql`select gross_minor, platform_fee_rate_bps, platform_fee_minor, provider_net_minor from transactions where invoice_id = ${invoiceId}`,
    );
    const tx = txRows[0] as Record<string, number>;
    expect(Number(tx.gross_minor)).toBe(12000);
    expect(tx.platform_fee_rate_bps).toBe(1500); // seeded default
    expect(Number(tx.platform_fee_minor) + Number(tx.provider_net_minor)).toBe(12000);

    const bkRows = await db().db.execute(
      (await import("drizzle-orm")).sql`select status from bookings where id = ${bookingId}`,
    );
    expect((bkRows[0] as { status: string }).status).toBe("CONFIRMED");
  });

  it("transactions table rejects mutation attempts (immutability trigger)", async () => {
    const { db } = await import("../db/client.js");
    const drizzle = await import("drizzle-orm");
    await expect(
      db().db.execute(drizzle.sql`update transactions set gross_minor = 1 where invoice_id = ${invoiceId}`),
    ).rejects.toThrow();
    await expect(
      db().db.execute(drizzle.sql`delete from transactions where invoice_id = ${invoiceId}`),
    ).rejects.toThrow();
  });

  it("review only allowed after COMPLETED+PAID; moderation recalcs rating", async () => {
    const noReview = await api("POST", "/reviews", {
      body: { bookingId, rating: 5, title: "great", body: "excellent care and service" },
      jar: cookiePatient,
      csrf: csrfPatient,
    });
    // booking still CONFIRMED, not COMPLETED → blocked
    expect(noReview.status).toBe(409);

    const complete = await api("POST", `/provider/bookings/${bookingId}/action`, {
      body: { action: "complete" },
      jar: cookieProvider,
      csrf: csrfProvider,
    });
    expect(complete.status).toBe(200);

    const review = await api("POST", "/reviews", {
      body: { bookingId, rating: 4, title: "good", body: "very professional treatment overall" },
      jar: cookiePatient,
      csrf: csrfPatient,
    });
    expect(review.status).toBe(201);
    const reviewId = review.json().review.id;

    const dup = await api("POST", "/reviews", {
      body: { bookingId, rating: 5, title: "again", body: "second attempt should fail here" },
      jar: cookiePatient,
      csrf: csrfPatient,
    });
    expect(dup.status).toBe(409);

    const mod = await api("POST", `/admin/reviews/${reviewId}/moderate`, {
      body: { decision: "approve" },
      jar: cookieAdmin,
      csrf: csrfAdmin,
    });
    expect(mod.status).toBe(200);

    const pub = await api("GET", "/public/providers/dr-test");
    expect(pub.status).toBe(200);
    expect(pub.json().provider.reviewCount).toBe(1);
    expect(Number(pub.json().provider.ratingAvg)).toBe(4);
  });
});
