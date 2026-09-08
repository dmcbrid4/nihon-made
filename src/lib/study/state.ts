import { conceptById } from "./content";
import { dateInZone } from "./dates";
import { currentSession, planSession } from "./planner";
import { recordKanaQuizAnswer } from "./kana-progress";
import { progressAsOf, scheduleReview } from "./scheduler";
import {
  actionSchema,
  type ConceptProgress,
  type StudyAction,
  type StudyState,
} from "./types";

export function initialState(timeZone = "America/New_York"): StudyState {
  return {
    version: 1,
    goal: {
      targetDate: "2027-01-15",
      dailyMinutes: 25,
      newCardsPerDay: { N5: 9, N4: 9, "tae-kim": 9 },
      targetLevel: "N4",
      studyMode: "N5",
      timeZone,
    },
    progress: [],
    sessions: [],
    reviews: [],
  };
}

export function applyAction(
  state: StudyState,
  input: StudyAction,
  now = new Date(),
): StudyState {
  const action = actionSchema.parse(input);
  if (action.type === "goal") {
    // Settings (daily minutes / new-cards-per-day / mode) take effect
    // immediately, including for a same-day session that's already been
    // created but not finished -- otherwise a pace change silently waits
    // until tomorrow, which is surprising. Already-reviewed cards in that
    // session are left exactly as they are; only the not-yet-reviewed tail
    // is replaced with a fresh plan under the new goal (which naturally
    // excludes anything reviewed today, since reviewing it just wrote a
    // fresh progress row for it). A completed session is left untouched --
    // "Repeat today's lesson" is the way to redo it under new settings.
    const goal = action.goal;
    const next = { ...state, goal };
    const today = dateInZone(now, goal.timeZone);
    const session = next.sessions.find(
      (item) =>
        item.mode === goal.studyMode &&
        item.date === today &&
        !item.completedAt,
    );
    if (!session) return next;
    const reviewedIds = new Set(
      next.reviews
        .filter((review) => review.sessionId === session.id)
        .map((review) => review.conceptId),
    );
    const kept = session.conceptIds.filter((id) => reviewedIds.has(id));
    const fresh = planSession(next, now)
      .map((item) => item.id)
      .filter((id) => !reviewedIds.has(id));
    return {
      ...next,
      sessions: next.sessions.map((item) =>
        item.id === session.id
          ? { ...item, conceptIds: [...kept, ...fresh] }
          : item,
      ),
    };
  }
  if (action.type === "start") {
    if (
      currentSession(state, now) ||
      state.sessions.some((session) => session.id === action.id)
    )
      return state;
    const items = planSession(state, now);
    if (!items.length) return state;
    return {
      ...state,
      sessions: [
        ...state.sessions,
        {
          id: action.id,
          mode: state.goal.studyMode,
          date: dateInZone(now, state.goal.timeZone),
          conceptIds: items.map((item) => item.id),
          startedAt: now.toISOString(),
          completedAt: null,
        },
      ],
    };
  }

  if (action.type === "kanaQuizAnswer") {
    if (conceptById.get(action.conceptId)?.type !== "kana") return state;
    const nextProgress = recordKanaQuizAnswer(
      action.conceptId,
      action.correct,
      now,
      state.progress.find((item) => item.conceptId === action.conceptId),
    );
    return {
      ...state,
      progress: [
        ...state.progress.filter((item) => item.conceptId !== action.conceptId),
        nextProgress,
      ],
    };
  }

  if (action.type === "markKanaKnown") {
    const dueAt = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    const nowIso = now.toISOString();
    const targetIds = new Set(
      action.conceptIds.filter((id) => conceptById.get(id)?.type === "kana"),
    );
    if (!targetIds.size) return state;
    const marked: ConceptProgress[] = [...targetIds].map((conceptId) => ({
      conceptId,
      status: "mastered",
      reviewCount: 3,
      successStreak: 3,
      intervalDays: 30,
      dueAt,
      lastReviewedAt: nowIso,
    }));
    return {
      ...state,
      progress: [
        ...state.progress.filter((item) => !targetIds.has(item.conceptId)),
        ...marked,
      ],
    };
  }

  if (action.type === "repeatSession") {
    const session = state.sessions.find((item) => item.id === action.sessionId);
    if (!session || !session.completedAt)
      throw new Error("Only a finished session can be repeated.");
    const undoneConceptIds = new Set(
      state.reviews
        .filter((review) => review.sessionId === session.id)
        .map((review) => review.conceptId),
    );
    const remainingReviews = state.reviews.filter(
      (review) => review.sessionId !== session.id,
    );
    const revertedProgress = [...undoneConceptIds]
      .map((conceptId) => progressAsOf(conceptId, remainingReviews))
      .filter((item): item is ConceptProgress => !!item);
    return {
      ...state,
      sessions: state.sessions.filter((item) => item.id !== session.id),
      reviews: remainingReviews,
      progress: [
        ...state.progress.filter(
          (item) => !undoneConceptIds.has(item.conceptId),
        ),
        ...revertedProgress,
      ],
    };
  }

  if (action.type === "completeRetired") {
    const session = state.sessions.find((item) => item.id === action.sessionId);
    if (!session || session.completedAt)
      throw new Error(
        "This session has already ended. Return to Today to continue.",
      );
    const reviewed = new Set(
      state.reviews
        .filter((review) => review.sessionId === session.id)
        .map((review) => review.conceptId),
    );
    const unresolved = session.conceptIds.filter((id) => !reviewed.has(id));
    // "Retired" here means "no longer resolvable", not specifically listed
    // in retiredConceptIds -- a concept can also drop out of conceptById by
    // losing mechanical approval (see vocabulary-data.ts's approval gate)
    // without ever being added to that narrower, explicit-retirement set.
    // Match the same check the UI already uses to decide there's nothing
    // left to review (see study-session.tsx's activeConceptIds).
    if (!unresolved.length || unresolved.some((id) => conceptById.has(id)))
      throw new Error("This session still has an available card.");
    return {
      ...state,
      sessions: state.sessions.map((item) =>
        item.id === session.id
          ? { ...item, completedAt: now.toISOString() }
          : item,
      ),
    };
  }

  // Retrying an interrupted request must never record a rating twice.
  if (state.reviews.some((review) => review.id === action.id)) return state;
  const session = state.sessions.find((item) => item.id === action.sessionId);
  if (!session || session.completedAt)
    throw new Error(
      "This session has already ended. Return to Today to continue.",
    );
  const reviewed = new Set(
    state.reviews
      .filter((review) => review.sessionId === session.id)
      .map((review) => review.conceptId),
  );
  const activeConceptIds = session.conceptIds.filter((id) =>
    conceptById.has(id),
  );
  const nextConceptId = activeConceptIds.find((id) => !reviewed.has(id));
  if (
    action.conceptId !== nextConceptId ||
    !conceptById.has(action.conceptId)
  ) {
    throw new Error(
      "This card has changed. Reload to pick up where you left off.",
    );
  }
  const nextProgress = scheduleReview(
    action.conceptId,
    action.rating,
    now,
    state.progress.find((item) => item.conceptId === action.conceptId),
  );
  return {
    ...state,
    progress: [
      ...state.progress.filter((item) => item.conceptId !== action.conceptId),
      nextProgress,
    ],
    reviews: [
      ...state.reviews,
      {
        id: action.id,
        sessionId: session.id,
        conceptId: action.conceptId,
        rating: action.rating,
        reviewedAt: now.toISOString(),
        intervalDays: nextProgress.intervalDays,
      },
    ],
    sessions: state.sessions.map((item) =>
      item.id === session.id && reviewed.size + 1 === activeConceptIds.length
        ? { ...item, completedAt: now.toISOString() }
        : item,
    ),
  };
}
