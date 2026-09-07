import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { daysUntil, dateInZone } from "../src/lib/study/dates";
import { concepts } from "../src/lib/study/content";
import {
  currentSession,
  planSession,
  sessionMinutes,
} from "../src/lib/study/planner";
import { applyAction, initialState } from "../src/lib/study/state";
import { scheduleReview } from "../src/lib/study/scheduler";
import {
  actionSchema,
  dateSchema,
  goalSchema,
  type StudyState,
} from "../src/lib/study/types";
import { vocabularyProgress } from "../src/lib/study/vocabulary-progress";

const now = new Date("2026-09-04T15:00:00Z");

test("trip countdown uses calendar days across daylight saving and respects time zones", () => {
  assert.equal(
    daysUntil(
      "2026-11-02",
      new Date("2026-10-31T16:00:00Z"),
      "America/New_York",
    ),
    2,
  );
  assert.equal(
    dateInZone(new Date("2026-09-05T01:00:00Z"), "America/New_York"),
    "2026-09-04",
  );
  assert.equal(
    dateInZone(new Date("2026-09-05T01:00:00Z"), "Asia/Tokyo"),
    "2026-09-05",
  );
  assert.equal(daysUntil("2026-01-01", now, "America/New_York"), 0);
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
});

test("a new session balances five subjects and never exceeds the time budget", () => {
  const state = initialState();
  const plan = planSession(state, now);
  assert.equal(plan.length, 9);
  assert.deepEqual(
    new Set(plan.map((item) => item.type)),
    new Set(["vocabulary", "kanji", "grammar", "reading", "listening"]),
  );
  assert.ok(sessionMinutes(plan) <= state.goal.dailyMinutes);
  state.goal.dailyMinutes = 10;
  assert.ok(sessionMinutes(planSession(state, now)) <= 10);
});

test("new-card intake scales per type and stays independent for each study mode", () => {
  const state = initialState();
  state.goal.dailyMinutes = 60; // headroom so the minutes budget never caps this
  const countByType = (plan: ReturnType<typeof planSession>) =>
    Object.fromEntries(
      ["vocabulary", "kanji", "grammar", "reading", "listening"].map((type) => [
        type,
        plan.filter((item) => item.type === type).length,
      ]),
    );

  state.goal.newCardsPerDay.N5 = 9; // default matches the old hardcoded split exactly
  assert.deepEqual(countByType(planSession(state, now)), {
    vocabulary: 4,
    kanji: 2,
    grammar: 1,
    reading: 1,
    listening: 1,
  });

  state.goal.newCardsPerDay.N5 = 5;
  assert.deepEqual(countByType(planSession(state, now)), {
    vocabulary: 2,
    kanji: 1,
    grammar: 1,
    reading: 1,
    listening: 1,
  });

  // Changing another mode's pace must not silently change the active N5 plan.
  state.goal.newCardsPerDay.N4 = 25;
  state.goal.newCardsPerDay["tae-kim"] = 25;
  assert.deepEqual(countByType(planSession(state, now)), {
    vocabulary: 2,
    kanji: 1,
    grammar: 1,
    reading: 1,
    listening: 1,
  });

  state.goal.newCardsPerDay.N5 = 25;
  assert.deepEqual(countByType(planSession(state, now)), {
    vocabulary: 11,
    kanji: 6,
    grammar: 3,
    reading: 3,
    listening: 3,
  });
});

test("legacy shared new-card settings expand safely into all queued modes", () => {
  const legacy = goalSchema.parse({
    ...initialState().goal,
    newCardsPerDay: 13,
  });
  assert.deepEqual(legacy.newCardsPerDay, {
    N5: 13,
    N4: 13,
    "tae-kim": 13,
  });
});

test("overdue concepts precede unseen material and future reviews stay out", () => {
  const state = initialState();
  state.goal.studyMode = "N4";
  state.progress = [
    scheduleReview("k-ryo", "again", new Date(now.getTime() - 3_600_000)),
    scheduleReview("v-maniau", "easy", now),
  ];
  const plan = planSession(state, now);
  assert.equal(plan[0].id, "k-ryo");
  assert.ok(!plan.some((item) => item.id === "v-maniau"));
});

test("repeatSession undoes a finished session as if it never happened", () => {
  const earlier = new Date(now.getTime() - 5 * 86_400_000);
  const priorProgress = scheduleReview("k-ryo", "good", earlier);
  // A real prior review, not just a progress row -- repeatSession rebuilds
  // progress by replaying reviews, so the history has to actually exist.
  const priorReview = {
    id: randomUUID(),
    sessionId: randomUUID(),
    conceptId: "k-ryo",
    rating: "good" as const,
    reviewedAt: earlier.toISOString(),
    intervalDays: priorProgress.intervalDays,
  };
  let state: StudyState = {
    ...initialState(),
    progress: [priorProgress],
    reviews: [priorReview],
  };
  state.goal.studyMode = "N4";
  state = applyAction(state, { type: "start", id: randomUUID() }, now);
  const session = state.sessions[0];
  assert.ok(session.conceptIds.includes("k-ryo")); // due from its 3-day interval

  for (const conceptId of session.conceptIds)
    state = applyAction(
      state,
      {
        type: "review",
        id: randomUUID(),
        sessionId: session.id,
        conceptId,
        rating: "good",
      },
      now,
    );
  assert.ok(state.sessions[0].completedAt);
  assert.equal(state.reviews.length, session.conceptIds.length + 1); // +1 for priorReview
  assert.equal(
    state.progress.find((item) => item.conceptId === "k-ryo")!.reviewCount,
    2,
  );

  const undone = applyAction(
    state,
    { type: "repeatSession", sessionId: session.id },
    now,
  );
  assert.equal(undone.sessions.length, 0);
  // Today's reviews are gone, but the prior (unrelated-session) review stays.
  assert.deepEqual(undone.reviews, [priorReview]);
  // k-ryo had a review before this session -- it rewinds to exactly that,
  // not just "removed".
  assert.deepEqual(
    undone.progress.find((item) => item.conceptId === "k-ryo"),
    priorProgress,
  );
  // Every other concept in the session was unseen before it -- they go
  // back to having no progress record at all, not some default.
  assert.equal(undone.progress.length, 1);
  assert.ok(
    planSession(undone, now).some((item) => item.id === "k-ryo"),
    "k-ryo is due again after the undo",
  );

  assert.throws(
    () =>
      applyAction(
        undone,
        { type: "repeatSession", sessionId: session.id },
        now,
      ),
    /finished session/,
  );
  assert.throws(
    () =>
      applyAction(
        state,
        { type: "repeatSession", sessionId: randomUUID() },
        now,
      ),
    /finished session/,
  );
});

test("N5 and N4 modes plan and resume distinct sessions", () => {
  let state = initialState();
  const n5Plan = planSession(state, now);
  assert.ok(n5Plan.length);
  assert.ok(n5Plan.every((concept) => concept.level === "N5"));
  state = applyAction(state, { type: "start", id: randomUUID() }, now);
  assert.equal(state.sessions[0].mode, "N5");

  state = applyAction(state, {
    type: "goal",
    goal: { ...state.goal, studyMode: "N4" },
  });
  const n4Plan = planSession(state, now);
  assert.ok(n4Plan.length);
  assert.ok(n4Plan.every((concept) => concept.level === "N4"));
  state = applyAction(state, { type: "start", id: randomUUID() }, now);
  assert.equal(state.sessions.length, 2);
  assert.equal(state.sessions[1].mode, "N4");

  state = applyAction(state, {
    type: "goal",
    goal: { ...state.goal, studyMode: "N5" },
  });
  assert.equal(currentSession(state, now)?.id, state.sessions[0].id);
});

test("changing the pace/new-cards-per-day reflows today's untouched session immediately, without disturbing what's already reviewed or a finished session", () => {
  let state = initialState();
  state = applyAction(
    state,
    { type: "goal", goal: { ...state.goal, dailyMinutes: 60 } }, // headroom
    now,
  );
  state = applyAction(state, { type: "start", id: randomUUID() }, now);
  const original = state.sessions[0];
  assert.equal(original.conceptIds.length, 9); // default pace, nothing due yet

  // Bump N5's pace before touching anything -- an untouched same-day
  // session reflows immediately rather than waiting for tomorrow.
  state = applyAction(
    state,
    {
      type: "goal",
      goal: {
        ...state.goal,
        newCardsPerDay: { ...state.goal.newCardsPerDay, N5: 25 },
      },
    },
    now,
  );
  const resized = currentSession(state, now)!;
  assert.equal(resized.id, original.id);
  assert.ok(
    resized.conceptIds.length > 9,
    "picked up more new cards immediately",
  );
  assert.equal(state.reviews.length, 0);

  // Review the first card, then lower the pace back down -- the reviewed
  // card stays exactly where it is; only the untouched tail reflows.
  const reviewedId = resized.conceptIds[0];
  state = applyAction(
    state,
    {
      type: "review",
      id: randomUUID(),
      sessionId: original.id,
      conceptId: reviewedId,
      rating: "good",
    },
    now,
  );
  state = applyAction(
    state,
    {
      type: "goal",
      goal: {
        ...state.goal,
        newCardsPerDay: { ...state.goal.newCardsPerDay, N5: 9 },
      },
    },
    now,
  );
  const afterSecondResize = currentSession(state, now)!;
  assert.equal(afterSecondResize.conceptIds[0], reviewedId);
  assert.equal(
    state.reviews.filter((review) => review.sessionId === original.id).length,
    1,
    "the recorded review survives the resize",
  );
  assert.ok(
    afterSecondResize.conceptIds.length < resized.conceptIds.length,
    "the untouched tail shrank back down with the lower pace",
  );

  // Finish the session, then change the pace again -- a completed session
  // is left alone; "Repeat today's lesson" is the way to redo it.
  for (const conceptId of afterSecondResize.conceptIds.slice(1))
    state = applyAction(
      state,
      {
        type: "review",
        id: randomUUID(),
        sessionId: original.id,
        conceptId,
        rating: "good",
      },
      now,
    );
  const completed = state.sessions.find((item) => item.id === original.id)!;
  assert.ok(completed.completedAt);
  const completedIds = [...completed.conceptIds];
  state = applyAction(
    state,
    {
      type: "goal",
      goal: {
        ...state.goal,
        newCardsPerDay: { ...state.goal.newCardsPerDay, N5: 25 },
      },
    },
    now,
  );
  assert.deepEqual(
    state.sessions.find((item) => item.id === original.id)!.conceptIds,
    completedIds,
  );
});

test("start and review retries are idempotent, and a session resumes after midnight", () => {
  const start = { type: "start" as const, id: randomUUID() };
  const state = applyAction(initialState(), start, now);
  assert.equal(applyAction(state, start, now), state);
  assert.equal(
    applyAction(
      state,
      { ...start, id: randomUUID() },
      new Date("2026-09-05T15:00:00Z"),
    ),
    state,
  );
  const session = state.sessions[0];
  const action = {
    type: "review" as const,
    id: randomUUID(),
    sessionId: session.id,
    conceptId: session.conceptIds[0],
    rating: "good" as const,
  };
  const next = applyAction(state, action, now);
  assert.equal(next.reviews.length, 1);
  assert.equal(next.progress[0].reviewCount, 1);
  assert.equal(applyAction(next, action, now), next);
  assert.throws(
    () => applyAction(next, { ...action, id: randomUUID() }, now),
    /card has changed/,
  );
});

test("only the current session card can be reviewed, and completion is persisted", () => {
  let state = applyAction(
    initialState(),
    { type: "start", id: randomUUID() },
    now,
  );
  const session = state.sessions[0];
  const review = (conceptId: string) => ({
    type: "review" as const,
    id: randomUUID(),
    sessionId: session.id,
    conceptId,
    rating: "good" as const,
  });
  assert.throws(
    () => applyAction(state, review(session.conceptIds[1]), now),
    /card has changed/,
  );
  for (const id of session.conceptIds)
    state = applyAction(state, review(id), now);
  assert.equal(state.sessions[0].completedAt, now.toISOString());
  assert.equal(state.reviews.length, 9);
  assert.equal(
    applyAction(state, { type: "start", id: randomUUID() }, now),
    state,
  );
  const tomorrow = applyAction(
    state,
    { type: "start", id: randomUUID() },
    new Date("2026-09-05T15:00:00Z"),
  );
  assert.equal(tomorrow.sessions.length, 2);
});

test("learning requires repeated comfortable recall, and a lapse resets it", () => {
  let progress = scheduleReview("v-maniau", "easy", now);
  assert.equal(progress.status, "introduced");
  progress = scheduleReview("v-maniau", "good", now, progress);
  assert.equal(progress.status, "learning");
  progress = scheduleReview("v-maniau", "good", now, progress);
  assert.equal(progress.status, "mastered");
  const lapse = scheduleReview("v-maniau", "again", now, progress);
  assert.equal(lapse.status, "learning");
  assert.equal(lapse.successStreak, 0);
  assert.equal(Date.parse(lapse.dueAt) - now.getTime(), 600_000);
});

test("the current scheduler exposes explicit interval policy for each rating", () => {
  assert.equal(
    scheduleReview("v-maniau", "again", now).intervalDays,
    10 / (24 * 60),
  );
  assert.equal(scheduleReview("v-maniau", "hard", now).intervalDays, 1);
  assert.equal(scheduleReview("v-maniau", "good", now).intervalDays, 3);
  assert.equal(scheduleReview("v-maniau", "easy", now).intervalDays, 7);
  const previous = scheduleReview("v-maniau", "good", now);
  const lapse = scheduleReview("v-maniau", "again", now, previous);
  assert.equal(lapse.successStreak, 0);
  assert.equal(lapse.status, "learning");
});

test("vocabulary progress keeps N5, N4-only, combined, and learning stages distinct", () => {
  const state = initialState();
  const [n5] = concepts.filter(
    (concept) => concept.type === "vocabulary" && concept.level === "N5",
  );
  const [n4] = concepts.filter(
    (concept) => concept.type === "vocabulary" && concept.level === "N4",
  );
  state.progress = [
    { ...scheduleReview(n5.id, "easy", now), status: "introduced" },
    { ...scheduleReview(n4.id, "easy", now), status: "mastered" },
  ];
  const [n5Cohort, n4Cohort, total] = vocabularyProgress(state);
  assert.equal(n5Cohort.introduced, 1);
  assert.equal(n5Cohort.mastered, 0);
  assert.equal(n4Cohort.mastered, 1);
  assert.equal(total.introduced, 1);
  assert.equal(total.mastered, 1);
  assert.equal(total.total, n5Cohort.total + n4Cohort.total);
});

test("all curriculum concepts have unique identities, teaching content, and traceable metadata", () => {
  assert.equal(new Set(concepts.map((item) => item.id)).size, concepts.length);
  // Kana cards deliberately have no meaning/example (see docs/kana-mode.md);
  // every other concept keeps the full shared invariant.
  assert.ok(
    concepts
      .filter((item) => item.level !== "kana")
      .every(
        (item) =>
          item.expression &&
          item.reading &&
          item.meaning &&
          item.example &&
          item.note &&
          item.curriculumUnit &&
          item.source &&
          item.sequence > 0 &&
          item.difficulty >= 1 &&
          item.difficulty <= 5,
      ),
  );
  assert.ok(
    concepts
      .filter((item) => item.level === "kana")
      .every(
        (item) =>
          item.expression &&
          item.reading &&
          item.curriculumUnit &&
          item.source &&
          item.sequence > 0 &&
          item.difficulty >= 1 &&
          item.difficulty <= 5,
      ),
  );
  assert.equal(
    actionSchema.safeParse({
      type: "review",
      id: randomUUID(),
      sessionId: randomUUID(),
      conceptId: "v-maniau",
      rating: "perfect",
    }).success,
    false,
  );
});
