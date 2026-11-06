CREATE TABLE "sync_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_request_id" text NOT NULL,
	"operation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_events_request_id_check" CHECK (length("sync_events"."client_request_id") between 8 and 100),
	CONSTRAINT "sync_events_operation_check" CHECK (length("sync_events"."operation") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_events_user_request_idx" ON "sync_events" USING btree ("user_id","client_request_id");--> statement-breakpoint
CREATE INDEX "sync_events_created_idx" ON "sync_events" USING btree ("created_at");