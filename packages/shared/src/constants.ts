export const USER_ROLES = ["patient", "provider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROVIDER_TYPES = ["doctor", "hospital", "hotel", "translator"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_PROFILE_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "suspended",
  "rejected",
] as const;
export type ProviderProfileStatus = (typeof PROVIDER_PROFILE_STATUSES)[number];

export const KYC_STATUSES = ["not_started", "submitted", "approved", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const SERVICE_MODES = ["online", "in_person", "hybrid"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const PRICING_MODELS = ["fixed"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const SERVICE_STATUSES = ["draft", "active", "inactive"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const BOOKING_STATUSES = [
  "DRAFT",
  "REQUESTED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "VOID",
  "REFUNDED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "CREATED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
  "REQUIRES_ACTION",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

export const SUPPORTED_CATEGORIES = [
  "consultation",
  "surgery",
  "translation",
  "hotel_stay",
] as const;
export type ServiceCategorySlug = (typeof SUPPORTED_CATEGORIES)[number];
