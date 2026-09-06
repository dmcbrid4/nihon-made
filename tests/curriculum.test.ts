import assert from "node:assert/strict";
import test from "node:test";
import { concepts } from "../src/lib/study/content";

test("the N5–N4 curriculum is balanced, complete, and uniquely identifiable", () => {
  const ids = concepts.map((concept) => concept.id);
  assert.equal(new Set(ids).size, concepts.length);
  assert.equal(concepts.length, 303);

  for (const level of ["N5", "N4"] as const) {
    const atLevel = concepts.filter((concept) => concept.level === level);
    assert.ok(atLevel.filter((concept) => concept.type === "vocabulary").length >= 50);
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
});
