import { hashPassword } from "../lib/password.js";
import { db } from "./client.js";
import { commissionSettings, countries, cities, currencies, serviceCategories, users } from "./schema.js";
import { pool } from "./client.js";
import { env } from "../config.js";
import { eq } from "drizzle-orm";

/** Idempotent seed: admin user, single active currency, default commission rates, categories, sample geography. */
async function seed(): Promise<void> {
  // 1. admin user
  const existingAdmin = await db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL)).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      email: env.ADMIN_EMAIL,
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      fullName: "Platform Admin",
      role: "admin",
    });
    console.log(`[seed] admin created: ${env.ADMIN_EMAIL}`);
  }

  // 2. single active currency (USD unless a row already exists)
  const existingCurrency = await db.select().from(currencies).where(eq(currencies.isActive, true)).limit(1);
  if (existingCurrency.length === 0) {
    const anyCurrency = await db.select().from(currencies).limit(1);
    if (anyCurrency.length === 0) {
      await db.insert(currencies).values({
        isoCode: "USD",
        symbol: "$",
        decimalPlaces: 2,
        isActive: true,
      });
      console.log("[seed] currency USD activated");
    } else {
      await db.update(currencies).set({ isActive: true }).where(eq(currencies.id, anyCurrency[0]!.id));
      console.log(`[seed] currency ${anyCurrency[0]!.isoCode} activated`);
    }
  }

  // 3. default commission settings per provider type (10% platform fee)
  const defaults = [
    { providerType: "doctor" as const, platformFeeRateBps: 1000 },
    { providerType: "hospital" as const, platformFeeRateBps: 1000 },
    { providerType: "hotel" as const, platformFeeRateBps: 1000 },
    { providerType: "translator" as const, platformFeeRateBps: 1000 },
  ];
  for (const d of defaults) {
    const existing = await db
      .select()
      .from(commissionSettings)
      .where(eq(commissionSettings.providerType, d.providerType))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(commissionSettings).values(d);
    }
  }
  console.log("[seed] commission settings ensured");

  // 4. service categories
  const categories = [
    { slug: "consultation", name: "Consultation" },
    { slug: "surgery", name: "Surgery" },
    { slug: "translation", name: "Translation" },
    { slug: "hotel_stay", name: "Hotel Stay" },
  ];
  for (const c of categories) {
    const existing = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, c.slug)).limit(1);
    if (existing.length === 0) await db.insert(serviceCategories).values(c);
  }
  console.log("[seed] categories ensured");

  // 5. sample geography (only if the table is empty)
  const existingCountries = await db.select().from(countries).limit(1);
  if (existingCountries.length === 0) {
    const seedCountries = [
      { name: "Türkiye", slug: "turkiye", priority: 10 },
      { name: "United Arab Emirates", slug: "united-arab-emirates", priority: 9 },
      { name: "India", slug: "india", priority: 8 },
      { name: "Thailand", slug: "thailand", priority: 7 },
      { name: "Germany", slug: "germany", priority: 6 },
    ];
    const inserted = await db.insert(countries).values(seedCountries).returning();
    const bySlug = new Map(inserted.map((c) => [c.slug, c.id]));
    const seedCities = [
      { country: "turkiye", name: "Istanbul", slug: "istanbul", priority: 10 },
      { country: "turkiye", name: "Ankara", slug: "ankara", priority: 5 },
      { country: "united-arab-emirates", name: "Dubai", slug: "dubai", priority: 10 },
      { country: "united-arab-emirates", name: "Abu Dhabi", slug: "abu-dhabi", priority: 6 },
      { country: "india", name: "Mumbai", slug: "mumbai", priority: 9 },
      { country: "india", name: "New Delhi", slug: "new-delhi", priority: 8 },
      { country: "thailand", name: "Bangkok", slug: "bangkok", priority: 9 },
      { country: "germany", name: "Berlin", slug: "berlin", priority: 7 },
    ];
    await db.insert(cities).values(
      seedCities.map((c) => ({ countryId: bySlug.get(c.country)!, name: c.name, slug: c.slug, priority: c.priority })),
    );
    console.log("[seed] sample countries/cities created");
  }

  console.log("[seed] done");
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
