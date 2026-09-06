ALTER TYPE "learning_status" ADD VALUE IF NOT EXISTS 'introduced';--> statement-breakpoint
ALTER TYPE "learning_status" RENAME VALUE 'learned' TO 'mastered';
