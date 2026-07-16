CREATE TABLE "routine_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"routine_item_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	CONSTRAINT "routine_assignments_item_day_unique" UNIQUE("routine_id","routine_item_id","day_index")
);
--> statement-breakpoint
CREATE TABLE "routine_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"description" text NOT NULL,
	"lost_minutes" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_times_per_week" integer NOT NULL,
	"default_start_time" text NOT NULL,
	"default_end_time" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_selections" (
	"routine_id" uuid NOT NULL,
	"routine_item_id" uuid NOT NULL,
	"target_times_per_week" integer NOT NULL,
	CONSTRAINT "routine_selections_routine_id_routine_item_id_pk" PRIMARY KEY("routine_id","routine_item_id")
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text,
	"start_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routines_family_start_unique" UNIQUE("family_id","start_date")
);
--> statement-breakpoint
ALTER TABLE "routine_assignments" ADD CONSTRAINT "routine_assignments_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_assignments" ADD CONSTRAINT "routine_assignments_routine_item_id_routine_items_id_fk" FOREIGN KEY ("routine_item_id") REFERENCES "public"."routine_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_incidents" ADD CONSTRAINT "routine_incidents_assignment_id_routine_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."routine_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_incidents" ADD CONSTRAINT "routine_incidents_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_selections" ADD CONSTRAINT "routine_selections_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_selections" ADD CONSTRAINT "routine_selections_routine_item_id_routine_items_id_fk" FOREIGN KEY ("routine_item_id") REFERENCES "public"."routine_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_assignments_routine_idx" ON "routine_assignments" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "routine_incidents_assignment_idx" ON "routine_incidents" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "routine_items_family_idx" ON "routine_items" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "routine_selections_item_idx" ON "routine_selections" USING btree ("routine_item_id");--> statement-breakpoint
CREATE INDEX "routines_family_start_idx" ON "routines" USING btree ("family_id","start_date");