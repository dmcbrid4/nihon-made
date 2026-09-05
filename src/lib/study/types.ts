import { z } from "zod";

export const conceptTypes = [
  "vocabulary",
  "kanji",
  "grammar",
  "reading",
] as const;
export type ConceptType = (typeof conceptTypes)[number];
export const ratings = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof ratings)[number];

export interface Concept {
  id: string;
  type: ConceptType;
  expression: string;
  reading: string;
  meaning: string;
  level: "N5" | "N4";
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

export const progressSchema = z.object({
  conceptId: z.string(),
  status: z.enum(["learning", "learned"]),
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
