ALTER TABLE "study_goals" ADD COLUMN IF NOT EXISTS "study_mode" "jlpt_level" DEFAULT 'N5' NOT NULL;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN IF NOT EXISTS "mode" "jlpt_level" DEFAULT 'N5' NOT NULL;
