import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { env } from "../config.js";

let client: ReturnType<typeof postgres> | null = null;

export function db() {
  if (!client) {
    const e = env();
    client = postgres(e.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }
  return { sql: client, db: drizzle(client, { schema }) };
}

export type Db = ReturnType<typeof db>["db"];

export async function closeDb() {
  if (client) {
    await client.end({ timeout: 5 });
    client = null;
  }
}
