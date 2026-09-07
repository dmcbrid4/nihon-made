import assert from "node:assert/strict";
import test from "node:test";
import { concepts } from "../src/lib/study/content";
import {
  vocabularyCatalogCounts,
  vocabularyCorpusCounts,
} from "../src/lib/study/jlpt-vocabulary";

test("the N5–N4 curriculum is balanced, complete, and uniquely identifiable", () => {
  const ids = concepts.map((concept) => concept.id);
  assert.equal(new Set(ids).size, concepts.length);
  const vocabulary = concepts.filter(
    (concept) => concept.type === "vocabulary",
  );
  // The full candidate catalog (approved and unapproved together) is a
  // stable regression snapshot; it only moves when source data changes.
  assert.deepEqual(vocabularyCatalogCounts, {
    n5: 734,
    n4Only: 705,
    total: 1439,
  });
  // What actually reaches learners is the approved subset. This grows as
  // Phase 3/4 review and correct more candidates, so assert a floor rather
  // than an exact snapshot; see docs/vocabulary-quality-plan.md.
  assert.equal(
    vocabulary.filter((concept) => concept.level === "N5").length,
    vocabularyCorpusCounts.n5,
  );
  assert.equal(
    vocabulary.filter((concept) => concept.level === "N4").length,
    vocabularyCorpusCounts.n4Only,
  );
  assert.equal(vocabulary.length, vocabularyCorpusCounts.total);
  assert.ok(
    vocabularyCorpusCounts.n5 >= 400,
    "approved N5 vocabulary should cover a substantial foundation",
  );
  assert.ok(
    vocabularyCorpusCounts.n4Only >= 400,
    "approved N4-only vocabulary should cover a substantial foundation",
  );
  const commonalityCounts = Object.fromEntries(
    ["essential", "common", "additional"].map((group) => [
      group,
      vocabulary.filter((concept) => concept.commonality === group).length,
    ]),
  );
  assert.ok(commonalityCounts.essential > 0);
  assert.ok(commonalityCounts.common > 0);
  assert.ok(commonalityCounts.additional > 0);
  // The N4 band should not be dominated by "additional" (the bug where a
  // global import index pushed almost every N4 record past the commonality
  // threshold regardless of actual dictionary commonness).
  const n4Vocabulary = vocabulary.filter((concept) => concept.level === "N4");
  const n4Additional = n4Vocabulary.filter(
    (concept) => concept.commonality === "additional",
  ).length;
  assert.ok(n4Additional < n4Vocabulary.length);

  for (const level of ["N5", "N4"] as const) {
    const atLevel = concepts.filter((concept) => concept.level === level);
    assert.ok(
      atLevel.filter((concept) => concept.type === "vocabulary").length >= 400,
    );
    assert.ok(
      atLevel.filter((concept) => concept.type === "kanji").length >= 30,
    );
    assert.ok(
      atLevel.filter((concept) => concept.type === "grammar").length >= 20,
    );
    assert.ok(
      atLevel.filter((concept) => concept.type === "reading").length >= 5,
    );
    assert.ok(
      atLevel.filter((concept) => concept.type === "listening").length >= 5,
    );
  }

  for (const concept of concepts) {
    assert.ok(concept.example.trim());
    assert.ok(concept.exampleMeaning.trim());
    assert.ok(concept.note.trim());
    assert.ok(concept.source.includes("JLPT"));
  }
  for (const concept of vocabulary) {
    assert.ok(
      ["essential", "common", "additional"].includes(concept.commonality ?? ""),
    );
    assert.ok(concept.partOfSpeech);
    assert.ok(concept.example.trim());
    assert.ok(concept.exampleMeaning.trim());
    if (/[㐀-鿿]/.test(concept.expression))
      assert.equal(concept.kanjiForm, concept.expression);
  }
});
