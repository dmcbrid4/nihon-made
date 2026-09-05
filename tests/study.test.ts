import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { daysUntil, dateInZone } from "../src/lib/study/dates";
import { concepts } from "../src/lib/study/content";
import { planSession, sessionMinutes } from "../src/lib/study/planner";
import { applyAction, initialState } from "../src/lib/study/state";
import { scheduleReview } from "../src/lib/study/scheduler";
import { actionSchema, dateSchema } from "../src/lib/study/types";

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

test("a new session balances four subjects and never exceeds the time budget", () => {
  const state = initialState();
  const plan = planSession(state, now);
  assert.equal(plan.length, 8);
  assert.deepEqual(
    new Set(plan.map((item) => item.type)),
    new Set(["vocabulary", "kanji", "grammar", "reading"]),
  );
  assert.ok(sessionMinutes(plan) <= state.goal.dailyMinutes);
  state.goal.dailyMinutes = 10;
  assert.ok(sessionMinutes(planSession(state, now)) <= 10);
});

test("overdue concepts precede unseen material and future reviews stay out", () => {
  const state = initialState();
  state.progress = [
    scheduleReview("k-ryo", "again", new Date(now.getTime() - 3_600_000)),
    scheduleReview("v-maniau", "easy", now),
  ];
  const plan = planSession(state, now);
  assert.equal(plan[0].id, "k-ryo");
  assert.ok(!plan.some((item) => item.id === "v-maniau"));
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
  assert.equal(state.reviews.length, 8);
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
  assert.equal(progress.status, "learning");
  progress = scheduleReview("v-maniau", "good", now, progress);
  progress = scheduleReview("v-maniau", "good", now, progress);
  assert.equal(progress.status, "learned");
  const lapse = scheduleReview("v-maniau", "again", now, progress);
  assert.equal(lapse.status, "learning");
  assert.equal(lapse.successStreak, 0);
  assert.equal(Date.parse(lapse.dueAt) - now.getTime(), 600_000);
});

test("all starter concepts have unique identities and complete teaching content", () => {
  assert.equal(new Set(concepts.map((item) => item.id)).size, concepts.length);
  assert.ok(
    concepts.every(
      (item) =>
        item.expression &&
        item.reading &&
        item.meaning &&
        item.example &&
        item.note,
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
