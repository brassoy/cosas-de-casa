CREATE TYPE "public"."receipt_status" AS ENUM('draft', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."spend_category" AS ENUM('groceries', 'household', 'dining_out', 'leisure', 'other');--> statement-breakpoint
CREATE TABLE "receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 3),
	"unit_price" numeric(12, 2),
	"line_total" numeric(12, 2) NOT NULL,
	"category" "spend_category" DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"merchant" text,
	"purchased_at" date NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "receipt_status" DEFAULT 'draft' NOT NULL,
	"image_path" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_lines_receipt_idx" ON "receipt_lines" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipts_family_idx" ON "receipts" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "receipts_purchased_at_idx" ON "receipts" USING btree ("purchased_at");