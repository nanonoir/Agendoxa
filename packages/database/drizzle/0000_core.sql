CREATE TYPE "public"."account_selection" AS ENUM('DEFAULT', 'SEQUENTIAL_ROTATION');--> statement-breakpoint
CREATE TYPE "public"."collection_mode" AS ENUM('ALL_PROFESSIONAL', 'DEPOSIT_BUSINESS_REMAINDER_PROFESSIONAL', 'ALL_BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."resource_assignment" AS ENUM('PREFERENCE_ORDER', 'ROTATION');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."contact_preference" AS ENUM('UNSET', 'ACCEPTED', 'REFUSED');--> statement-breakpoint
CREATE TYPE "public"."deletion_status" AS ENUM('NONE', 'REQUESTED', 'EXECUTED');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('PROFESSIONAL', 'PHYSICAL');--> statement-breakpoint
CREATE TYPE "public"."availability_exception_kind" AS ENUM('BLOCK', 'OPENING');--> statement-breakpoint
CREATE TYPE "public"."calendar_scope" AS ENUM('TENANT', 'RESOURCE');--> statement-breakpoint
CREATE TYPE "public"."deposit_mode" AS ENUM('DISABLED', 'FIXED', 'PERCENTAGE');--> statement-breakpoint
CREATE TYPE "public"."deposit_refund_policy" AS ENUM('NO_MONEY_BACK', 'REFUND_POSSIBLE');--> statement-breakpoint
CREATE TYPE "public"."policy_scope" AS ENUM('TENANT', 'SERVICE', 'RESOURCE');--> statement-breakpoint
CREATE TYPE "public"."booking_actor_kind" AS ENUM('CUSTOMER', 'MEMBER', 'AI', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."booking_origin" AS ENUM('WHATSAPP', 'CRM');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('HOLD', 'PENDING_PAYMENT_REVIEW', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."claim_kind" AS ENUM('BOOKING', 'PRIVATE_REMAINDER');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."late_change_kind" AS ENUM('LATE_CANCELLATION', 'LATE_RESCHEDULE');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"description" text NOT NULL,
	"is_delegable" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"system_key" "system_role",
	"is_protected" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "roles_tenant_name_key" UNIQUE("tenant_id","name"),
	CONSTRAINT "roles_admin_protected" CHECK ("roles"."system_key" IS DISTINCT FROM 'ADMIN' OR "roles"."is_protected")
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE' NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_memberships_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "tenant_memberships_tenant_user_key" UNIQUE("tenant_id","user_id"),
	CONSTRAINT "tenant_memberships_deactivation_consistent" CHECK (("tenant_memberships"."status" = 'ACTIVE' AND "tenant_memberships"."deactivated_at" IS NULL) OR ("tenant_memberships"."status" = 'DEACTIVATED' AND "tenant_memberships"."deactivated_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"branding" text,
	"collection_mode" "collection_mode" DEFAULT 'ALL_PROFESSIONAL' NOT NULL,
	"business_account_selection" "account_selection" DEFAULT 'DEFAULT' NOT NULL,
	"resource_assignment_mode" "resource_assignment" DEFAULT 'PREFERENCE_ORDER' NOT NULL,
	"resource_rotation_cursor" uuid,
	"cash_auto_open" boolean DEFAULT false NOT NULL,
	"ai_enabled" boolean DEFAULT false NOT NULL,
	"ai_disabled_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_name_not_blank" CHECK (length(trim("tenants"."name")) > 0),
	CONSTRAINT "tenants_currency_format" CHECK ("tenants"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"credential_ref" text,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text,
	"phone" text,
	"reminder_preference" "contact_preference" DEFAULT 'UNSET' NOT NULL,
	"waitlist_preference" "contact_preference" DEFAULT 'UNSET' NOT NULL,
	"deletion_status" "deletion_status" DEFAULT 'NONE' NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	"deletion_due_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "customers_phone_e164" CHECK ("customers"."phone" IS NULL OR "customers"."phone" ~ '^[+][1-9][0-9]{1,14}$'),
	CONSTRAINT "customers_deletion_dates_required" CHECK ("customers"."deletion_status" = 'NONE' OR ("customers"."deletion_requested_at" IS NOT NULL AND "customers"."deletion_due_at" IS NOT NULL AND "customers"."deletion_due_at" >= "customers"."deletion_requested_at")),
	CONSTRAINT "customers_anonymization_recorded" CHECK ("customers"."deletion_status" <> 'EXECUTED' OR ("customers"."anonymized_at" IS NOT NULL AND "customers"."phone" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "resource_kind" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"preference_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "resources_preference_nonnegative" CHECK ("resources"."preference_order" IS NULL OR "resources"."preference_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_resources" (
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_resources_service_id_resource_id_pk" PRIMARY KEY("service_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration" > 0),
	CONSTRAINT "services_price_nonnegative" CHECK ("services"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "availability_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" "calendar_scope" NOT NULL,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_calendars_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "availability_calendars_scope_target" CHECK (("availability_calendars"."scope" = 'TENANT' AND "availability_calendars"."resource_id" IS NULL) OR ("availability_calendars"."scope" = 'RESOURCE' AND "availability_calendars"."resource_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"kind" "availability_exception_kind" NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_exceptions_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "availability_exceptions_interval" CHECK (isfinite("availability_exceptions"."start_at") AND isfinite("availability_exceptions"."end_at") AND "availability_exceptions"."start_at" < "availability_exceptions"."end_at")
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_rules_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "availability_rules_weekday_range" CHECK ("availability_rules"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "availability_rules_time_order" CHECK ("availability_rules"."start_time" < "availability_rules"."end_time")
);
--> statement-breakpoint
CREATE TABLE "booking_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scope" "policy_scope" NOT NULL,
	"service_id" uuid,
	"resource_id" uuid,
	"notice" integer,
	"booking_lead" integer,
	"reminder_lead" integer,
	"deposit_mode" "deposit_mode",
	"deposit_value" numeric(12, 2),
	"deposit_refund_policy" "deposit_refund_policy",
	"reschedule_limit" integer,
	"future_booking_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_policies_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "booking_policies_scope_target" CHECK (("booking_policies"."scope" = 'TENANT' AND "booking_policies"."service_id" IS NULL AND "booking_policies"."resource_id" IS NULL) OR ("booking_policies"."scope" = 'SERVICE' AND "booking_policies"."service_id" IS NOT NULL AND "booking_policies"."resource_id" IS NULL) OR ("booking_policies"."scope" = 'RESOURCE' AND "booking_policies"."resource_id" IS NOT NULL AND "booking_policies"."service_id" IS NULL)),
	CONSTRAINT "booking_policies_tenant_only_fields" CHECK ("booking_policies"."scope" = 'TENANT' OR ("booking_policies"."booking_lead" IS NULL AND "booking_policies"."future_booking_limit" IS NULL)),
	CONSTRAINT "booking_policies_nonnegative_values" CHECK (("booking_policies"."notice" IS NULL OR "booking_policies"."notice" >= 0) AND ("booking_policies"."booking_lead" IS NULL OR "booking_policies"."booking_lead" >= 0) AND ("booking_policies"."reminder_lead" IS NULL OR "booking_policies"."reminder_lead" >= 0) AND ("booking_policies"."reschedule_limit" IS NULL OR "booking_policies"."reschedule_limit" >= 0) AND ("booking_policies"."future_booking_limit" IS NULL OR "booking_policies"."future_booking_limit" > 0) AND ("booking_policies"."deposit_value" IS NULL OR "booking_policies"."deposit_value" >= 0)),
	CONSTRAINT "booking_policies_percentage_range" CHECK ("booking_policies"."deposit_mode" IS DISTINCT FROM 'PERCENTAGE' OR "booking_policies"."deposit_value" IS NULL OR "booking_policies"."deposit_value" <= 100)
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status",
	"actor_kind" "booking_actor_kind" NOT NULL,
	"actor_membership_id" uuid,
	"reason" text,
	"late_change_kind" "late_change_kind",
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_events_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "booking_events_member_actor" CHECK (("booking_events"."actor_kind" = 'MEMBER' AND "booking_events"."actor_membership_id" IS NOT NULL) OR ("booking_events"."actor_kind" <> 'MEMBER' AND "booking_events"."actor_membership_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "booking_status" NOT NULL,
	"origin" "booking_origin" NOT NULL,
	"attendee_name" text,
	"attendee_phone" text,
	"agreed_price" numeric(12, 2) NOT NULL,
	"required_deposit" numeric(12, 2),
	"notice_snapshot" integer NOT NULL,
	"deposit_refund_policy_snapshot" "deposit_refund_policy",
	"collection_mode_snapshot" "collection_mode" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"correction_deadline_at" timestamp with time zone,
	"blocked_exception" boolean DEFAULT false NOT NULL,
	"deposit_exception" boolean DEFAULT false NOT NULL,
	"created_by_membership_id" uuid,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "bookings_amounts_nonnegative" CHECK ("bookings"."agreed_price" >= 0 AND ("bookings"."required_deposit" IS NULL OR "bookings"."required_deposit" >= 0)),
	CONSTRAINT "bookings_notice_nonnegative" CHECK ("bookings"."notice_snapshot" >= 0),
	CONSTRAINT "bookings_hold_has_deadline" CHECK ("bookings"."status" <> 'HOLD' OR "bookings"."hold_expires_at" IS NOT NULL),
	CONSTRAINT "bookings_crm_author" CHECK ("bookings"."origin" <> 'CRM' OR ("bookings"."created_by_membership_id" IS NOT NULL AND "bookings"."status" <> 'HOLD'))
);
--> statement-breakpoint
CREATE TABLE "slot_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "claim_kind" DEFAULT 'BOOKING' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "claim_status" DEFAULT 'ACTIVE' NOT NULL,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_claims_tenant_id_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "slot_claims_interval" CHECK (isfinite("slot_claims"."start_at") AND isfinite("slot_claims"."end_at") AND "slot_claims"."start_at" < "slot_claims"."end_at"),
	CONSTRAINT "slot_claims_closure_consistent" CHECK (("slot_claims"."status" = 'ACTIVE' AND "slot_claims"."closed_at" IS NULL AND "slot_claims"."close_reason" IS NULL) OR ("slot_claims"."status" = 'CLOSED' AND "slot_claims"."closed_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_same_tenant_fk" FOREIGN KEY ("tenant_id","role_id") REFERENCES "public"."roles"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_role_same_tenant_fk" FOREIGN KEY ("tenant_id","role_id") REFERENCES "public"."roles"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_resource_cursor_same_tenant_fk" FOREIGN KEY ("id","resource_rotation_cursor") REFERENCES "public"."resources"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_service_same_tenant_fk" FOREIGN KEY ("tenant_id","service_id") REFERENCES "public"."services"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_resources" ADD CONSTRAINT "service_resources_resource_same_tenant_fk" FOREIGN KEY ("tenant_id","resource_id") REFERENCES "public"."resources"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_calendars" ADD CONSTRAINT "availability_calendars_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_calendars" ADD CONSTRAINT "availability_calendars_resource_same_tenant_fk" FOREIGN KEY ("tenant_id","resource_id") REFERENCES "public"."resources"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_calendar_same_tenant_fk" FOREIGN KEY ("tenant_id","calendar_id") REFERENCES "public"."availability_calendars"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_author_same_tenant_fk" FOREIGN KEY ("tenant_id","created_by_membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_calendar_same_tenant_fk" FOREIGN KEY ("tenant_id","calendar_id") REFERENCES "public"."availability_calendars"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_policies" ADD CONSTRAINT "booking_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_policies" ADD CONSTRAINT "booking_policies_service_same_tenant_fk" FOREIGN KEY ("tenant_id","service_id") REFERENCES "public"."services"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_policies" ADD CONSTRAINT "booking_policies_resource_same_tenant_fk" FOREIGN KEY ("tenant_id","resource_id") REFERENCES "public"."resources"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_same_tenant_fk" FOREIGN KEY ("tenant_id","booking_id") REFERENCES "public"."bookings"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_same_tenant_fk" FOREIGN KEY ("tenant_id","actor_membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_same_tenant_fk" FOREIGN KEY ("tenant_id","customer_id") REFERENCES "public"."customers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_same_tenant_fk" FOREIGN KEY ("tenant_id","service_id") REFERENCES "public"."services"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_author_same_tenant_fk" FOREIGN KEY ("tenant_id","created_by_membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_resource_same_tenant_fk" FOREIGN KEY ("tenant_id","resource_id") REFERENCES "public"."resources"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_booking_same_tenant_fk" FOREIGN KEY ("tenant_id","booking_id") REFERENCES "public"."bookings"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenant_system_key" ON "roles" USING btree ("tenant_id","system_key") WHERE "roles"."system_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenant_phone_key" ON "customers" USING btree ("tenant_id","phone") WHERE "customers"."phone" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_calendars_tenant_scope_key" ON "availability_calendars" USING btree ("tenant_id") WHERE "availability_calendars"."scope" = 'TENANT';--> statement-breakpoint
CREATE UNIQUE INDEX "availability_calendars_resource_scope_key" ON "availability_calendars" USING btree ("tenant_id","resource_id") WHERE "availability_calendars"."scope" = 'RESOURCE';--> statement-breakpoint
CREATE UNIQUE INDEX "booking_policies_tenant_scope_key" ON "booking_policies" USING btree ("tenant_id") WHERE "booking_policies"."scope" = 'TENANT';--> statement-breakpoint
CREATE UNIQUE INDEX "booking_policies_service_scope_key" ON "booking_policies" USING btree ("tenant_id","service_id") WHERE "booking_policies"."scope" = 'SERVICE';--> statement-breakpoint
CREATE UNIQUE INDEX "booking_policies_resource_scope_key" ON "booking_policies" USING btree ("tenant_id","resource_id") WHERE "booking_policies"."scope" = 'RESOURCE';--> statement-breakpoint
CREATE UNIQUE INDEX "slot_claims_active_booking_key" ON "slot_claims" USING btree ("tenant_id","booking_id") WHERE "slot_claims"."status" = 'ACTIVE' AND "slot_claims"."kind" = 'BOOKING';
