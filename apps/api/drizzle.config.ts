import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ?? "postgres://wishubest:wishubest@localhost:5433/wishubest";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url },
  strict: true,
});
