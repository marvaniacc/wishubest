import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4100);
const DB = process.env.E2E_DATABASE_URL ?? "postgres://wishubest:wishubest@localhost:5432/wishubest_e2e";

process.env.E2E_DATABASE_URL = DB;

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        `DATABASE_URL=${DB} ` +
        `PORT=${API_PORT} ` +
        `API_URL=http://127.0.0.1:${API_PORT} ` +
        `APP_URL=http://127.0.0.1:${PORT} ` +
        "NODE_ENV=test " +
        "E2E_PAYMENT_MODE=simulated E2E_WEBHOOK_SECRET=whsec_test_secret " +
        "REVALIDATE_TOKEN=e2e-token " +
        "npx tsx /opt/wishubest/apps/api/src/index.ts",
      port: API_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
      cwd: "../api",
    },
    {
      command:
        `API_URL=http://127.0.0.1:${API_PORT} ` +
        `APP_URL=http://127.0.0.1:${PORT} ` +
        "REVALIDATE_TOKEN=e2e-token " +
        `npx next start -p ${PORT}`,
      port: PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
