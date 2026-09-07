ALTER TABLE "study_goals" ADD COLUMN "new_cards_per_day_n5" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_goals" ADD COLUMN "new_cards_per_day_n4" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_goals" ADD COLUMN "new_cards_per_day_tae_kim" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
-- Preserve each learner's existing shared pace when expanding it into three
-- independent settings. The legacy column remains for a safe application rollback.
UPDATE "study_goals"
SET
  "new_cards_per_day_n5" = "new_cards_per_day",
  "new_cards_per_day_n4" = "new_cards_per_day",
  "new_cards_per_day_tae_kim" = "new_cards_per_day";
