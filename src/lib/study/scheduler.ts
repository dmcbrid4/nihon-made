import type { ConceptProgress, Rating } from "./types";

// Deliberately simple V1 policy. Replace this module with FSRS without changing
// review history, the repository contract, or the study UI.
export function intervalFor(
  rating: Rating,
  previous?: ConceptProgress,
): number {
  const interval = previous?.intervalDays ?? 0;
  switch (rating) {
    case "again":
      return 10 / (24 * 60);
    case "hard":
      return Math.max(1, Math.round(interval * 1.2));
    case "good":
      return Math.max(3, Math.round(interval * 2));
    case "easy":
      return Math.max(7, Math.round(interval * 3));
  }
}

export function scheduleReview(
  conceptId: string,
  rating: Rating,
  now: Date,
  previous?: ConceptProgress,
): ConceptProgress {
  const intervalDays = intervalFor(rating, previous);
  const successStreak =
    rating === "again" || rating === "hard"
      ? 0
      : (previous?.successStreak ?? 0) + 1;
  return {
    conceptId,
    status: successStreak >= 3 && intervalDays >= 7 ? "learned" : "learning",
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    successStreak,
    intervalDays,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
