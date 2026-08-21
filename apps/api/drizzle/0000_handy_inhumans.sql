CREATE TYPE "public"."booking_status" AS ENUM('DRAFT', 'REQUESTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'VOID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_ACTION', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('fixed');--> statement-breakpoint
CREATE TYPE "public"."provider_profile_status" AS ENUM('draft', 'pending_review', 'active', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('doctor', 'hospital', 'hotel', 'translator');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."service_mode" AS ENUM('online', 'in_person', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('draft', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'provider', 'admin');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254),
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'DRAFT' NOT NULL,
	"requested_start_at" timestamp with time zone,
	"meeting_link" text,
	"patient_notes" text,
	"provider_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_country_slug_unique" UNIQUE("country_id","slug")
);
--> statement-breakpoint
CREATE TABLE "commission_settings" (
	"provider_type" "provider_type" PRIMARY KEY NOT NULL,
	"platform_fee_rate_bps" integer NOT NULL,
	"affiliate_commission_rate_bps" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iso_code" char(3) NOT NULL,
	"symbol" varchar(8) NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_iso_unique" UNIQUE("iso_code")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_id" uuid,
	"description" varchar(200) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(24) NOT NULL,
	"booking_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"currency_iso" char(3) NOT NULL,
	"total_minor" bigint NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_profile_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" varchar(200) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"note" varchar(500),
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"gateway" varchar(20) NOT NULL,
	"gateway_reference" varchar(120) NOT NULL,
	"gateway_payment_intent_id" varchar(120),
	"amount_minor" bigint NOT NULL,
	"currency_iso" char(3) NOT NULL,
	"checkout_url" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_gateway_ref_unique" UNIQUE("gateway","gateway_reference")
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_type" "provider_type" NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"summary" varchar(500),
	"description" text,
	"phone" varchar(30),
	"website" varchar(200),
	"status" "provider_profile_status" DEFAULT 'draft' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"address_line1" varchar(200),
	"address_line2" varchar(200),
	"postal_code" varchar(20),
	"rating_avg" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"moderated_at" timestamp with time zone,
	"moderated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(80) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_profile_id" uuid NOT NULL,
	"category_id" uuid,
	"title" varchar(120) NOT NULL,
	"description" text,
	"service_mode" "service_mode" NOT NULL,
	"pricing_model" "pricing_model" DEFAULT 'fixed' NOT NULL,
	"price_amount_minor" bigint NOT NULL,
	"duration_minutes" integer,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"csrf_token" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"gross_minor" bigint NOT NULL,
	"platform_fee_rate_bps" integer NOT NULL,
	"platform_fee_minor" bigint NOT NULL,
	"provider_net_minor" bigint NOT NULL,
	"affiliate_commission_rate_bps" integer DEFAULT 0 NOT NULL,
	"affiliate_commission_minor" bigint DEFAULT 0 NOT NULL,
	"currency_iso" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"role" "user_role" DEFAULT 'patient' NOT NULL,
	"locale" varchar(5) DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_provider_profile_id_provider_profiles_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."provider_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_profile_id_provider_profiles_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."provider_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_provider_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "bookings_patient_idx" ON "bookings" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "bookings_provider_idx" ON "bookings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_unique" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_booking_unique" ON "invoices" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "invoices_patient_idx" ON "invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "invoices_provider_idx" ON "invoices" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_documents_provider_idx" ON "kyc_documents" USING btree ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profiles_user_unique" ON "provider_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profiles_slug_unique" ON "provider_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "provider_profiles_status_idx" ON "provider_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provider_profiles_city_idx" ON "provider_profiles" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "provider_profiles_type_idx" ON "provider_profiles" USING btree ("provider_type");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_provider_idx" ON "reviews" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_provider_idx" ON "services" USING btree ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_invoice_unique" ON "transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "transactions_provider_idx" ON "transactions" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");