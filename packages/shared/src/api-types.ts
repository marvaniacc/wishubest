import type { z } from "zod";
import type {
  BookingStatus,
  InvoiceStatus,
  KycStatus,
  Locale,
  PaymentStatus,
  ProviderProfileStatus,
  ProviderType,
  ReviewStatus,
  ServiceMode,
  ServiceStatus,
  UserRole,
} from "./constants.js";
import type { reviewInputSchema } from "./schemas.js";

/** Standard API envelope. */
export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

// ── DTOs returned by the API (snake-free, wire format) ──────────────────────

export interface CountryDTO {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  priority: number;
}

export interface CityDTO {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  isActive: boolean;
  priority: number;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string; // English label; i18n key on client: categories.{slug}
  isActive: boolean;
}

export interface CurrencyDTO {
  isoCode: string;
  symbol: string;
  decimalPlaces: number;
}

export interface CommissionSettingDTO {
  providerType: ProviderType;
  platformFeeRateBps: number;
  affiliateCommissionRateBps: number;
}

export interface ProviderPublicDTO {
  id: string;
  providerType: ProviderType;
  displayName: string;
  slug: string;
  summary: string | null;
  ratingAvg: string | null; // e.g. "4.50"
  reviewCount: number;
  city: { id: string; name: string; slug: string } | null;
  country: { id: string; name: string; slug: string } | null;
}

export interface ProviderServicePublicDTO {
  id: string;
  title: string;
  description: string | null;
  categorySlug: string | null;
  serviceMode: ServiceMode;
  priceAmountMinor: number;
  durationMinutes: number | null;
  currency: CurrencyDTO;
}

export interface ReviewPublicDTO {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patientName: string; // first name + initial, PII-safe
}

export interface BookingDTO {
  id: string;
  status: BookingStatus;
  serviceId: string;
  serviceTitle: string;
  serviceMode: ServiceMode;
  providerId: string;
  providerName: string;
  providerSlug: string;
  patientId: string;
  patientName: string;
  requestedStartAt: string | null;
  meetingLink: string | null;
  patientNotes: string | null;
  providerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  invoiceId: string | null;
}

export interface InvoiceDTO {
  id: string;
  number: string;
  status: InvoiceStatus;
  bookingId: string;
  patientId: string;
  providerId: string;
  currencyIso: string;
  totalMinor: number;
  issuedAt: string | null;
  paidAt: string | null;
  items: Array<{
    id: string;
    description: string;
    serviceId: string | null;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  }>;
}

export interface PaymentDTO {
  id: string;
  status: PaymentStatus;
  gateway: string;
  gatewayReference: string | null;
  amountMinor: number;
  currencyIso: string;
  checkoutUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDTO extends z.infer<typeof reviewInputSchema> {
  id: string;
  providerId: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface TransactionDTO {
  id: string;
  invoiceId: string;
  providerId: string;
  grossMinor: number;
  platformFeeRateBps: number;
  platformFeeMinor: number;
  providerNetMinor: number;
  currencyIso: string;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminStatsDTO {
  counts: {
    users: number;
    providers: number;
    providersPending: number;
    bookings: number;
    invoicesPaid: number;
    transactions: number;
  };
  platformRevenueMinor: number;
  currencyIso: string | null;
}

export interface ProviderProfileDTO {
  id: string;
  userId: string;
  providerType: ProviderType;
  displayName: string;
  slug: string;
  summary: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  status: ProviderProfileStatus;
  kycStatus: KycStatus;
  ratingAvg: string | null;
  reviewCount: number;
  location: {
    countryId: string;
    cityId: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface KycDocumentDTO {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  note: string | null;
}

export interface SessionInfo {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    locale: Locale;
  };
  csrfToken: string;
}
