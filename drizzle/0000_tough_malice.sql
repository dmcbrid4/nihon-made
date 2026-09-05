CREATE TYPE "public"."concept_type" AS ENUM('vocabulary', 'kanji', 'grammar', 'reading');--> statement-breakpoint
CREATE TYPE "public"."jlpt_level" AS ENUM('N5', 'N4');--> statement-breakpoint
CREATE TYPE "public"."learning_status" AS ENUM('learning', 'learned');--> statement-breakpoint
CREATE TYPE "public"."review_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TABLE "grammar_points" (
	"concept_id" text PRIMARY KEY NOT NULL,
	"formation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanji_items" (
	"concept_id" text PRIMARY KEY NOT NULL,
	"stroke_count" integer
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"concept_id" text NOT NULL,
	"rating" "review_rating" NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"interval_days" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "concept_type" NOT NULL,
	"expression" text NOT NULL,
	"reading" text NOT NULL,
	"meaning" text NOT NULL,
	"level" "jlpt_level" NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_goals" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"target_date" date NOT NULL,
	"target_level" "jlpt_level" DEFAULT 'N4' NOT NULL,
	"daily_minutes" integer DEFAULT 25 NOT NULL,
	"time_zone" text DEFAULT 'America/New_York' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_session_items" (
	"session_id" uuid NOT NULL,
	"concept_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "study_session_items_session_id_concept_id_pk" PRIMARY KEY("session_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_concept_progress" (
	"user_id" uuid NOT NULL,
	"concept_id" text NOT NULL,
	"status" "learning_status" NOT NULL,
	"review_count" integer NOT NULL,
	"success_streak" integer NOT NULL,
	"interval_days" real NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_concept_progress_user_id_concept_id_pk" PRIMARY KEY("user_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_items" (
	"concept_id" text PRIMARY KEY NOT NULL,
	"part_of_speech" text
);
--> statement-breakpoint
ALTER TABLE "grammar_points" ADD CONSTRAINT "grammar_points_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanji_items" ADD CONSTRAINT "kanji_items_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_goals" ADD CONSTRAINT "study_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_items" ADD CONSTRAINT "study_session_items_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_concept_progress" ADD CONSTRAINT "user_concept_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_concept_progress" ADD CONSTRAINT "user_concept_progress_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_session_concept_idx" ON "reviews" USING btree ("session_id","concept_id");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_position_idx" ON "study_session_items" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "study_sessions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "progress_due_idx" ON "user_concept_progress" USING btree ("user_id","due_at");