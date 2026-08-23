import argon2 from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import {
  commissionSettings,
  currencyConfig,
  serviceCategories,
  users,
} from "./schema.js";
import { PROVIDER_TYPES } from "@wishubest/shared";

/**
 * Seeds baseline platform data. Idempotent.
 * Admin credentials come from ADMIN_EMAIL/ADMIN_PASSWORD env (required).
 */
async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@wishubest.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin-change-me-1";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("[seed] ADMIN_PASSWORD not set — using a dev default. Change it!");
  }

  const existingAdmin = await db().db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  let adminId: string;
  if (existingAdmin[0]) {
    adminId = existingAdmin[0].id;
  } else {
    const inserted = await db().db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash: await argon2.hash(adminPassword),
        role: "admin",
        displayName: "Platform Admin",
      })
      .returning({ id: users.id });
    adminId = inserted[0]!.id;
    console.log(`[seed] admin created: ${adminEmail}`);
  }

  // Single active currency
  await db()
    .db.insert(currencyConfig)
    .values({ id: 1, isoCode: "USD", symbol: "$", decimalPlaces: 2 })
    .onConflictDoNothing();

  // Commission defaults per provider type
  for (const t of PROVIDER_TYPES) {
    await db()
      .db.insert(commissionSettings)
      .values({ providerType: t, platformFeeRateBps: 1500, affiliateCommissionRateBps: 0 })
      .onConflictDoNothing();
  }

  // Service categories
  const categories = [
    { slug: "consultation", nameEn: "Consultation", nameAr: "استشارة" },
    { slug: "surgery", nameEn: "Surgery", nameAr: "جراحة" },
    { slug: "translation", nameEn: "Translation", nameAr: "ترجمة" },
    { slug: "hotel-stay", nameEn: "Hotel Stay", nameAr: "إقامة فندقية" },
    { slug: "dental", nameEn: "Dental Care", nameAr: "طب الأسنان" },
    { slug: "diagnostics", nameEn: "Diagnostics", nameAr: "تشخيص" },
  ];
  for (const [i, c] of categories.entries()) {
    await db()
      .db.insert(serviceCategories)
      .values({ ...c, priority: i * 10 })
      .onConflictDoNothing();
  }

  console.log(`[seed] done (actor ${adminId})`);
}

seed()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
