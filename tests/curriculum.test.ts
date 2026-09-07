import assert from "node:assert/strict";
import test from "node:test";
import { concepts } from "../src/lib/study/content";
import { vocabularyCorpusCounts } from "../src/lib/study/jlpt-vocabulary";

test("the N5–N4 curriculum is balanced, complete, and uniquely identifiable", () => {
  const ids = concepts.map((concept) => concept.id);
  assert.equal(new Set(ids).size, concepts.length);
  const vocabulary = concepts.filter((concept) => concept.type === "vocabulary");
  assert.equal(vocabulary.filter((concept) => concept.level === "N5").length, 742);
  assert.equal(vocabulary.filter((concept) => concept.level === "N4").length, 710);
  assert.equal(vocabulary.length, 1452);
  assert.deepEqual(vocabularyCorpusCounts, { n5: 742, n4Only: 710, total: 1452 });
  const commonalityCounts = Object.fromEntries(
    ["essential", "common", "additional"].map((group) => [
      group,
      vocabulary.filter((concept) => concept.commonality === group).length,
    ]),
  );
  assert.deepEqual(commonalityCounts, {
    essential: 1229,
    common: 60,
    additional: 163,
  });

  for (const level of ["N5", "N4"] as const) {
    const atLevel = concepts.filter((concept) => concept.level === level);
    assert.ok(atLevel.filter((concept) => concept.type === "vocabulary").length >= 700);
    assert.ok(atLevel.filter((concept) => concept.type === "kanji").length >= 30);
    assert.ok(atLevel.filter((concept) => concept.type === "grammar").length >= 20);
    assert.ok(atLevel.filter((concept) => concept.type === "reading").length >= 5);
    assert.ok(atLevel.filter((concept) => concept.type === "listening").length >= 5);
  }

  for (const concept of concepts) {
    assert.ok(concept.example.trim());
    assert.ok(concept.exampleMeaning.trim());
    assert.ok(concept.note.trim());
    assert.ok(concept.source.includes("JLPT"));
  }
  for (const concept of vocabulary) {
    assert.ok(["essential", "common", "additional"].includes(concept.commonality ?? ""));
    assert.ok(concept.partOfSpeech);
    assert.ok(concept.example.trim());
    assert.ok(concept.exampleMeaning.trim());
    if (/[㐀-鿿]/.test(concept.expression))
      assert.equal(concept.kanjiForm, concept.expression);
  }
});
