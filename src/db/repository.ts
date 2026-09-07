import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { initialState, applyAction } from "../lib/study/state";
import {
  stateSchema,
  type StudyAction,
  type StudyRepository,
  type StudyState,
} from "../lib/study/types";
import type { Database } from "./client";
import * as s from "./schema";

export class PostgresRepository implements StudyRepository {
  constructor(
    private db: Database,
    private userId: string,
  ) {
    z.uuid().parse(userId);
  }
  load() {
    return this.transact();
  }
  dispatch(action: StudyAction) {
    return this.transact(action);
  }

  async importState(input: StudyState): Promise<StudyState> {
    const imported = stateSchema.parse(input);
    return this.db.transaction(async (tx) => {
      const userId = this.userId;
      const conceptIds = new Set([
        ...imported.progress.map((item) => item.conceptId),
        ...imported.sessions.flatMap((session) => session.conceptIds),
        ...imported.reviews.map((review) => review.conceptId),
      ]);
      const knownConceptIds = new Set(
        (await tx.select({ id: s.studyConcepts.id }).from(s.studyConcepts)).map(
          (item) => item.id,
        ),
      );
      if ([...conceptIds].some((id) => !knownConceptIds.has(id)))
        throw new ImportValidationError(
          "The imported history has unknown concepts.",
        );
      if (
        new Set(imported.progress.map((item) => item.conceptId)).size !==
        imported.progress.length
      )
        throw new ImportValidationError(
          "The imported history has duplicate progress entries.",
        );
      if (
        new Set(imported.sessions.map((session) => session.id)).size !==
        imported.sessions.length
      )
        throw new ImportValidationError(
          "The imported history has duplicate sessions.",
        );
      if (
        new Set(imported.reviews.map((review) => review.id)).size !==
        imported.reviews.length
      )
        throw new ImportValidationError(
          "The imported history has duplicate reviews.",
        );
      const sessions = new Map(
        imported.sessions.map((session) => [session.id, session]),
      );
      const reviewPairs = new Set<string>();
      for (const session of imported.sessions) {
        if (new Set(session.conceptIds).size !== session.conceptIds.length)
          throw new ImportValidationError(
            "The imported session has duplicate concepts.",
          );
      }
      for (const review of imported.reviews) {
        const session = sessions.get(review.sessionId);
        if (!session || !session.conceptIds.includes(review.conceptId))
          throw new ImportValidationError(
            "The imported review does not belong to its session.",
          );
        const pair = `${review.sessionId}:${review.conceptId}`;
        if (reviewPairs.has(pair))
          throw new ImportValidationError(
            "The imported history reviews a card twice in one session.",
          );
        reviewPairs.add(pair);
      }

      await tx
        .insert(s.users)
        .values({ id: userId, name: "Personal learner" })
        .onConflictDoNothing();
      await tx
        .select()
        .from(s.users)
        .where(eq(s.users.id, userId))
        .for("update");
      const existingProgress = await tx
        .select({ conceptId: s.userConceptProgress.conceptId })
        .from(s.userConceptProgress)
        .where(eq(s.userConceptProgress.userId, userId));
      const existingSessions = await tx
        .select({ id: s.studySessions.id })
        .from(s.studySessions)
        .where(eq(s.studySessions.userId, userId));
      const existingReviews = await tx
        .select({ id: s.reviews.id })
        .from(s.reviews)
        .where(eq(s.reviews.userId, userId));
      if (
        existingProgress.length ||
        existingSessions.length ||
        existingReviews.length
      )
        throw new ImportConflictError(
          "Cloud history already contains study activity.",
        );

      await tx
        .insert(s.studyGoals)
        .values({ userId, ...imported.goal })
        .onConflictDoUpdate({
          target: s.studyGoals.userId,
          set: imported.goal,
        });
      if (imported.progress.length)
        await tx
          .insert(s.userConceptProgress)
          .values(imported.progress.map((item) => ({ ...item, userId })));
      if (imported.sessions.length) {
        await tx.insert(s.studySessions).values(
          imported.sessions.map((session) => ({
            id: session.id,
            userId,
            mode: session.mode,
            date: session.date,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
          })),
        );
        await tx.insert(s.studySessionItems).values(
          imported.sessions.flatMap((session) =>
            session.conceptIds.map((conceptId, position) => ({
              sessionId: session.id,
              conceptId,
              position,
            })),
          ),
        );
      }
      if (imported.reviews.length)
        await tx
          .insert(s.reviews)
          .values(imported.reviews.map((review) => ({ ...review, userId })));
      return imported;
    });
  }

  private async transact(action?: StudyAction): Promise<StudyState> {
    return this.db.transaction(async (tx) => {
      const userId = this.userId;
      await tx
        .insert(s.users)
        .values({ id: userId, name: "Personal learner" })
        .onConflictDoNothing();
      // Serialize mutations for this learner, including requests from other devices.
      await tx
        .select()
        .from(s.users)
        .where(eq(s.users.id, userId))
        .for("update");
      await tx
        .insert(s.studyGoals)
        .values({ userId, ...initialState().goal })
        .onConflictDoNothing();
      const [goal] = await tx
        .select()
        .from(s.studyGoals)
        .where(eq(s.studyGoals.userId, userId));
      const progress = await tx
        .select()
        .from(s.userConceptProgress)
        .where(eq(s.userConceptProgress.userId, userId));
      const sessions = await tx
        .select()
        .from(s.studySessions)
        .where(eq(s.studySessions.userId, userId))
        .orderBy(asc(s.studySessions.startedAt));
      const items = await tx
        .select({
          sessionId: s.studySessionItems.sessionId,
          conceptId: s.studySessionItems.conceptId,
        })
        .from(s.studySessionItems)
        .innerJoin(
          s.studySessions,
          eq(s.studySessionItems.sessionId, s.studySessions.id),
        )
        .where(eq(s.studySessions.userId, userId))
        .orderBy(asc(s.studySessionItems.position));
      const reviews = await tx
        .select()
        .from(s.reviews)
        .where(eq(s.reviews.userId, userId))
        .orderBy(asc(s.reviews.reviewedAt));
      const iso = (value: string) => new Date(value).toISOString();
      const state = stateSchema.parse({
        version: 1,
        goal,
        progress: progress.map((item) => ({
          ...item,
          dueAt: iso(item.dueAt),
          lastReviewedAt: iso(item.lastReviewedAt),
        })),
        sessions: sessions.map((session) => ({
          ...session,
          startedAt: iso(session.startedAt),
          completedAt: session.completedAt ? iso(session.completedAt) : null,
          conceptIds: items
            .filter((item) => item.sessionId === session.id)
            .map((item) => item.conceptId),
        })),
        reviews: reviews.map((review) => ({
          ...review,
          reviewedAt: iso(review.reviewedAt),
        })),
      });
      if (!action) return state;
      const next = applyAction(state, action);
      if (next === state) return state;
      if (action.type === "goal") {
        await tx
          .update(s.studyGoals)
          .set(next.goal)
          .where(eq(s.studyGoals.userId, userId));
      } else if (action.type === "start") {
        const session = next.sessions.at(-1)!;
        await tx.insert(s.studySessions).values({
          id: session.id,
          userId,
          mode: session.mode,
          date: session.date,
          startedAt: session.startedAt,
        });
        await tx.insert(s.studySessionItems).values(
          session.conceptIds.map((conceptId, position) => ({
            sessionId: session.id,
            conceptId,
            position,
          })),
        );
      } else if (action.type === "markKanaKnown") {
        const marked = next.progress.filter((item) =>
          action.conceptIds.includes(item.conceptId),
        );
        if (marked.length)
          await tx
            .insert(s.userConceptProgress)
            .values(marked.map((entry) => ({ ...entry, userId })))
            .onConflictDoUpdate({
              target: [
                s.userConceptProgress.userId,
                s.userConceptProgress.conceptId,
              ],
              set: {
                status: sql`excluded.status`,
                reviewCount: sql`excluded.review_count`,
                successStreak: sql`excluded.success_streak`,
                intervalDays: sql`excluded.interval_days`,
                dueAt: sql`excluded.due_at`,
                lastReviewedAt: sql`excluded.last_reviewed_at`,
              },
            });
      } else if (action.type === "kanaQuizAnswer") {
        const entry = next.progress.find(
          (item) => item.conceptId === action.conceptId,
        )!;
        await tx
          .insert(s.userConceptProgress)
          .values({ ...entry, userId })
          .onConflictDoUpdate({
            target: [
              s.userConceptProgress.userId,
              s.userConceptProgress.conceptId,
            ],
            set: {
              status: sql`excluded.status`,
              reviewCount: sql`excluded.review_count`,
              successStreak: sql`excluded.success_streak`,
              intervalDays: sql`excluded.interval_days`,
              dueAt: sql`excluded.due_at`,
              lastReviewedAt: sql`excluded.last_reviewed_at`,
            },
          });
      } else if (action.type === "repeatSession") {
        const undoneConceptIds = new Set(
          state.reviews
            .filter((review) => review.sessionId === action.sessionId)
            .map((review) => review.conceptId),
        );
        // Reviews must go first -- reviews.sessionId has no ON DELETE
        // CASCADE, unlike study_session_items, which does.
        await tx
          .delete(s.reviews)
          .where(eq(s.reviews.sessionId, action.sessionId));
        await tx
          .delete(s.studySessions)
          .where(eq(s.studySessions.id, action.sessionId));
        const stillTracked = new Set(
          next.progress.map((item) => item.conceptId),
        );
        const toForget = [...undoneConceptIds].filter(
          (id) => !stillTracked.has(id),
        );
        if (toForget.length)
          await tx
            .delete(s.userConceptProgress)
            .where(
              and(
                eq(s.userConceptProgress.userId, userId),
                inArray(s.userConceptProgress.conceptId, toForget),
              ),
            );
        const toRevert = next.progress.filter((item) =>
          undoneConceptIds.has(item.conceptId),
        );
        if (toRevert.length)
          await tx
            .insert(s.userConceptProgress)
            .values(toRevert.map((entry) => ({ ...entry, userId })))
            .onConflictDoUpdate({
              target: [
                s.userConceptProgress.userId,
                s.userConceptProgress.conceptId,
              ],
              set: {
                status: sql`excluded.status`,
                reviewCount: sql`excluded.review_count`,
                successStreak: sql`excluded.success_streak`,
                intervalDays: sql`excluded.interval_days`,
                dueAt: sql`excluded.due_at`,
                lastReviewedAt: sql`excluded.last_reviewed_at`,
              },
            });
      } else if (action.type === "completeRetired") {
        const session = next.sessions.find(
          (item) => item.id === action.sessionId,
        )!;
        await tx
          .update(s.studySessions)
          .set({ completedAt: session.completedAt })
          .where(eq(s.studySessions.id, session.id));
      } else {
        const review = next.reviews.at(-1)!;
        const entry = next.progress.find(
          (item) => item.conceptId === action.conceptId,
        )!;
        await tx.insert(s.reviews).values({ ...review, userId });
        await tx
          .insert(s.userConceptProgress)
          .values({ ...entry, userId })
          .onConflictDoUpdate({
            target: [
              s.userConceptProgress.userId,
              s.userConceptProgress.conceptId,
            ],
            set: entry,
          });
        const session = next.sessions.find(
          (item) => item.id === action.sessionId,
        )!;
        await tx
          .update(s.studySessions)
          .set({ completedAt: session.completedAt })
          .where(eq(s.studySessions.id, session.id));
      }
      return next;
    });
  }
}

export class ImportConflictError extends Error {}
export class ImportValidationError extends Error {}
