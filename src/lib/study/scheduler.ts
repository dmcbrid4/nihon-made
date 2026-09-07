import type { ConceptProgress, Rating, Review } from "./types";

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
  const status = !previous
    ? "introduced"
    : successStreak >= 3 && intervalDays >= 7
      ? "mastered"
      : "learning";
  return {
    conceptId,
    status,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    successStreak,
    intervalDays,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

/** Reconstructs a concept's progress from a set of reviews, by replaying
 * scheduleReview in chronological order -- since scheduleReview is a pure
 * function of (rating, reviewedAt, previous), this gives exactly the
 * progress that existed at any point in the concept's history. Used to
 * "undo" a session: pass every review for the concept except the ones being
 * undone, and this rebuilds what progress looked like right before them.
 * Returns undefined if the concept has no remaining review history at all
 * (i.e. it goes back to fully unseen). */
export function progressAsOf(
  conceptId: string,
  reviews: Pick<Review, "conceptId" | "rating" | "reviewedAt">[],
): ConceptProgress | undefined {
  const ordered = reviews
    .filter((review) => review.conceptId === conceptId)
    .sort((a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt));
  let progress: ConceptProgress | undefined;
  for (const review of ordered)
    progress = scheduleReview(
      conceptId,
      review.rating,
      new Date(review.reviewedAt),
      progress,
    );
  return progress;
}
