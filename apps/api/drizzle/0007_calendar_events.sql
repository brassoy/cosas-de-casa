CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "event_attendees_pkey" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_family_idx" ON "calendar_events" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "calendar_events_starts_at_idx" ON "calendar_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "event_attendees_user_idx" ON "event_attendees" USING btree ("user_id");
