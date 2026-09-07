import { concepts } from "./content";
import { curriculumProgress, curriculumTypes, type CurriculumType } from "./curriculum-progress";
import { dateInZone, daysUntil } from "./dates";
import { scheduleReview } from "./scheduler";
import type { ConceptProgress, StudyState } from "./types";

const DAY_MS = 86_400_000;

function nextCalendarDay(date: string): string {
  return dateInZone(new Date(Date.parse(`${date}T12:00:00Z`) + DAY_MS), "UTC");
}

export type MasteryHistoryPoint = { date: string } & Record<CurriculumType | "total", number>;

/**
 * Reconstructs how many N5/N4 items were mastered on each calendar day by
 * replaying every past review through the same `scheduleReview` used live,
 * rather than reading from a separate history table -- none exists, and
 * `state.reviews` already keeps every review ever made with its real
 * timestamp, so this is a faithful reconstruction, not an estimate.
 *
 * Returns one point per calendar day from the first tracked review through
 * `now`. Empty when there is no review history yet (nothing to chart).
 */
export function masteryHistory(state: StudyState, now: Date): MasteryHistoryPoint[] {
  const trackedTypes = new Set<string>(curriculumTypes);
  const typeById = new Map(
    concepts
      .filter(
        (item) =>
          trackedTypes.has(item.type) && (item.level === "N5" || item.level === "N4"),
      )
      .map((item) => [item.id, item.type]),
  );
  const reviews = state.reviews
    .filter((review) => typeById.has(review.conceptId))
    .slice()
    .sort((a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt));
  if (!reviews.length) return [];

  const timeZone = state.goal.timeZone;
  const progressByConcept = new Map<string, ConceptProgress>();
  const mastered: Record<CurriculumType, Set<string>> = {
    vocabulary: new Set(),
    kanji: new Set(),
    grammar: new Set(),
  };
  function snapshot(date: string): MasteryHistoryPoint {
    return {
      date,
      vocabulary: mastered.vocabulary.size,
      kanji: mastered.kanji.size,
      grammar: mastered.grammar.size,
      total: mastered.vocabulary.size + mastered.kanji.size + mastered.grammar.size,
    };
  }

  const firstDay = dateInZone(new Date(reviews[0].reviewedAt), timeZone);
  const lastDay = dateInZone(now, timeZone);
  const points: MasteryHistoryPoint[] = [];
  let reviewIndex = 0;
  for (let cursor = firstDay; cursor <= lastDay; cursor = nextCalendarDay(cursor)) {
    while (
      reviewIndex < reviews.length &&
      dateInZone(new Date(reviews[reviewIndex].reviewedAt), timeZone) === cursor
    ) {
      const review = reviews[reviewIndex];
      const type = typeById.get(review.conceptId) as CurriculumType;
      const previous = progressByConcept.get(review.conceptId);
      const next = scheduleReview(
        review.conceptId,
        review.rating,
        new Date(review.reviewedAt),
        previous,
      );
      progressByConcept.set(review.conceptId, next);
      if (next.status === "mastered") mastered[type].add(review.conceptId);
      else mastered[type].delete(review.conceptId);
      reviewIndex += 1;
    }
    points.push(snapshot(cursor));
  }
  return points;
}

export type PaceStatus = "complete" | "ahead" | "on-pace" | "behind" | "unknown";

export type CurriculumPacing = {
  type: CurriculumType;
  total: number;
  mastered: number;
  remaining: number;
  daysRemaining: number;
  /** Items/day still needed to finish by the target date. Null once the
   * target date has passed with items still remaining -- there is no
   * meaningful daily rate for a deadline already missed. */
  requiredPacePerDay: number | null;
  /** Items mastered/day over the last 7 days. Null without a full 7 days
   * of tracked history -- shown as "more history needed", never guessed. */
  sevenDayPace: number | null;
  status: PaceStatus;
  /** Null unless sevenDayPace is a positive, real rate. */
  estimatedCompletionDate: string | null;
};

/** Pacing toward `state.goal.targetDate` for one curriculum type (vocabulary
 * by default, the highest-value metric per item count). */
export function pacing(
  state: StudyState,
  now: Date,
  type: CurriculumType = "vocabulary",
): CurriculumPacing {
  const combined = curriculumProgress(state, type)[2];
  const total = combined.total;
  const mastered = combined.mastered;
  const remaining = Math.max(0, total - mastered);
  const daysRemaining = daysUntil(state.goal.targetDate, now, state.goal.timeZone);
  const requiredPacePerDay =
    remaining === 0 ? 0 : daysRemaining > 0 ? remaining / daysRemaining : null;

  const history = masteryHistory(state, now);
  const timeZone = state.goal.timeZone;
  const sevenDaysAgo = dateInZone(new Date(now.getTime() - 7 * DAY_MS), timeZone);
  let sevenDayPace: number | null = null;
  if (history.length && history[0].date <= sevenDaysAgo) {
    const latest = history[history.length - 1];
    const past = history.find((point) => point.date === sevenDaysAgo) ?? history[0];
    sevenDayPace = (latest[type] - past[type]) / 7;
  }

  let status: PaceStatus;
  if (remaining === 0) status = "complete";
  else if (daysRemaining === 0) status = "behind";
  else if (sevenDayPace === null) status = "unknown";
  else {
    const ratio = sevenDayPace / (requiredPacePerDay || Infinity);
    status = ratio >= 1.05 ? "ahead" : ratio >= 0.95 ? "on-pace" : "behind";
  }

  let estimatedCompletionDate: string | null = null;
  if (remaining === 0) estimatedCompletionDate = dateInZone(now, timeZone);
  else if (sevenDayPace && sevenDayPace > 0) {
    const daysNeeded = Math.ceil(remaining / sevenDayPace);
    estimatedCompletionDate = dateInZone(
      new Date(now.getTime() + daysNeeded * DAY_MS),
      timeZone,
    );
  }

  return {
    type,
    total,
    mastered,
    remaining,
    daysRemaining,
    requiredPacePerDay,
    sevenDayPace,
    status,
    estimatedCompletionDate,
  };
}
