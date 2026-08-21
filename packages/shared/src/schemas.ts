import { z } from "zod";
import {
  USER_ROLES,
  PROVIDER_TYPES,
  SERVICE_MODES,
  PRICING_MODELS,
  SERVICE_STATUSES,
  KYC_STATUSES,
  LOCALES,
} from "./constants.js";

// ── primitives ──────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email();

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
    message: "Password must contain letters and numbers",
  });

export const uuidSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (a-z, 0-9, dashes)");

// ── auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["patient", "provider"]).default("patient"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

// ── user / session DTOs ─────────────────────────────────────────────────────

export const publicUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  fullName: z.string(),
  role: z.enum(USER_ROLES),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

// ── provider profile ────────────────────────────────────────────────────────

export const providerProfileInputSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  displayName: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(), // auto-generated from displayName if omitted
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(5000).optional(),
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().url().max(200).optional(),
  countryId: uuidSchema,
  cityId: uuidSchema,
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(20).optional(),
});
export type ProviderProfileInput = z.infer<typeof providerProfileInputSchema>;

// ── services ────────────────────────────────────────────────────────────────

export const priceAmountMinorSchema = z
  .number()
  .int("Price must be an integer of minor units")
  .min(0)
  .max(1_000_000_000_00); // 1 billion major units max, 2dp currencies

export const serviceInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000).optional(),
  categoryId: uuidSchema,
  serviceMode: z.enum(SERVICE_MODES),
  pricingModel: z.enum(PRICING_MODELS).default("fixed"),
  priceAmount: z
    .number()
    .min(0)
    .max(1_000_000_000)
    .refine((v) => Number.isFinite(v), "Invalid price")
    .refine((v) => {
      // accept at most 2 decimals; convert to minor units server-side
      return Math.round(v * 100) === Number(v.toFixed(2)) * 100;
    }, "Price supports at most 2 decimal places")
    .optional(),
  durationMinutes: z.number().int().min(5).max(24 * 60).optional(),
  status: z.enum(SERVICE_STATUSES).default("draft"),
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

// ── bookings ────────────────────────────────────────────────────────────────

export const bookingRequestSchema = z.object({
  serviceId: uuidSchema,
  requestedStartAt: z.string().datetime().optional(), // ISO 8601 UTC, required for online/hybrid
  patientNotes: z.string().trim().max(2000).optional(),
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

// ── reviews ─────────────────────────────────────────────────────────────────

export const reviewInputSchema = z.object({
  bookingId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

// ── admin ───────────────────────────────────────────────────────────────────

export const countryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(0),
});

export const cityInputSchema = z.object({
  countryId: uuidSchema,
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(0),
});

export const currencyInputSchema = z.object({
  isoCode: z.string().trim().length(3).toUpperCase(),
  symbol: z.string().trim().min(1).max(8),
  decimalPlaces: z.union([z.literal(0), z.literal(2)]).default(2),
});

export const commissionSettingInputSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  platformFeeRate: z.number().min(0).max(1), // fraction, stored as basis points
  affiliateCommissionRate: z.number().min(0).max(1).default(0),
});

export const kycReviewSchema = z.object({
  kycStatus: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

// ── misc ────────────────────────────────────────────────────────────────────

export const localeSchema = z.enum(LOCALES);
export const kycStatusSchema = z.enum(KYC_STATUSES);

export const idParamSchema = z.object({ id: uuidSchema });
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
