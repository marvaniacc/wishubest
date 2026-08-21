import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config.js";
import * as schema from "./schema.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export { schema };
