import { z } from "zod";

export const conceptTypes = [
  "vocabulary",
  "kanji",
  "grammar",
  "reading",
  "listening",
] as const;
export type ConceptType = (typeof conceptTypes)[number];
export const commonalityLevels = ["essential", "common", "additional"] as const;
export type Commonality = (typeof commonalityLevels)[number];
export const ratings = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof ratings)[number];

export type RubySegment = {
  text: string;
  reading: string | null;
};

export type VocabularyDetails = {
  /** Reading aids for the vocabulary expression in this lexical sense. */
  expressionFurigana: RubySegment[];
  /** Reading aids for the Japanese example, stored rather than guessed in the UI. */
  exampleFurigana: RubySegment[];
  /** Complete kana reading of the example, used to validate its ruby segments. */
  exampleReading: string;
  secondaryMeanings: string[];
  itemKind: "word" | "expression" | "phrase";
  linkedKanji: string[];
  /** `band` decides curriculum grouping directly; `rank` only orders within it. */
  priority: { rank: number; band: Commonality; reason: string };
  classification: {
    confidence: "high" | "medium" | "low";
    evidence: {
      sourceId: string;
      lineage: string;
      level: "N5" | "N4";
      /** Whether this source's own raw list agrees with the assigned level.
       * Null means the term could not be relocated in that source's raw list. */
      agrees: boolean | null;
    }[];
    reason: string;
  };
  provenance: {
    lexicalSourceIds: string[];
    /** A real JMdict entry/sense match, independent of ruby sourcing below. */
    dictionary: { entryId: string; senseIds: string[]; glossOverlap: number } | null;
    /** Whether JmdictFurigana supplied the word ruby, vs. a generated fallback. */
    ruby: { source: "jmdict-furigana" | "generated"; wordExact: boolean };
    example: {
      kind: "imported" | "editorial" | "fallback";
      attribution: { sourceId: "tatoeba"; sentenceId: string } | null;
    };
  };
  targetSpans: {
    start: number;
    end: number;
    surface: string;
    lemma: string;
    match: "exact" | "inflected" | "counter";
  }[];
  review: {
    lexical: "pending" | "reviewed";
    example: "pending" | "reviewed";
    furigana: "automated" | "reviewed" | "uncertain";
    /** Distinguishes automated, agent, and human review; null until reviewed. */
    reviewer: string | null;
    notes: string[];
  };
  /** The Phase 2 mechanical approval gate. Only approved records reach the
   * active app; see activeVocabularyItems in vocabulary-data.ts. */
  approval: { approved: boolean; reasons: string[] };
};

export interface Concept {
  id: string;
  type: ConceptType;
  expression: string;
  reading: string;
  meaning: string;
  level: "N5" | "N4";
  curriculumUnit: string;
  sequence: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  source: string;
  kanjiForm?: string;
  partOfSpeech?: string;
  classificationNote?: string;
  commonality?: Commonality;
  vocabulary?: VocabularyDetails;
  example: string;
  exampleMeaning: string;
  note: string;
  topic: string;
  question?: string;
  answer?: string;
}

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");

export const goalSchema = z.object({
  targetDate: dateSchema,
  dailyMinutes: z.number().int().min(10).max(60),
  targetLevel: z.literal("N4"),
  studyMode: z.enum(["N5", "N4"]).default("N5"),
  timeZone: z
    .string()
    .max(100)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid time zone."),
});
export type StudyGoal = z.infer<typeof goalSchema>;

export const progressStatusSchema = z
  .enum(["introduced", "learning", "mastered", "learned"])
  .transform((status) => (status === "learned" ? "mastered" : status));

export const progressSchema = z.object({
  conceptId: z.string(),
  status: progressStatusSchema,
  reviewCount: z.number().int().nonnegative(),
  successStreak: z.number().int().nonnegative(),
  intervalDays: z.number().nonnegative(),
  dueAt: z.iso.datetime(),
  lastReviewedAt: z.iso.datetime(),
});
export type ConceptProgress = z.infer<typeof progressSchema>;

export const reviewSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  conceptId: z.string(),
  rating: z.enum(ratings),
  reviewedAt: z.iso.datetime(),
  intervalDays: z.number().nonnegative(),
});
export type Review = z.infer<typeof reviewSchema>;

export const sessionSchema = z.object({
  id: z.uuid(),
  mode: z.enum(["N5", "N4"]).default("N5"),
  date: dateSchema,
  conceptIds: z.array(z.string()),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export type StudySession = z.infer<typeof sessionSchema>;

export const stateSchema = z.object({
  version: z.literal(1),
  goal: goalSchema,
  progress: z.array(progressSchema),
  sessions: z.array(sessionSchema),
  reviews: z.array(reviewSchema),
});
export type StudyState = z.infer<typeof stateSchema>;

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), id: z.uuid() }),
  z.object({
    type: z.literal("completeRetired"),
    sessionId: z.uuid(),
  }),
  z.object({
    type: z.literal("review"),
    id: z.uuid(),
    sessionId: z.uuid(),
    conceptId: z.string().max(100),
    rating: z.enum(ratings),
  }),
  z.object({ type: z.literal("goal"), goal: goalSchema }),
]);
export type StudyAction = z.infer<typeof actionSchema>;

export interface StudyRepository {
  load(): Promise<StudyState>;
  dispatch(action: StudyAction): Promise<StudyState>;
}
