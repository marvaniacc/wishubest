import { z } from "zod";
import {
  PROVIDER_TYPES,
  SERVICE_MODES,
  SERVICE_STATUSES,
} from "./constants.js";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(200);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["patient", "provider"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid slug")
  .min(2)
  .max(120);

const nameField = (label: string) =>
  z.string().trim().min(2, `${label} is required`).max(120);

// ---------- Admin: geography ----------
export const countryUpsertSchema = z.object({
  nameEn: nameField("English name"),
  nameAr: z.string().trim().min(2).max(120),
  iso2: z.string().trim().toUpperCase().length(2),
  slug: slugSchema,
  active: z.boolean().default(true),
  priority: z.number().int().min(0).max(100000).default(100),
});
export const cityUpsertSchema = z.object({
  countryId: z.string().uuid(),
  nameEn: nameField("English name"),
  nameAr: z.string().trim().min(2).max(120),
  slug: slugSchema,
  active: z.boolean().default(true),
  priority: z.number().int().min(0).max(100000).default(100),
});

// ---------- Admin: categories / currency / commission ----------
export const categoryUpsertSchema = z.object({
  slug: slugSchema,
  nameEn: nameField("English name"),
  nameAr: z.string().trim().min(2).max(120),
  active: z.boolean().default(true),
  priority: z.number().int().min(0).max(100000).default(100),
});

export const currencyConfigSchema = z.object({
  isoCode: z.string().trim().toUpperCase().length(3),
  symbol: z.string().trim().min(1).max(8),
  decimalPlaces: z.number().int().min(0).max(4),
});

/** Rates are integer basis points. */
export const commissionSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  platformFeeRateBps: z.number().int().min(0).max(5000),
  affiliateCommissionRateBps: z.number().int().min(0).max(5000).default(0),
});

// ---------- Provider profile ----------
export const providerProfileUpsertSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  displayName: nameField("Display name"),
  slug: slugSchema.optional(),
  summary: z.string().trim().max(280).default(""),
  description: z.string().trim().max(8000).default(""),
  countryId: z.string().uuid().nullable().optional(),
  cityId: z.string().uuid().nullable().optional(),
  addressLine: z.string().trim().max(300).default(""),
  photoUrl: z.string().url().nullable().optional(),
});
export type ProviderProfileUpsert = z.infer<typeof providerProfileUpsertSchema>;

// ---------- KYC ----------
export const kycUploadMetaSchema = z.object({
  kind: z.enum(["passport", "id_card", "license", "diploma", "other"]),
  title: z.string().trim().min(2).max(160),
});

// ---------- Services ----------
export const serviceUpsertSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  title: nameField("Title"),
  description: z.string().trim().max(8000).default(""),
  serviceMode: z.enum(SERVICE_MODES),
  pricingModel: z.literal("fixed"),
  priceMajor: z.string().regex(/^\d{1,9}(\.\d{1,4})?$/, "invalid price"),
  durationMinutes: z.number().int().min(5).max(60 * 24 * 14),
  status: z.enum(SERVICE_STATUSES).default("draft"),
});
export type ServiceUpsert = z.infer<typeof serviceUpsertSchema>;

// ---------- Slots ----------
export const slotBaseSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
});
export const slotCreateSchema = slotBaseSchema.refine(
  (v) => new Date(v.endsAt).getTime() > new Date(v.startsAt).getTime(),
  { message: "endsAt must be after startsAt" },
);

// ---------- Bookings ----------
export const bookingCreateSchema = z
  .object({
    serviceId: z.string().uuid(),
    slotId: z.string().uuid().nullable().optional(),
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    patientNote: z.string().trim().max(2000).default(""),
  })
  .refine(
    (v) => (v.slotId ? true : !!v.scheduledAt),
    { message: "slotId or scheduledAt is required" },
  );
export type BookingCreate = z.infer<typeof bookingCreateSchema>;

export const bookingProviderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), meetingLink: z.string().trim().url().max(500).optional() }),
  z.object({ action: z.literal("decline"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("no_show") }),
]);

export const meetingLinkSchema = z.object({
  meetingLink: z.string().trim().url().max(500),
});

// ---------- Reviews ----------
export const reviewCreateSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(140).default(""),
  body: z.string().trim().min(10, "review is too short").max(4000),
});

export const moderationSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

// ---------- Pagination ----------
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
