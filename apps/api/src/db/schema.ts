import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  bigserial,
  bigint,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- enums ----------
export const roleEnum = pgEnum("role", ["patient", "provider", "admin"]);
export const providerTypeEnum = pgEnum("provider_type", [
  "doctor",
  "hospital",
  "hotel",
  "translator",
]);
export const providerStatusEnum = pgEnum("provider_status", [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "rejected",
]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "submitted",
  "approved",
  "rejected",
]);
export const serviceModeEnum = pgEnum("service_mode", ["online", "in_person", "hybrid"]);
export const pricingModelEnum = pgEnum("pricing_model", ["fixed"]);
export const serviceStatusEnum = pgEnum("service_status", ["draft", "active", "inactive"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "DRAFT",
  "REQUESTED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "ISSUED",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "VOID",
  "REFUNDED",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "CREATED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
  "REQUIRES_ACTION",
  "REFUNDED",
]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const slotStatusEnum = pgEnum("slot_status", ["open", "booked", "cancelled"]);

// ---------- identity ----------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    displayName: varchar("display_name", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

// ---------- geography ----------
export const countries = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    nameAr: varchar("name_ar", { length: 120 }).notNull(),
    iso2: varchar("iso2", { length: 2 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    active: boolean("active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("countries_slug_uq").on(t.slug), uniqueIndex("countries_iso2_uq").on(t.iso2)],
);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    nameAr: varchar("name_ar", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    active: boolean("active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cities_country_slug_uq").on(t.countryId, t.slug)],
);

// ---------- platform config ----------
export const currencyConfig = pgTable("currency_config", {
  id: integer("id").primaryKey().default(1),
  isoCode: varchar("iso_code", { length: 3 }).notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commissionSettings = pgTable("commission_settings", {
  providerType: providerTypeEnum("provider_type").primaryKey(),
  platformFeeRateBps: integer("platform_fee_rate_bps").notNull(),
  affiliateCommissionRateBps: integer("affiliate_commission_rate_bps").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 140 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    nameAr: varchar("name_ar", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("service_categories_slug_uq").on(t.slug)],
);

// ---------- providers ----------
export const providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerType: providerTypeEnum("provider_type").notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    summary: varchar("summary", { length: 400 }).notNull().default(""),
    description: text("description").notNull().default(""),
    status: providerStatusEnum("status").notNull().default("draft"),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("not_started"),
    countryId: uuid("country_id").references(() => countries.id),
    cityId: uuid("city_id").references(() => cities.id),
    addressLine: varchar("address_line", { length: 300 }).notNull().default(""),
    photoUrl: text("photo_url"),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: varchar("review_note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_profiles_user_uq").on(t.userId),
    uniqueIndex("provider_profiles_slug_uq").on(t.slug),
    index("provider_profiles_listing_idx").on(t.status, t.providerType),
  ],
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    fileKey: text("file_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: kycStatusEnum("status").notNull().default("submitted"),
    reviewNote: varchar("review_note", { length: 500 }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("kyc_documents_provider_idx").on(t.providerId)],
);

// ---------- services & slots ----------
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => serviceCategories.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    serviceMode: serviceModeEnum("service_mode").notNull(),
    pricingModel: pricingModelEnum("pricing_model").notNull().default("fixed"),
    priceAmountMinor: bigint("price_amount_minor", { mode: "number" }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: serviceStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_provider_idx").on(t.providerId), index("services_public_idx").on(t.status)],
);

export const serviceSlots = pgTable(
  "service_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: slotStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("service_slots_lookup_idx").on(t.serviceId, t.startsAt)],
);

// ---------- bookings ----------
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    slotId: uuid("slot_id").references(() => serviceSlots.id, { onDelete: "set null" }),
    status: bookingStatusEnum("status").notNull().default("DRAFT"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    meetingLink: text("meeting_link"),
    patientNote: varchar("patient_note", { length: 2000 }).notNull().default(""),
    providerNote: varchar("provider_note", { length: 2000 }).notNull().default(""),
    cancellationReason: varchar("cancellation_reason", { length: 500 }),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookings_code_uq").on(t.code),
    index("bookings_patient_idx").on(t.patientId, t.createdAt),
    index("bookings_provider_idx").on(t.providerId, t.createdAt),
  ],
);

// ---------- invoices ----------
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 32 }).notNull(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" })
      .unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    currencyIso: varchar("currency_iso", { length: 3 }).notNull(),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invoices_number_uq").on(t.number)],
);

/** Line items snapshot the service at creation time; later changes never affect them. */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    label: varchar("label", { length: 250 }).notNull(),
    descriptionSnapshot: text("description_snapshot").notNull().default(""),
    quantity: integer("quantity").notNull().default(1),
    unitAmountMinor: bigint("unit_amount_minor", { mode: "number" }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currencyIso: varchar("currency_iso", { length: 3 }).notNull(),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    snapshotJson: jsonb("snapshot_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

// ---------- payments ----------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    gateway: varchar("gateway", { length: 30 }).notNull().default("stripe"),
    gatewayRef: varchar("gateway_ref", { length: 255 }).notNull(),
    clientSecret: text("client_secret"),
    checkoutUrl: text("checkout_url"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currencyIso: varchar("currency_iso", { length: 3 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    failureReason: varchar("failure_reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_gateway_ref_uq").on(t.gateway, t.gatewayRef),
    index("payments_invoice_idx").on(t.invoiceId),
  ],
);

/** Append-only webhook/event log; the unique event id guarantees idempotency. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    gateway: varchar("gateway", { length: 30 }).notNull(),
    eventId: varchar("event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    paymentRef: varchar("payment_ref", { length: 255 }),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_events_uq").on(t.gateway, t.eventId)],
);

/**
 * Simple financial record per paid invoice. INSERT-ONLY by convention AND
 * enforced immutably by DB trigger (see migrations). Rates are snapshots.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" })
      .unique(),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    currencyIso: varchar("currency_iso", { length: 3 }).notNull(),
    grossMinor: bigint("gross_minor", { mode: "number" }).notNull(),
    platformFeeRateBps: integer("platform_fee_rate_bps").notNull(),
    platformFeeMinor: bigint("platform_fee_minor", { mode: "number" }).notNull(),
    providerNetMinor: bigint("provider_net_minor", { mode: "number" }).notNull(),
    affiliateCommissionRateBps: integer("affiliate_commission_rate_bps").notNull().default(0),
    affiliateCommissionMinor: bigint("affiliate_commission_minor", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transactions_provider_idx").on(t.providerId)],
);

// ---------- reviews ----------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" })
      .unique(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 140 }).notNull().default(""),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    moderatedBy: uuid("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_provider_idx").on(t.providerId, t.status)],
);

// ---------- audit & outbox ----------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: varchar("actor_role", { length: 20 }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    changes: jsonb("changes"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    toEmail: varchar("to_email", { length: 254 }).notNull(),
    subject: varchar("subject", { length: 300 }).notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_outbox_status_idx").on(t.status)],
);

/** Generic settings (e.g. booking expiry override). Extension point for future config. */
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
