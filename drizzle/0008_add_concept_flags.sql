CREATE TABLE "concept_flags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"concept_id" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "concept_flags" ADD CONSTRAINT "concept_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_flags" ADD CONSTRAINT "concept_flags_concept_id_study_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."study_concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flags_open_idx" ON "concept_flags" USING btree ("user_id","resolved_at");