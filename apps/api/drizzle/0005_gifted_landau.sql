CREATE TYPE "public"."fridge_location" AS ENUM('FRIDGE', 'FREEZER', 'PANTRY');--> statement-breakpoint
CREATE TABLE "fridge_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 3),
	"unit" text,
	"location" "fridge_location" DEFAULT 'FRIDGE' NOT NULL,
	"expiry_date" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fridge_items" ADD CONSTRAINT "fridge_items_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fridge_items_family_idx" ON "fridge_items" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "fridge_items_expiry_idx" ON "fridge_items" USING btree ("expiry_date");