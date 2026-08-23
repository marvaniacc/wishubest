import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://wishubest:wishubest@localhost:5433/wishubest";

const sqlClient = postgres(url, { max: 1 });
const db = drizzle(sqlClient);

await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("migrations applied");
await sqlClient.end({ timeout: 5 });

// Extra DDL that drizzle-kit cannot express: immutability triggers for
// financial tables and the invoice number sequence (idempotent).
const admin = postgres(url, { max: 1 });
await admin.unsafe(`
create sequence if not exists invoice_number_seq start 100001;

create or replace function forbid_financial_mutation() returns trigger as $$
begin
  raise exception 'financial records are immutable: % on % blocked', TG_OP, TG_TABLE_NAME;
end;
$$ language plpgsql;

drop trigger if exists transactions_immutable on transactions;
create trigger transactions_immutable
  before update or delete on transactions
  for each row execute function forbid_financial_mutation();

drop trigger if exists payment_events_immutable on payment_events;
create trigger payment_events_immutable
  before update or delete on payment_events
  for each row execute function forbid_financial_mutation();
`);
console.log("immutability triggers + sequence ensured");
await admin.end({ timeout: 5 });
