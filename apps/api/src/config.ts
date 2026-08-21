import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(8081),
  API_HOST: z.string().default("0.0.0.0"),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().url().default("http://127.0.0.1:8081"),
  DATABASE_URL: z.string().min(1),
  AUTH_COOKIE: z.string().default("wishubest_session"),
  CSRF_COOKIE: z.string().default("wishubest_csrf"),
  SESSION_TTL_SECONDS: z.coerce.number().int().default(604800),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./.storage/private"),
  DOC_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().default(300),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  PAYMENT_GATEWAY: z.enum(["stripe", "test"]).default("test"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("WishUBest <no-reply@wishubest.com>"),
  ADMIN_EMAIL: z.string().default("admin@wishubest.local"),
  ADMIN_PASSWORD: z.string().default("ChangeMe!2026"),
  TRUST_PROXY: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
