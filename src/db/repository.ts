import { asc, eq } from "drizzle-orm";
import { initialState, applyAction } from "../lib/study/state";
import {
  stateSchema,
  type StudyAction,
  type StudyRepository,
  type StudyState,
} from "../lib/study/types";
import type { Database } from "./client";
import * as s from "./schema";

export const PERSONAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export class PostgresRepository implements StudyRepository {
  constructor(private db: Database) {}
  load() {
    return this.transact();
  }
  dispatch(action: StudyAction) {
    return this.transact(action);
  }

  private async transact(action?: StudyAction): Promise<StudyState> {
    return this.db.transaction(async (tx) => {
      const userId = PERSONAL_USER_ID;
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
