CREATE TYPE "public"."friend_invite_pin_status" AS ENUM('ACTIVE', 'CONSUMED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."plan_rsvp_status" AS ENUM('going', 'maybe', 'declined');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('proposed', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "friend_invite_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_family_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"status" "friend_invite_pin_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"consumed_by" uuid,
	"consumed_by_family_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "friend_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_a_id" uuid NOT NULL,
	"family_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_links_pair_unique" UNIQUE("family_a_id","family_b_id")
);
--> statement-breakpoint
CREATE TABLE "plan_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_participants" (
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "plan_rsvp_status" DEFAULT 'going' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_participants_plan_id_user_id_pk" PRIMARY KEY("plan_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "plan_shares" (
	"plan_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_shares_plan_id_family_id_pk" PRIMARY KEY("plan_id","family_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_family_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"place_name" text,
	"place_address" text,
	"place_lat" numeric(10, 7),
	"place_lng" numeric(10, 7),
	"scheduled_at" timestamp with time zone,
	"status" "plan_status" DEFAULT 'proposed' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friend_invite_pins" ADD CONSTRAINT "friend_invite_pins_from_family_id_families_id_fk" FOREIGN KEY ("from_family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invite_pins" ADD CONSTRAINT "friend_invite_pins_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invite_pins" ADD CONSTRAINT "friend_invite_pins_consumed_by_app_users_id_fk" FOREIGN KEY ("consumed_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invite_pins" ADD CONSTRAINT "friend_invite_pins_consumed_by_family_id_families_id_fk" FOREIGN KEY ("consumed_by_family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_family_a_id_families_id_fk" FOREIGN KEY ("family_a_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_family_b_id_families_id_fk" FOREIGN KEY ("family_b_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_messages" ADD CONSTRAINT "plan_messages_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_messages" ADD CONSTRAINT "plan_messages_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_participants" ADD CONSTRAINT "plan_participants_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_participants" ADD CONSTRAINT "plan_participants_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_shares" ADD CONSTRAINT "plan_shares_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_shares" ADD CONSTRAINT "plan_shares_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_owner_family_id_families_id_fk" FOREIGN KEY ("owner_family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friend_invite_pins_one_active_per_family" ON "friend_invite_pins" USING btree ("from_family_id") WHERE "friend_invite_pins"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "friend_invite_pins_active_hash_idx" ON "friend_invite_pins" USING btree ("code_hash") WHERE "friend_invite_pins"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "friend_links_family_a_idx" ON "friend_links" USING btree ("family_a_id");--> statement-breakpoint
CREATE INDEX "friend_links_family_b_idx" ON "friend_links" USING btree ("family_b_id");--> statement-breakpoint
CREATE INDEX "plan_messages_plan_idx" ON "plan_messages" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_messages_created_at_idx" ON "plan_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "plan_participants_user_idx" ON "plan_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plan_shares_family_idx" ON "plan_shares" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "plans_owner_family_idx" ON "plans" USING btree ("owner_family_id");--> statement-breakpoint
CREATE INDEX "plans_scheduled_at_idx" ON "plans" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_places_family_idx" ON "saved_places" USING btree ("family_id");