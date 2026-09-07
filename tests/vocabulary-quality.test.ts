import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vocabularyData from "../src/lib/study/data/jlpt-n5-n4-vocabulary.json";
import { concepts } from "../src/lib/study/content";
import { retiredVocabulary } from "../src/lib/study/jlpt-vocabulary";
import { applyAction, initialState } from "../src/lib/study/state";
import {
  phoneticRubyText,
  rubyText,
  validateVocabularyDataset,
} from "../src/lib/study/vocabulary-data";

test("vocabulary data has valid, stored furigana and internally consistent counts", () => {
  const result = validateVocabularyDataset(vocabularyData);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.data.counts, { n5: 736, n4Only: 707, total: 1443 });
  assert.equal(result.data.items.length, 1443);
  for (const item of result.data.items) {
    assert.equal(rubyText(item.vocabulary.expressionFurigana), item.expression);
    assert.equal(rubyText(item.vocabulary.exampleFurigana), item.example);
    assert.equal(
      phoneticRubyText(item.vocabulary.exampleFurigana),
      item.vocabulary.exampleReading,
    );
  }
});

test("corrected cards have sense-aligned replacements and usable ruby", () => {
  const item = (id: string) => {
    const found = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(found, `${id} should be active`);
    return found;
  };
  const baby = item("v-jlpt-n4-0003");
  assert.equal(baby.expression, "赤ちゃん");
  assert.equal(baby.example, "赤ちゃんが寝ています。");
  assert.deepEqual(baby.vocabulary.expressionFurigana, [
    { text: "赤", reading: "あか" },
    { text: "ちゃん", reading: null },
  ]);
  assert.equal(item("v-jlpt-n5-0082").meaning, "soap");
  assert.match(item("v-jlpt-n5-0082").example, /石けん/);
  assert.equal(item("v-jlpt-n5-0043").expression, "電話をかける");
  assert.match(item("v-jlpt-n5-0043").example, /電話をかけます/);
  assert.ok(retiredVocabulary.has("v-jlpt-n4-0690"));
  assert.ok(
    !vocabularyData.items.some(
      (candidate) => candidate.id === "v-jlpt-n4-0690",
    ),
  );
});

test("retired cards are skipped in an in-progress session without creating a review", () => {
  const retiredId = "v-jlpt-n4-0690";
  const activeId = concepts.find((item) => item.type === "vocabulary")!.id;
  const sessionId = randomUUID();
  const state = initialState();
  state.sessions = [
    {
      id: sessionId,
      mode: "N5",
      date: "2026-09-06",
      conceptIds: [retiredId, activeId],
      startedAt: "2026-09-06T12:00:00.000Z",
      completedAt: null,
    },
  ];
  const next = applyAction(
    state,
    {
      type: "review",
      id: randomUUID(),
      sessionId,
      conceptId: activeId,
      rating: "good",
    },
    new Date("2026-09-06T12:05:00.000Z"),
  );
  assert.equal(next.reviews.length, 1);
  assert.equal(next.reviews[0].conceptId, activeId);
  assert.ok(next.sessions[0].completedAt);
});

test("a session containing only retired cards can complete without invented reviews", () => {
  const sessionId = randomUUID();
  const state = initialState();
  state.sessions = [
    {
      id: sessionId,
      mode: "N4",
      date: "2026-09-06",
      conceptIds: ["v-jlpt-n4-0690"],
      startedAt: "2026-09-06T12:00:00.000Z",
      completedAt: null,
    },
  ];
  const next = applyAction(
    state,
    {
      type: "completeRetired",
      sessionId,
    },
    new Date("2026-09-06T12:05:00.000Z"),
  );
  assert.equal(next.reviews.length, 0);
  assert.equal(next.sessions[0].completedAt, "2026-09-06T12:05:00.000Z");
});
