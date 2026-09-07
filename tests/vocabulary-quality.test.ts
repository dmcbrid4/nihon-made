import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vocabularyData from "../src/lib/study/data/jlpt-n5-n4-vocabulary.json";
import { concepts } from "../src/lib/study/content";
import { retiredVocabulary } from "../src/lib/study/jlpt-vocabulary";
import { applyAction, initialState } from "../src/lib/study/state";
import {
  activeVocabularyItems,
  phoneticRubyText,
  rubyText,
  validateVocabularyDataset,
} from "../src/lib/study/vocabulary-data";

test("vocabulary data has valid, stored furigana and internally consistent counts", () => {
  const result = validateVocabularyDataset(vocabularyData);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.data.counts, { n5: 734, n4Only: 705, total: 1439 });
  assert.equal(result.data.items.length, 1439);
  for (const item of result.data.items) {
    assert.equal(rubyText(item.vocabulary.expressionFurigana), item.expression);
    assert.equal(rubyText(item.vocabulary.exampleFurigana), item.example);
    assert.equal(
      phoneticRubyText(item.vocabulary.exampleFurigana),
      item.vocabulary.exampleReading,
    );
  }
});

test("canonical word-reading validation rejects a ruby that reconstructs the expression but not its reading", () => {
  // Regression fixture for the Phase 3 chunk 1 finding: an earlier version
  // of this validator only checked that expression ruby text reconstructs
  // the expression, not that its reading segments reconstruct the stored
  // canonical reading. A probe that mutated 服's ruby reading to ねこ (while
  // leaving the ruby text "服" intact) passed the old validator; it must not
  // pass this one.
  const original = vocabularyData.items.find(
    (item) => item.id === "v-jlpt-n5-0442",
  );
  assert.ok(original, "v-jlpt-n5-0442 should be active");
  const mutated = {
    ...vocabularyData,
    items: vocabularyData.items.map((item) =>
      item.id === "v-jlpt-n5-0442"
        ? {
            ...item,
            vocabulary: {
              ...item.vocabulary,
              expressionFurigana: [{ text: item.expression, reading: null }],
            },
          }
        : item,
    ),
  };
  const result = validateVocabularyDataset(mutated);
  assert.ok(
    result.issues.some((issue) =>
      issue.includes("does not reconstruct the canonical reading"),
    ),
  );
});

test("target matching rejects a short word that only occurs as a substring of a different word", () => {
  // These are the exact substring-matching mistakes named in
  // docs/vocabulary-quality-plan.md and docs/phase3-vocabulary-audit.md: a
  // bare `example.indexOf(expression)` matched 服 inside 一服, 椅子-adjacent
  // text inside 先払いする, それ inside 逸れた, かける inside 出かける, and
  // グラム inside パングラム. Each of those records was given a corrected,
  // sense-aligned example in Phase 2; assert the corrected examples resolve
  // to a real, approved target span rather than merely "some span exists".
  const cases: [string, string][] = [
    ["v-jlpt-n5-0442", "服"],
    ["v-jlpt-n5-0017", "椅子"],
    ["v-jlpt-n5-0090", "それ"],
    ["v-jlpt-n5-0043", "電話をかける"],
    ["v-jlpt-n5-0055", "グラム"],
    ["v-jlpt-n4-0554", "布団"],
  ];
  for (const [id, expression] of cases) {
    const item = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(item, `${id} should be active`);
    assert.equal(item.expression, expression);
    assert.ok(item.vocabulary.approval.approved, `${id} should be approved`);
    assert.ok(
      item.vocabulary.targetSpans.length > 0,
      `${id} should have a validated target span`,
    );
    for (const span of item.vocabulary.targetSpans)
      assert.equal(item.example.slice(span.start, span.end), span.surface);
  }
});

test("布団's example no longer stores the wrong contextual reading for 干し", () => {
  const item = vocabularyData.items.find(
    (candidate) => candidate.id === "v-jlpt-n4-0554",
  );
  assert.ok(item);
  const reading = phoneticRubyText(item.vocabulary.exampleFurigana);
  assert.ok(reading.includes("ほし"));
  assert.ok(!reading.includes("ぼし"));
});

test("only approval-gated, mechanically sound records reach the active app", () => {
  const active = activeVocabularyItems(
    validateVocabularyDataset(vocabularyData).data,
  );
  assert.ok(active.length > 0);
  assert.ok(active.length < vocabularyData.items.length);
  for (const item of active) {
    assert.equal(item.vocabulary.approval.approved, true);
    assert.equal(item.vocabulary.approval.reasons.length, 0);
  }
  const jlptVocabulary = concepts.filter(
    (concept) => concept.type === "vocabulary" && concept.level !== "tae-kim",
  );
  assert.equal(jlptVocabulary.length, active.length);
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
