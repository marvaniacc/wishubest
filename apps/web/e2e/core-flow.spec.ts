import { test, expect } from "@playwright/test";

/**
 * Core MVP flow (Definition of Done):
 * provider onboarding → admin approval + KYC → patient booking →
 * provider confirmation → invoice → payment (simulated gateway) → CONFIRMED.
 */

const stamp = Date.now();
const providerEmail = `prov-${stamp}@e2e.local`;
const patientEmail = `pat-${stamp}@e2e.local`;
const ADMIN = { email: "admin@e2e.local", password: "e2e-admin-pass-1" };

const PASS = "strong-password-1";

async function logout(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.cookie = "wub_session=; Max-Age=0; path=/";
    document.cookie = "wub_csrf=; Max-Age=0; path=/";
  });
}

test("booking → payment core flow", async ({ page }) => {
  // ---------- admin seeds geography ----------
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/en/dashboard/admin/geography");
  await page.getByPlaceholder("Name (EN)").first().fill("Testland");
  await page.getByPlaceholder("ISO2 (e.g. TH)").fill("TS");
  await page.locator("section", { hasText: "Countries" }).getByRole("button").click();
  const countrySelect = page.locator("section", { hasText: "Cities" }).locator("select");
  const countryValue = await countrySelect.locator("option", { hasText: "Testland" }).getAttribute("value");
  await countrySelect.selectOption(countryValue!);
  await page.getByPlaceholder("City (EN)").fill("Harborville");
  await page.locator("section", { hasText: "Cities" }).getByRole("button").click();
  await logout(page);

  // ---------- provider registers ----------
  await page.goto("/en/register");
  await page.getByLabel("Full name").fill("Dr E2E");
  await page.getByLabel("Email").fill(providerEmail);
  await page.getByLabel("Password", { exact: true }).fill(PASS);
  await page.getByText("I'm a provider").click();
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  // create profile
  await page.goto("/en/dashboard/profile");
  await page.getByLabel("Display name").fill("Dr E2E Cardiology");
  await page.getByLabel("Country").selectOption({ label: "Testland" });
  await page.getByLabel("Address line", { exact: false }).fill("1 Harbor Road");
  const [saveRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/provider/profile")),
    page.getByRole("button", { name: /^Save$/ }).click(),
  ]);
  if (!saveRes.ok()) throw new Error(`profile save failed: ${saveRes.status()} ${await saveRes.text()}`);

  // create an active online service
  await page.goto("/en/dashboard/services");
  await page.getByRole("button", { name: /new service/i }).click();
  await page.getByLabel("Title").fill("Cardiology Consultation");
  await page.getByLabel("Price (USD)").fill("150.00");
  await page.getByLabel("Duration (min)").fill("45");
  await page.getByLabel("Status").selectOption("active");
  await page.locator("form").getByRole("button", { name: /^Save$/ }).click();

  // submit profile for admin review
  await page.goto("/en/dashboard/profile");
  const [subRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/provider/submit-for-review")),
    page.getByRole("button", { name: /submit for review/i }).click(),
  ]);
  if (!subRes.ok()) throw new Error(`submit-for-review failed: ${subRes.status()} ${await subRes.text()}`);

  // KYC doc upload
  await page.goto("/en/dashboard/kyc");
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000148afa4710000000049454e44ae426082",
    "hex",
  );
  await page.getByLabel("Document title").fill("Passport scan");
  await page.setInputFiles('input[type="file"]', {
    name: "passport.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: /upload document/i }).click();
  await expect(page.getByText("Passport scan").first()).toBeVisible();
  await logout(page);

  // ---------- admin approves KYC then provider ----------
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/en/dashboard/admin/kyc");
  await page.getByPlaceholder(/reviewer note/i).fill("docs look fine");
  await page.getByRole("button", { name: /approve kyc/i }).first().click();

  await page.goto("/en/dashboard/admin/providers");
  await page.getByRole("button", { name: /approve/i }).first().click();
  await logout(page);

  // ---------- patient books ----------
  await page.goto("/en/register");
  await page.getByLabel("Full name").fill("Pat E2E");
  await page.getByLabel("Email").fill(patientEmail);
  await page.getByLabel("Password", { exact: true }).fill(PASS);
  await page.getByText("I'm a patient").click();
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/en/providers/dr-e2e-cardiology");
  await expect(page.getByText("Cardiology Consultation")).toBeVisible();
  await page.getByRole("button", { name: /book now/i }).click();
  const dt = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.locator('input[type="datetime-local"]').fill(iso);
  await page.getByLabel(/notes/i).fill("Chest pain follow-up, please advise.");
  await page.getByRole("button", { name: /send request/i }).click();
  await expect(page.getByText(/request sent/i)).toBeVisible();

  // find booking in patient dashboard
  await page.goto("/en/dashboard/bookings");
  await expect(page.getByText("Requested")).toBeVisible();
  await logout(page);

  // ---------- provider confirms ----------
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(providerEmail);
  await page.getByLabel("Password").fill(PASS);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/en/dashboard/bookings");
  await page.getByRole("button", { name: /confirm/i }).first().click();
  await expect(page.getByText("Awaiting payment")).toBeVisible({ timeout: 15_000 });
  await logout(page);

  // ---------- patient pays ----------
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(patientEmail);
  await page.getByLabel("Password").fill(PASS);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/en/dashboard/bookings");

  await page.getByRole("link", { name: /pay now/i }).first().click();
  await expect(page).toHaveURL(/dashboard\/invoices\//, { timeout: 20_000 });
  await page.getByRole("button", { name: /pay now/i }).click();
  await expect(page).toHaveURL(/payments\/simulate/, { timeout: 20_000 });
  await page.getByRole("button", { name: /pay now/i }).click();
  await expect(page.getByText(/payment succeeded/i)).toBeVisible({ timeout: 20_000 });

  // back to bookings — status must be CONFIRMED after webhook-driven transition
  await page.waitForURL(/dashboard\/bookings/, { timeout: 20_000 });
  await page.goto("/en/dashboard/bookings");
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible({ timeout: 20_000 });
});
