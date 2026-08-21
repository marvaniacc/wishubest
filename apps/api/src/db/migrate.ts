import { mkdir } from "node:fs/promises";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";
import { env } from "../config.js";

/** Run pending Drizzle migrations + create the invoice number sequence + immutability guard idempotently. */
export async function runMigrations(): Promise<void> {
  if (env.STORAGE_DRIVER === "local") {
    await mkdir(path.resolve(env.STORAGE_LOCAL_DIR), { recursive: true });
  }
  await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`);
  // Enforce insert-only `transactions` at the database level (financial correctness).
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION public.deny_transactions_change()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'transactions is immutable: updates and deletes are forbidden';
    END; $$;
  `);
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'transactions_no_update') THEN
        CREATE TRIGGER "transactions_no_update" BEFORE UPDATE ON "transactions"
          FOR EACH STATEMENT EXECUTE FUNCTION public.deny_transactions_change();
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'transactions_no_delete') THEN
        CREATE TRIGGER "transactions_no_delete" BEFORE DELETE ON "transactions"
          FOR EACH STATEMENT EXECUTE FUNCTION public.deny_transactions_change();
      END IF;
    END $$;
  `);
  console.log("[db] migrations applied");
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
