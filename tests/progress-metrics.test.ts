import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { concepts } from "../src/lib/study/content";
import {
  curriculumOverview,
  curriculumProgress,
  knowledgeStateBreakdown,
  milestones,
} from "../src/lib/study/curriculum-progress";
import { formatTargetDate, daysUntil } from "../src/lib/study/dates";
import { masteryHistory, pacing } from "../src/lib/study/progress-metrics";
import { initialState } from "../src/lib/study/state";
import { scheduleReview } from "../src/lib/study/scheduler";
import type { Review } from "../src/lib/study/types";

const now = new Date("2026-09-04T15:00:00Z");

const n5Vocab = concepts.find((item) => item.type === "vocabulary" && item.level === "N5")!;
const n4Vocab = concepts.find((item) => item.type === "vocabulary" && item.level === "N4")!;
const n5Kanji = concepts.find((item) => item.type === "kanji" && item.level === "N5")!;
const n4Grammar = concepts.find((item) => item.type === "grammar" && item.level === "N4")!;

function review(conceptId: string, rating: Review["rating"], at: Date): Review {
  return {
    id: randomUUID(),
    sessionId: randomUUID(),
    conceptId,
    rating,
    reviewedAt: at.toISOString(),
    intervalDays: 0,
  };
}

test("curriculumProgress reports real N5, N4-only, and combined totals with no double counting", () => {
  const state = initialState();
  const [n5, n4, total] = curriculumProgress(state, "vocabulary");
  const expectedN5 = concepts.filter(
    (item) => item.type === "vocabulary" && item.level === "N5",
  ).length;
  const expectedN4 = concepts.filter(
    (item) => item.type === "vocabulary" && item.level === "N4",
  ).length;
  assert.equal(n5.total, expectedN5);
  assert.equal(n4.total, expectedN4);
  assert.equal(total.total, expectedN5 + expectedN4);
  // A zero-progress state puts every item in "unseen", not "mastered".
  assert.equal(n5.unseen, expectedN5);
  assert.equal(n5.mastered, 0);
});

test("curriculumProgress zero-state and completed-state behave without divide-by-zero", () => {
  const state = initialState();
  const overview = curriculumOverview(state);
  assert.equal(overview.vocabulary, 0);
  assert.equal(overview.kanji, 0);
  assert.equal(overview.grammar, 0);
  assert.equal(overview.overall, 0);

  const n5VocabIds = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N5")
    .map((item) => item.id);
  state.progress = n5VocabIds.map(
    (id) => ({ ...scheduleReview(id, "easy", now), status: "mastered" as const }),
  );
  const [n5] = curriculumProgress(state, "vocabulary");
  assert.equal(n5.mastered, n5.total);
  assert.equal(n5.mastered / n5.total, 1);
});

test("knowledgeStateBreakdown sums vocabulary, kanji, and grammar without inflating totals", () => {
  const state = initialState();
  state.progress = [
    { ...scheduleReview(n5Vocab.id, "easy", now), status: "mastered" as const },
    { ...scheduleReview(n5Kanji.id, "good", now), status: "learning" as const },
    { ...scheduleReview(n4Grammar.id, "good", now), status: "introduced" as const },
  ];
  const breakdown = knowledgeStateBreakdown(state);
  const combinedTotal =
    concepts.filter((item) => item.type === "vocabulary" && (item.level === "N5" || item.level === "N4")).length +
    concepts.filter((item) => item.type === "kanji" && (item.level === "N5" || item.level === "N4")).length +
    concepts.filter((item) => item.type === "grammar" && (item.level === "N5" || item.level === "N4")).length;
  assert.equal(breakdown.total, combinedTotal);
  assert.equal(breakdown.mastered, 1);
  assert.equal(breakdown.learning, 1);
  assert.equal(breakdown.introduced, 1);
  assert.equal(breakdown.unseen, combinedTotal - 3);
});

test("milestones only mark a subsection complete once every item in it is mastered", () => {
  const state = initialState();
  const n5VocabIds = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N5")
    .map((item) => item.id);
  state.progress = n5VocabIds
    .slice(0, -1)
    .map((id) => ({ ...scheduleReview(id, "easy", now), status: "mastered" as const }));
  let found = milestones(state).find((item) => item.type === "vocabulary" && item.level === "N5")!;
  assert.equal(found.complete, false);
  state.progress = n5VocabIds.map(
    (id) => ({ ...scheduleReview(id, "easy", now), status: "mastered" as const }),
  );
  found = milestones(state).find((item) => item.type === "vocabulary" && item.level === "N5")!;
  assert.equal(found.complete, true);
  assert.equal(found.mastered, found.total);
});

test("target-date helpers: countdown clamps to zero for a passed date and formats calendar-safe", () => {
  assert.equal(daysUntil("2020-01-01", now, "America/New_York"), 0);
  assert.equal(formatTargetDate("2027-01-15"), "January 15, 2027");
});

test("masteryHistory replays reviews chronologically into daily mastered counts", () => {
  const state = initialState();
  state.reviews = [
    review(n5Vocab.id, "good", new Date("2026-08-01T12:00:00Z")),
    review(n5Vocab.id, "good", new Date("2026-08-04T12:00:00Z")),
    review(n5Vocab.id, "good", new Date("2026-08-08T12:00:00Z")),
  ];
  const history = masteryHistory(state, new Date("2026-08-10T12:00:00Z"));
  assert.equal(history[0].date, "2026-08-01");
  assert.equal(history[history.length - 1].date, "2026-08-10");
  // Three consecutive "good" ratings with interval >= 7 crosses into mastered
  // on the third review (2026-08-08), so the count stays 0 before that day
  // and 1 from then on -- including days with no review that day.
  const before = history.find((point) => point.date === "2026-08-07")!;
  const onMastery = history.find((point) => point.date === "2026-08-08")!;
  const after = history.find((point) => point.date === "2026-08-09")!;
  assert.equal(before.vocabulary, 0);
  assert.equal(onMastery.vocabulary, 1);
  assert.equal(after.vocabulary, 1);
});

test("masteryHistory returns an empty series rather than fabricating history", () => {
  const state = initialState();
  assert.deepEqual(masteryHistory(state, now), []);
});

test("pacing requires a full 7 days of history before reporting a recent pace", () => {
  const state = initialState();
  state.goal.targetDate = "2027-01-15";
  state.reviews = [review(n5Vocab.id, "good", new Date(now.getTime() - 2 * 86_400_000))];
  const result = pacing(state, now, "vocabulary");
  assert.equal(result.sevenDayPace, null);
  assert.equal(result.status, "unknown");
  assert.equal(result.estimatedCompletionDate, null);
});

test("pacing reports complete status and no required pace once nothing remains", () => {
  const state = initialState();
  const n5VocabIds = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N5")
    .map((item) => item.id);
  const n4VocabIds = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N4")
    .map((item) => item.id);
  state.progress = [...n5VocabIds, ...n4VocabIds].map(
    (id) => ({ ...scheduleReview(id, "easy", now), status: "mastered" as const }),
  );
  const result = pacing(state, now, "vocabulary");
  assert.equal(result.remaining, 0);
  assert.equal(result.status, "complete");
  assert.equal(result.requiredPacePerDay, 0);
});

test("pacing treats a target date that has already passed as behind, not a divide-by-zero", () => {
  const state = initialState();
  state.goal.targetDate = "2020-01-01";
  state.progress = [{ ...scheduleReview(n4Vocab.id, "easy", now), status: "mastered" as const }];
  const result = pacing(state, now, "vocabulary");
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.requiredPacePerDay, null);
  assert.equal(result.status, "behind");
});

test("pacing classifies ahead of pace once a strong 7-day rate clearly beats the required pace", () => {
  const state = initialState();
  state.goal.targetDate = new Date(now.getTime() + 100 * 86_400_000).toISOString().slice(0, 10);
  const allVocabIds = [
    ...concepts.filter((item) => item.type === "vocabulary" && item.level === "N5").map((item) => item.id),
    ...concepts.filter((item) => item.type === "vocabulary" && item.level === "N4").map((item) => item.id),
  ];
  // Everything except 20 items is already mastered, so only 20 remain
  // against a target 100 days out -- a tiny required pace. Those 20 each
  // get a real three-review "easy" streak (the only way scheduleReview
  // reaches "mastered": streak >= 3 and interval >= 7 days), with the
  // mastering review landing today and the earlier two more than 7 days
  // back, so the 7-day trend shows a big recent jump.
  const pending = allVocabIds.slice(0, 20);
  const alreadyMastered = allVocabIds.slice(20);
  state.progress = alreadyMastered.map(
    (id) => ({ ...scheduleReview(id, "easy", now), status: "mastered" as const }),
  );
  const longAgo = new Date(now.getTime() - 30 * 86_400_000);
  const lessLongAgo = new Date(now.getTime() - 20 * 86_400_000);
  state.reviews = pending.flatMap((id) => [
    review(id, "easy", longAgo),
    review(id, "easy", lessLongAgo),
    review(id, "easy", now),
  ]);
  const result = pacing(state, now, "vocabulary");
  assert.equal(result.remaining, 20);
  assert.equal(result.sevenDayPace, 20 / 7);
  assert.ok(result.requiredPacePerDay !== null && result.requiredPacePerDay > 0);
  assert.equal(result.status, "ahead");
  assert.ok(result.estimatedCompletionDate);
});
