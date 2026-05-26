CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"normalized_name" text NOT NULL,
	"display_name" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(384),
	"frequency" integer DEFAULT 1 NOT NULL,
	"last_added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_items_family_name_unique" UNIQUE("family_id","normalized_name")
);
--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_items_family_idx" ON "catalog_items" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "catalog_items_embedding_hnsw_idx" ON "catalog_items" USING hnsw ("embedding" vector_cosine_ops) WHERE "catalog_items"."embedding" IS NOT NULL;