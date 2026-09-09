import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import type { Concept } from "../lib/study/types";

export const conceptType = pgEnum("concept_type", [
  "vocabulary",
  "kanji",
  "grammar",
  "reading",
  "listening",
  "kana",
]);
// Shared by concept level, study mode, and session mode. Historically only
// JLPT levels; "tae-kim" added for the personal-use Tae Kim/anime course
// track (see src/lib/study/tae-kim.ts); "kana" added for the hiragana/
// katakana foundation track (see src/lib/study/kana.ts) -- it is never a
// goal.studyMode value a learner picks, but kana concepts still need a
// level, and kana study sessions still get a normal studySessions row with
// mode = "kana". targetLevel stays fixed at "N4" regardless of this enum's
// extra values.
export const jlptLevel = pgEnum("jlpt_level", ["N5", "N4", "tae-kim", "kana"]);
export const rating = pgEnum("review_rating", [
  "again",
  "hard",
  "good",
  "easy",
]);
export const learningStatus = pgEnum("learning_status", [
  "introduced",
  "learning",
  "mastered",
]);
const at = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: at("created_at").defaultNow().notNull(),
});

export const studyGoals = pgTable("study_goals", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  targetDate: date("target_date").notNull(),
  targetLevel: jlptLevel("target_level").notNull().default("N4"),
  studyMode: jlptLevel("study_mode").notNull().default("N5"),
  dailyMinutes: integer("daily_minutes").notNull().default(25),
  // Retained for safe rollback to builds that still use one shared setting.
  // New application code reads the three mode-specific columns below.
  legacyNewCardsPerDay: integer("new_cards_per_day").notNull().default(9),
  newCardsPerDayN5: integer("new_cards_per_day_n5").notNull().default(9),
  newCardsPerDayN4: integer("new_cards_per_day_n4").notNull().default(9),
  newCardsPerDayTaeKim: integer("new_cards_per_day_tae_kim")
    .notNull()
    .default(9),
  timeZone: text("time_zone").notNull().default("America/New_York"),
});

// A shared concept identity gives reviews real foreign keys across content types.
export const studyConcepts = pgTable("study_concepts", {
  id: text("id").primaryKey(),
  type: conceptType("type").notNull(),
  expression: text("expression").notNull(),
  reading: text("reading").notNull(),
  meaning: text("meaning").notNull(),
  level: jlptLevel("level").notNull(),
  content: jsonb("content")
    .$type<
      Pick<
        Concept,
        | "example"
        | "exampleMeaning"
        | "note"
        | "topic"
        | "question"
        | "answer"
        | "curriculumUnit"
        | "sequence"
        | "difficulty"
        | "prerequisites"
        | "source"
        | "kanjiForm"
        | "partOfSpeech"
        | "classificationNote"
        | "commonality"
        | "vocabulary"
        | "kanaDetails"
        | "media"
      >
    >()
    .notNull(),
});

export const vocabularyItems = pgTable("vocabulary_items", {
  conceptId: text("concept_id")
    .primaryKey()
    .references(() => studyConcepts.id, { onDelete: "cascade" }),
  partOfSpeech: text("part_of_speech"),
});
export const kanjiItems = pgTable("kanji_items", {
  conceptId: text("concept_id")
    .primaryKey()
    .references(() => studyConcepts.id, { onDelete: "cascade" }),
  strokeCount: integer("stroke_count"),
});
export const grammarPoints = pgTable("grammar_points", {
  conceptId: text("concept_id")
    .primaryKey()
    .references(() => studyConcepts.id, { onDelete: "cascade" }),
  formation: text("formation").notNull(),
});

export const userConceptProgress = pgTable(
  "user_concept_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => studyConcepts.id),
    status: learningStatus("status").notNull(),
    reviewCount: integer("review_count").notNull(),
    successStreak: integer("success_streak").notNull(),
    intervalDays: real("interval_days").notNull(),
    dueAt: at("due_at").notNull(),
    lastReviewedAt: at("last_reviewed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.conceptId] }),
    index("progress_due_idx").on(table.userId, table.dueAt),
  ],
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey(),
    mode: jlptLevel("mode").notNull().default("N5"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startedAt: at("started_at").notNull(),
    completedAt: at("completed_at"),
  },
  (table) => [index("sessions_user_idx").on(table.userId, table.date)],
);

export const studySessionItems = pgTable(
  "study_session_items",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => studyConcepts.id),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.conceptId] }),
    uniqueIndex("session_position_idx").on(table.sessionId, table.position),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => studySessions.id),
    conceptId: text("concept_id")
      .notNull()
      .references(() => studyConcepts.id),
    rating: rating("rating").notNull(),
    reviewedAt: at("reviewed_at").notNull(),
    intervalDays: real("interval_days").notNull(),
  },
  (table) => [
    uniqueIndex("review_session_concept_idx").on(
      table.sessionId,
      table.conceptId,
    ),
    index("reviews_user_idx").on(table.userId, table.reviewedAt),
  ],
);

// Admin Browse's "flag this card" queue. Deliberately separate from a
// concept's own review/approval metadata (which lives in the corpus JSON
// and is edited via scripts/build-vocabulary-quality.py) -- a flag here is
// just "a human spotted something while browsing, pending triage", not a
// content edit. resolvedAt null means still open; no separate status enum.
export const conceptFlags = pgTable(
  "concept_flags",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => studyConcepts.id),
    note: text("note").notNull(),
    createdAt: at("created_at").notNull(),
    resolvedAt: at("resolved_at"),
  },
  (table) => [index("flags_open_idx").on(table.userId, table.resolvedAt)],
);
