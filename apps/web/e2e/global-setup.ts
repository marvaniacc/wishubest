import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Prepares a pristine e2e database before servers boot. */
export default function globalSetup() {
  const db = process.env.E2E_DATABASE_URL ?? "postgres://wishubest:wishubest@localhost:5432/wishubest_e2e";
  const here = path.dirname(fileURLToPath(import.meta.url));
  const apiDir = path.resolve(here, "../../api");
  const tsx = path.join(apiDir, "node_modules/.bin/tsx");

  execSync(
    `sudo -u postgres psql -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='wishubest_e2e'" -c "drop database if exists wishubest_e2e" -c "create database wishubest_e2e owner wishubest"`,
    { shell: "/bin/bash" },
  );
  const env = {
    ...process.env,
    DATABASE_URL: db,
    ADMIN_EMAIL: "admin@e2e.local",
    ADMIN_PASSWORD: "e2e-admin-pass-1",
  };
  execSync(`${tsx} src/db/migrate.ts`, { cwd: apiDir, env, stdio: "inherit" });
  execSync(`${tsx} src/db/seed.ts`, { cwd: apiDir, env, stdio: "inherit" });
}
