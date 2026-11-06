CREATE TABLE "app_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_metrics_key_check" CHECK (length("app_metrics"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"unit" text NOT NULL,
	"topic_id" text NOT NULL,
	"level" text NOT NULL,
	"question_id" text NOT NULL,
	"mode" text DEFAULT 'practice' NOT NULL,
	"correct" boolean NOT NULL,
	"time_ms" integer DEFAULT 0 NOT NULL,
	"given_answer" text DEFAULT '' NOT NULL,
	"expected_answer" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_level_check" CHECK ("attempts"."level" in ('beginner', 'intermediate', 'advanced', 'gate', 'challenge')),
	CONSTRAINT "attempts_time_check" CHECK ("attempts"."time_ms" between 0 and 3600000)
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"subject" text DEFAULT 'General' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_title_check" CHECK (length("books"."title") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "daily_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"day" text NOT NULL,
	"topic_id" text NOT NULL,
	"level" text NOT NULL,
	"correct" boolean NOT NULL,
	"time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_results_level_check" CHECK ("daily_results"."level" in ('beginner', 'intermediate', 'advanced', 'gate', 'challenge')),
	CONSTRAINT "daily_results_time_check" CHECK ("daily_results"."time_ms" between 0 and 3600000)
);
--> statement-breakpoint
CREATE TABLE "formula_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"formula_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"topic_id" text DEFAULT '' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"book_id" integer,
	"section" text DEFAULT 'Unsorted' NOT NULL,
	"unit" text NOT NULL,
	"topic_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"question_id" text,
	"question_number" integer,
	"level" text,
	"source" text,
	"prompt" text NOT NULL,
	"original_payload" jsonb NOT NULL,
	"final_payload" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"bookmarked" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_solutions_version_check" CHECK ("saved_solutions"."version" >= 1),
	CONSTRAINT "saved_solutions_question_number_check" CHECK ("saved_solutions"."question_number" is null or "saved_solutions"."question_number" >= 1),
	CONSTRAINT "saved_solutions_level_check" CHECK ("saved_solutions"."level" is null or "saved_solutions"."level" in ('beginner', 'intermediate', 'advanced', 'gate', 'challenge'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"solution_id" integer NOT NULL,
	"body" text NOT NULL,
	"step_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solution_notes_body_check" CHECK (length("solution_notes"."body") between 1 and 4000),
	CONSTRAINT "solution_notes_step_number_check" CHECK ("solution_notes"."step_number" is null or "solution_notes"."step_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "topic_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"unit" text NOT NULL,
	"topic_id" text NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"solved" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_progress_counts_check" CHECK ("topic_progress"."visits" >= 0 and "topic_progress"."solved" >= 0 and "topic_progress"."correct" >= 0 and "topic_progress"."correct" <= "topic_progress"."solved")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_check" CHECK (length("users"."username") between 3 and 32),
	CONSTRAINT "users_display_name_check" CHECK (length("users"."display_name") between 1 and 40),
	CONSTRAINT "users_password_hash_check" CHECK (length("users"."password_hash") > 0),
	CONSTRAINT "users_salt_check" CHECK (length("users"."salt") > 0)
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_results" ADD CONSTRAINT "daily_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formula_views" ADD CONSTRAINT "formula_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_activity" ADD CONSTRAINT "recent_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_solutions" ADD CONSTRAINT "saved_solutions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_solutions" ADD CONSTRAINT "saved_solutions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_notes" ADD CONSTRAINT "solution_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_notes" ADD CONSTRAINT "solution_notes_solution_id_saved_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."saved_solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_metrics_key_idx" ON "app_metrics" USING btree ("key");--> statement-breakpoint
CREATE INDEX "attempts_user_unit_idx" ON "attempts" USING btree ("user_id","unit");--> statement-breakpoint
CREATE INDEX "attempts_user_topic_idx" ON "attempts" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE INDEX "books_user_idx" ON "books" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_user_day_idx" ON "daily_results" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "formula_views_user_idx" ON "formula_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_user_created_idx" ON "recent_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "saved_user_updated_idx" ON "saved_solutions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "saved_user_book_idx" ON "saved_solutions" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "saved_topic_idx" ON "saved_solutions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notes_solution_idx" ON "solution_notes" USING btree ("solution_id");--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "solution_notes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_topic_idx" ON "topic_progress" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");