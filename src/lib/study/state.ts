import { conceptById, retiredConceptIds } from "./content";
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
      newCardsPerDay: 9,
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
  if (action.type === "goal") return { ...state, goal: action.goal };
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
        ...state.progress.filter((item) => !undoneConceptIds.has(item.conceptId)),
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
    if (
      !unresolved.length ||
      unresolved.some((id) => !retiredConceptIds.has(id))
    )
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
