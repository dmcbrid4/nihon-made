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
  assert.deepEqual(result.data.counts, { n5: 730, n4Only: 679, total: 1409 });
  assert.equal(result.data.items.length, 1409);
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

test("reviewed noun-plus-suru heads retain their noun reading and dictionary identity", () => {
  const ids = [
    "v-jlpt-n5-0362", "v-jlpt-n5-0471", "v-jlpt-n5-0601", "v-jlpt-n5-0659",
    "v-jlpt-n4-0154", "v-jlpt-n4-0170", "v-jlpt-n4-0172", "v-jlpt-n4-0176",
    "v-jlpt-n4-0257", "v-jlpt-n4-0259", "v-jlpt-n4-0279", "v-jlpt-n4-0327",
    "v-jlpt-n4-0370", "v-jlpt-n4-0371", "v-jlpt-n4-0372", "v-jlpt-n4-0380",
    "v-jlpt-n4-0381", "v-jlpt-n4-0396", "v-jlpt-n4-0400", "v-jlpt-n4-0419",
    "v-jlpt-n4-0425", "v-jlpt-n4-0426", "v-jlpt-n4-0445", "v-jlpt-n4-0459",
    "v-jlpt-n4-0525", "v-jlpt-n4-0526", "v-jlpt-n4-0528", "v-jlpt-n4-0579",
    "v-jlpt-n4-0603", "v-jlpt-n4-0604",
  ];
  assert.equal(ids.length, 30);
  for (const id of ids) {
    const item = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(item, `${id} should remain in the corpus`);
    assert.ok(!item.reading.endsWith("する"), `${id} should not put する inside word ruby`);
    assert.equal(item.partOfSpeech, "noun; suru verb");
    assert.ok(item.vocabulary.provenance.dictionary, `${id} should recover a JMdict entry`);
    assert.equal(phoneticRubyText(item.vocabulary.expressionFurigana), item.reading);
  }
  const haiken = vocabularyData.items.find((item) => item.id === "v-jlpt-n4-0528");
  assert.equal(haiken?.reading, "はいけん");
  assert.equal(rubyText(haiken?.vocabulary.expressionFurigana ?? []), "拝見");
  assert.equal(phoneticRubyText(haiken?.vocabulary.expressionFurigana ?? []), "はいけん");
  assert.ok(retiredVocabulary.has("v-jlpt-n4-0665"));
});

test("reviewed homographs pin the intended JMdict entries", () => {
  const expected: Record<string, string> = {
    "v-jlpt-n5-0062": "1582920", // demonstrative この, not 九
    "v-jlpt-n4-0017": "1305700", // humble 伺う, not 窺う
    "v-jlpt-n4-0704": "2854117", // interval ～おき, not 沖
  };
  for (const [id, entryId] of Object.entries(expected)) {
    const item = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(item, `${id} should remain in the corpus`);
    assert.equal(item.vocabulary.provenance.dictionary?.entryId, entryId);
  }
  const humbleVisit = vocabularyData.items.find((item) => item.id === "v-jlpt-n4-0017");
  assert.equal(humbleVisit?.expression, "伺う");
  assert.match(humbleVisit?.example ?? "", /伺います/);
});

test("phase 4 editorial replacements teach the reviewed lexeme and contextual reading", () => {
  const item = (id: string) => {
    const found = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(found, `${id} should remain in the corpus`);
    assert.equal(found.vocabulary.approval.approved, true, `${id} should be available to learners`);
    return found;
  };
  const oneMonth = item("v-jlpt-n5-0193");
  assert.equal(oneMonth.expression, "ひと月");
  assert.equal(oneMonth.vocabulary.exampleReading, "ひとつきにほんにいます。");
  assert.equal(oneMonth.vocabulary.provenance.example.kind, "editorial");
  const stomach = item("v-jlpt-n5-0025");
  assert.equal(stomach.vocabulary.exampleReading, "おなかがすきました。");
  assert.equal(stomach.vocabulary.provenance.example.kind, "editorial");
  assert.equal(item("v-jlpt-n5-0131").meaning, "and so on; etc.");
  assert.equal(item("v-jlpt-n4-0362").meaning, "habit; custom");
  assert.equal(item("v-jlpt-n5-0606").meaning, "busy; occupied");
  assert.equal(item("v-jlpt-n4-0640").meaning, "wealthy person");
  assert.equal(item("v-jlpt-n4-0130").meaning, "multi-story building");
  const hit = item("v-jlpt-n4-0458");
  assert.match(hit.example, /ボールを打ちました/);
  assert.equal(hit.vocabulary.provenance.example.kind, "editorial");
  assert.match(item("v-jlpt-n4-0537").example, /^彼は/);
  assert.match(item("v-jlpt-n4-0290").example, /^港に/);
  assert.match(item("v-jlpt-n4-0700").example, /読み終わりました/);
  const languageSuffix = item("v-jlpt-n5-0310");
  assert.equal(languageSuffix.meaning, "-language");
  assert.deepEqual(languageSuffix.vocabulary.targetSpans, [
    { start: 3, end: 5, surface: "英語", lemma: "～語", match: "counter" },
  ]);
});

test("fresh-holdout and missed-audit repairs teach their intended word and sense", () => {
  const item = (id: string, expectsEditorial = false) => {
    const found = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(found, `${id} should remain in the corpus`);
    assert.equal(found.vocabulary.approval.approved, true, `${id} should be active`);
    if (expectsEditorial) {
      assert.equal(found.vocabulary.provenance.example.kind, "editorial", `${id} should document its replacement example`);
      assert.equal(found.vocabulary.review.furigana, "reviewed", `${id} should use reviewed sentence ruby`);
    }
    return found;
  };
  const lukewarm = item("v-jlpt-n5-0218", true);
  assert.equal(lukewarm.expression, "ぬるい");
  assert.equal(lukewarm.kanjiForm, "温い");
  assert.equal(lukewarm.example, "このお茶はぬるいです。");
  assert.equal(lukewarm.vocabulary.exampleReading, "このおちゃはぬるいです。");
  assert.equal(item("v-jlpt-n5-0126").partOfSpeech, "pre-noun adjective");

  const hundredMillion = item("v-jlpt-n4-0179", true);
  assert.equal(hundredMillion.example, "この建物は一億円です。");
  assert.deepEqual(hundredMillion.vocabulary.targetSpans, [
    { start: 5, end: 7, surface: "一億", lemma: "億", match: "counter" },
  ]);
  assert.equal(item("v-jlpt-n4-0128").vocabulary.provenance.dictionary?.entryId, "1226360");
  const shallow = item("v-jlpt-n4-0439");
  assert.equal(shallow.meaning, "shallow; light (sleep)");
  assert.deepEqual(shallow.vocabulary.provenance.dictionary?.senseIds, ["1390800:1"]);
  assert.match(item("v-jlpt-n4-0357", true).example, /試験を受けます/);
  assert.equal(item("v-jlpt-n4-0239").meaning, "express train");
  assert.equal(item("v-jlpt-n4-0239").partOfSpeech, "noun");

  const quantity = item("v-jlpt-n5-0095", true);
  assert.equal(quantity.meaning, "many; a lot");
  assert.equal(quantity.partOfSpeech, "adverb; noun");
  assert.match(quantity.example, /人がたくさんいます/);
  assert.match(item("v-jlpt-n5-0415", true).example, /静かな所/);
  assert.match(item("v-jlpt-n4-0062", true).example, /コンピュータで仕事/);
  assert.equal(item("v-jlpt-n4-0097").partOfSpeech, "adverb");
  assert.match(item("v-jlpt-n4-0097", true).example, /たいてい家にいます/);
  assert.match(item("v-jlpt-n5-0654", true).example, /緑のシャツ/);
  assert.match(item("v-jlpt-n5-0296", true).example, /^嫌なにおい/);
});

test("contextual ruby fixtures preserve weekday and native-counter readings", () => {
  const reading = (id: string) => {
    const item = vocabularyData.items.find((candidate) => candidate.id === id);
    assert.ok(item, `${id} should remain in the corpus`);
    assert.equal(item.vocabulary.review.furigana, "reviewed");
    return item.vocabulary.exampleReading;
  };
  assert.equal(reading("v-jlpt-n5-0232"), "きょうはかようびです。");
  assert.equal(reading("v-jlpt-n5-0281"), "きんようびにともだちとあいます。");
  assert.equal(reading("v-jlpt-n5-0366"), "りんごをよっつください。");
  assert.equal(
    reading("v-jlpt-n5-0388"),
    "ひとつ、ふたつ、みっつ、よっつ、いつつ、むっつ、ななつ、やっつ、ここのつ、とお。",
  );
  assert.equal(reading("v-jlpt-n5-0571"), "かのじょはやっつです。");
  assert.equal(reading("v-jlpt-n5-0678"), "りんごをひとつからとおまでかぞえます。");
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
