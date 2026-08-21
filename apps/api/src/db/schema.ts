import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["patient", "provider", "admin"]);
export const providerTypeEnum = pgEnum("provider_type", ["doctor", "hospital", "hotel", "translator"]);
export const providerProfileStatusEnum = pgEnum("provider_profile_status", [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "rejected",
]);
export const kycStatusEnum = pgEnum("kyc_status", ["not_started", "submitted", "approved", "rejected"]);
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

// ── users & sessions ────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    role: userRoleEnum("role").notNull().default("patient"),
    locale: varchar("locale", { length: 5 }).notNull().default("en"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(), // sha256 hex of the cookie token
    csrfToken: char("csrf_token", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

// ── geography ───────────────────────────────────────────────────────────────

export const countries = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("countries_slug_unique").on(t.slug)],
);

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("cities_country_slug_unique").on(t.countryId, t.slug),
    index("cities_country_idx").on(t.countryId),
  ],
);

// ── platform configuration ──────────────────────────────────────────────────

/** Single active currency enforced at the application level (MVP: one row active). */
export const currencies = pgTable(
  "currencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isoCode: char("iso_code", { length: 3 }).notNull(),
    symbol: varchar("symbol", { length: 8 }).notNull(),
    decimalPlaces: integer("decimal_places").notNull().default(2),
    isActive: boolean("is_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("currencies_iso_unique").on(t.isoCode)],
);

/** Current commission rates per provider type. Snapshotted into transactions at payment time. */
export const commissionSettings = pgTable("commission_settings", {
  providerType: providerTypeEnum("provider_type").primaryKey(),
  platformFeeRateBps: integer("platform_fee_rate_bps").notNull(), // 1000 = 10.00%
  affiliateCommissionRateBps: integer("affiliate_commission_rate_bps").notNull().default(0), // post-MVP feature; field exists now
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 60 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [unique("service_categories_slug_unique").on(t.slug)],
);

// ── provider profiles ───────────────────────────────────────────────────────

export const providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerType: providerTypeEnum("provider_type").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 500 }),
    description: text("description"),
    phone: varchar("phone", { length: 30 }),
    website: varchar("website", { length: 200 }),
    status: providerProfileStatusEnum("status").notNull().default("draft"),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("not_started"),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    addressLine1: varchar("address_line1", { length: 200 }),
    addressLine2: varchar("address_line2", { length: 200 }),
    postalCode: varchar("postal_code", { length: 20 }),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_profiles_user_unique").on(t.userId), // a user has at most one ProviderProfile
    uniqueIndex("provider_profiles_slug_unique").on(t.slug),
    index("provider_profiles_status_idx").on(t.status),
    index("provider_profiles_city_idx").on(t.cityId),
    index("provider_profiles_type_idx").on(t.providerType),
  ],
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerProfileId: uuid("provider_profile_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(), // private storage — never publicly reachable
    fileName: varchar("file_name", { length: 200 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    note: varchar("note", { length: 500 }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("kyc_documents_provider_idx").on(t.providerProfileId)],
);

// ── services ────────────────────────────────────────────────────────────────

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerProfileId: uuid("provider_profile_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    serviceMode: serviceModeEnum("service_mode").notNull(),
    pricingModel: pricingModelEnum("pricing_model").notNull().default("fixed"),
    /** Integer minor units of the platform's single active currency (never float). */
    priceAmountMinor: bigint("price_amount_minor", { mode: "number" }).notNull(),
    durationMinutes: integer("duration_minutes"),
    status: serviceStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("services_provider_idx").on(t.providerProfileId),
    index("services_status_idx").on(t.status),
    index("services_category_idx").on(t.categoryId),
  ],
);

// ── bookings ────────────────────────────────────────────────────────────────

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    status: bookingStatusEnum("status").notNull().default("DRAFT"),
    /** Always UTC. Required for online/hybrid services. */
    requestedStartAt: timestamp("requested_start_at", { withTimezone: true }),
    meetingLink: text("meeting_link"), // provider adds manually after confirm (MVP)
    patientNotes: text("patient_notes"),
    providerNotes: text("provider_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_patient_idx").on(t.patientId),
    index("bookings_provider_idx").on(t.providerId),
    index("bookings_status_idx").on(t.status),
  ],
);

// ── invoices ────────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 24 }).notNull(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    currencyIso: char("currency_iso", { length: 3 }).notNull(), // snapshot; exactly one currency per invoice
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_number_unique").on(t.number),
    uniqueIndex("invoices_booking_unique").on(t.bookingId), // one invoice per booking (MVP)
    index("invoices_patient_idx").on(t.patientId),
    index("invoices_provider_idx").on(t.providerId),
    index("invoices_status_idx").on(t.status),
  ],
);

/** Line items snapshot the service at creation time — later price changes never touch these. */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    description: varchar("description", { length: 200 }).notNull(), // snapshot of the service title
    quantity: integer("quantity").notNull().default(1),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(), // snapshot
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

// ── payments ────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    gateway: varchar("gateway", { length: 20 }).notNull(),
    /** Stripe checkout session / payment intent id (or sandbox reference). */
    gatewayReference: varchar("gateway_reference", { length: 120 }).notNull(),
    gatewayPaymentIntentId: varchar("gateway_payment_intent_id", { length: 120 }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currencyIso: char("currency_iso", { length: 3 }).notNull(),
    checkoutUrl: text("checkout_url"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("payments_gateway_ref_unique").on(t.gateway, t.gatewayReference), // webhook idempotency anchor
    index("payments_invoice_idx").on(t.invoiceId),
    index("payments_status_idx").on(t.status),
  ],
);

// ── financial transactions (insert-only, simplified pre-ledger) ─────────────

/**
 * One row per paid invoice. IMMUTABLE — no updates, no deletes, ever.
 * Rates are snapshotted at payment time; later admin changes never alter history.
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "restrict" }),
    grossMinor: bigint("gross_minor", { mode: "number" }).notNull(),
    platformFeeRateBps: integer("platform_fee_rate_bps").notNull(),
    platformFeeMinor: bigint("platform_fee_minor", { mode: "number" }).notNull(),
    providerNetMinor: bigint("provider_net_minor", { mode: "number" }).notNull(),
    affiliateCommissionRateBps: integer("affiliate_commission_rate_bps").notNull().default(0), // post-MVP; 0 in MVP
    affiliateCommissionMinor: bigint("affiliate_commission_minor", { mode: "number" }).notNull().default(0),
    currencyIso: char("currency_iso", { length: 3 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("transactions_invoice_unique").on(t.invoiceId), // idempotency: exactly one per paid invoice
    index("transactions_provider_idx").on(t.providerId),
  ],
);

// ── reviews ─────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderatedBy: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_booking_unique").on(t.bookingId), // one review per booking
    index("reviews_provider_idx").on(t.providerId),
    index("reviews_status_idx").on(t.status),
  ],
);

// ── audit log ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: varchar("actor_email", { length: 254 }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

// ── relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providerProfiles, { fields: [users.id], references: [providerProfiles.userId] }),
  bookings: many(bookings),
}));

export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  user: one(users, { fields: [providerProfiles.userId], references: [users.id] }),
  country: one(countries, { fields: [providerProfiles.countryId], references: [countries.id] }),
  city: one(cities, { fields: [providerProfiles.cityId], references: [cities.id] }),
  services: many(services),
  reviews: many(reviews),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [services.providerProfileId],
    references: [providerProfiles.id],
  }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  patient: one(users, { fields: [bookings.patientId], references: [users.id] }),
  provider: one(providerProfiles, { fields: [bookings.providerId], references: [providerProfiles.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  booking: one(bookings, { fields: [invoices.bookingId], references: [bookings.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

// NOTE: invoice numbers come from the PostgreSQL sequence `invoice_number_seq`,
// created idempotently by src/db/migrate.ts (INV-00000001, ...).
