import { z } from "zod";

export const conceptTypes = [
  "vocabulary",
  "kanji",
  "grammar",
  "reading",
  "listening",
  "kana",
] as const;
export type ConceptType = (typeof conceptTypes)[number];
export const commonalityLevels = ["essential", "common", "additional"] as const;
export type Commonality = (typeof commonalityLevels)[number];
export const ratings = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof ratings)[number];
// A concept's level doubles as its study-mode routing key: which mode a
// concept belongs to, and which mode a goal/session is currently in. N5/N4
// are the JLPT corpus; "tae-kim" is the personal-use Tae Kim/anime course
// (see src/lib/study/tae-kim.ts) -- mined for this user's own study, not
// redistributed, so it is exempt from the JLPT corpus's licensing rigor.
// "kana" is the hiragana/katakana foundation track (see
// src/lib/study/kana.ts) -- unlike the others it is never selected through
// the goal.studyMode picker; it has its own always-available /kana section
// (chart / free-practice study / quiz, see kana-quiz.ts and
// kana-progress.ts) so it doesn't compete with "which JLPT track am I
// studying", and it has no daily SRS session of its own.
export const studyModes = ["N5", "N4", "tae-kim", "kana"] as const;
export type StudyMode = (typeof studyModes)[number];
// Kana has free-select Study/Quiz tools rather than a daily session queue, so
// it intentionally has no new-card setting.
export const queuedStudyModes = ["N5", "N4", "tae-kim"] as const;
export type QueuedStudyMode = (typeof queuedStudyModes)[number];

export const kanaScripts = ["hiragana", "katakana"] as const;
export type KanaScript = (typeof kanaScripts)[number];
export const kanaCategories = [
  "basic",
  "dakuten",
  "handakuten",
  "yoon",
  "small",
  "extended",
] as const;
export type KanaCategory = (typeof kanaCategories)[number];
/** Recognition drills the symbol -> sound direction (show か, ask "ka").
 * Recall drills sound -> symbol (show "ka", ask for か). Each direction is
 * tracked as its own Concept (its own id, its own ConceptProgress row) so
 * both contribute independently toward mastery -- see kana-progress.ts's
 * recordKanaQuizAnswer (a 5-correct-streak rule specific to kana, unrelated
 * to the vocabulary/kanji/grammar scheduler) and characterStatus (which
 * combines both directions into one status for the chart/Progress page). */
export const kanaDirections = ["recognition", "recall"] as const;
export type KanaDirection = (typeof kanaDirections)[number];

export type KanaDetails = {
  /** The kana symbol itself, shared by both directions' concepts for the
   * same character -- lets the UI/chart group a recognition+recall pair
   * back into one visual character. */
  character: string;
  script: KanaScript;
  /** Gojūon row grouping used by the chart, e.g. "k" for か/き/く/け/こ, or
   * "ext" for the foreign-sound katakana combinations. */
  row: string;
  /** Vowel column (a/i/u/e/o), "ya"/"yu"/"yo" for yōon, or a free-form key
   * for special entries (sokuon, chōon, extended combinations). */
  column: string;
  category: KanaCategory;
  /** 1-based curriculum stage within this script (see kana.ts's `stages`),
   * e.g. 1 = あ-row, 11 = dakuten/handakuten, 12 = yōon. Pure grouping/
   * labeling for the chart and the quiz/study selector's "select this row"
   * shortcut -- kana mode has no gating, so this never blocks anything. */
  stage: number;
  /** Global order within this script's full curriculum -- finer-grained
   * than `stage`. Used only for stable/predictable ordering in the chart
   * and selector, not for any unlock sequencing. */
  curriculumOrder: number;
  direction: KanaDirection;
  /** The base character this one derives from, e.g. か for が, き for きゃ.
   * Null for basic kana and for sokuon/chōon, which don't derive from a
   * single base. */
  relatedKana: string | null;
  /** Other characters (same script) commonly confused with this one, e.g.
   * さ <-> き. Symmetric by construction. Used to bias multiple-choice
   * distractors toward real confusion risks instead of random options. */
  confusionSet: string[];
  /** Short functional explanation, only populated for entries that aren't
   * a simple symbol->sound pair (sokuon, chōon) -- never a full sentence. */
  note: string | null;
};

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
    dictionary: {
      entryId: string;
      senseIds: string[];
      glossOverlap: number;
    } | null;
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
  /** Romaji transliteration of `expression`, mined from the Tae Kim course's
   * source Anki deck. Only populated for that course's sentence cards. */
  romaji?: string;
  /** Mechanically-generated furigana for `expression`, only kept when its
   * reconstructed reading exactly matched the Tae Kim deck's own stored
   * reading (scripts/generate-tae-kim-furigana.py) -- sentences where the
   * tagger wasn't confident are simply left without this field rather than
   * risk showing a wrong reading. JLPT vocabulary uses the richer, reviewed
   * `vocabulary.expressionFurigana` instead; this is the Tae Kim-only path. */
  expressionFurigana?: RubySegment[];
  meaning: string;
  level: StudyMode;
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
  kanaDetails?: KanaDetails;
  example: string;
  exampleMeaning: string;
  note: string;
  topic: string;
  question?: string;
  answer?: string;
  /** Audio/screenshot media for tae-kim course cards, served from
   * /tae-kim/media (gitignored; regenerated by scripts/mine-tae-kim-deck.py).
   * Paths are relative to that directory, e.g. "1600420050000.mp3". */
  media?: { audio?: string; image?: string; sourceShow?: string };
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

const newCardsPerDayValueSchema = z.number().int().min(5).max(25);
const newCardsPerDayByModeSchema = z.object({
  N5: newCardsPerDayValueSchema,
  N4: newCardsPerDayValueSchema,
  "tae-kim": newCardsPerDayValueSchema,
});

export const goalSchema = z.object({
  targetDate: dateSchema,
  dailyMinutes: z.number().int().min(10).max(60),
  // Each queued mode has its own intake pace. Older browser exports stored a
  // single number, so accept and expand it while reading saved state.
  newCardsPerDay: z
    .union([newCardsPerDayByModeSchema, newCardsPerDayValueSchema])
    .default(9)
    .transform((value) =>
      typeof value === "number"
        ? { N5: value, N4: value, "tae-kim": value }
        : value,
    ),
  targetLevel: z.literal("N4"),
  studyMode: z.enum(studyModes).default("N5"),
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
  mode: z.enum(studyModes).default("N5"),
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
    /** The "already know this" shortcut (kana-home.tsx): declares a set of
     * kana concepts mastered outright, without going through real reviews.
     * Used for marking a single row, a whole script, or skipping Kana
     * entirely (pass every kana concept id). */
    type: z.literal("markKanaKnown"),
    conceptIds: z.array(z.string().max(100)).min(1).max(500),
  }),
  z.object({
    /** One Kana Quiz mode answer (kana-quiz.tsx). Kana has no daily SRS
     * session -- this is a direct, immediate progress write, not tied to a
     * StudySession, since a quiz is a freely customized selection the
     * learner can requiz at will. See recordKanaQuizAnswer in
     * kana-progress.ts: mastery is a streak of 5 correct answers in a row,
     * unrelated to the vocabulary/kanji/grammar scheduler. */
    type: z.literal("kanaQuizAnswer"),
    conceptId: z.string().max(100),
    correct: z.boolean(),
  }),
  z.object({
    type: z.literal("completeRetired"),
    sessionId: z.uuid(),
  }),
  z.object({
    /** "Repeat today's lesson" (dashboard.tsx / study-session.tsx): undoes a
     * finished session entirely, as if it had never been started -- deletes
     * its reviews and the session itself, and rewinds each reviewed
     * concept's progress to exactly what it was beforehand (see
     * scheduler.ts's progressAsOf, which replays the concept's remaining
     * review history). A concept with no earlier reviews goes back to fully
     * unseen. Only a completed session can be repeated. */
    type: z.literal("repeatSession"),
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
