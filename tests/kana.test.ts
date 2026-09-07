import assert from "node:assert/strict";
import test from "node:test";
import { concepts } from "../src/lib/study/content";
import {
  kanaConceptId,
  kanaConcepts,
  kanaCounts,
  kanaEntries,
  kanaEntryById,
  kanaStages,
  parseKanaConceptId,
} from "../src/lib/study/kana";
import {
  characterStatus,
  characterStatusFor,
  kanaMilestones,
  kanaOverview,
  kanaScriptProgress,
  recordKanaQuizAnswer,
} from "../src/lib/study/kana-progress";
import { buildQuizQuestions, distractorsFor } from "../src/lib/study/kana-quiz";
import { applyAction, initialState } from "../src/lib/study/state";
import type { ConceptProgress } from "../src/lib/study/types";

const now = new Date("2026-09-04T15:00:00Z");

/** A ConceptProgress that's already mastered, for tests that only care
 * about downstream aggregation (kanaScriptProgress/kanaOverview/
 * kanaMilestones), not how mastery was reached. */
function masteredProgress(conceptId: string): ConceptProgress {
  return {
    conceptId,
    status: "mastered",
    reviewCount: 5,
    successStreak: 5,
    intervalDays: 0,
    dueAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

test("curriculum counts: 46 basic kana per script, full modern syllabary, no obsolete kana", () => {
  assert.equal(kanaCounts.hiraganaBasic, 46);
  assert.equal(kanaCounts.katakanaBasic, 46);
  assert.equal(kanaCounts.hiragana, 105); // 46 basic + 20 dakuten + 5 handakuten + 33 yoon + 1 sokuon
  assert.equal(kanaCounts.katakana, 124); // + chōon + 18 extended combinations, no small-tsu-only difference
  assert.equal(kanaConcepts.length, (kanaCounts.hiragana + kanaCounts.katakana) * 2);
  assert.equal(
    concepts.filter((item) => item.type === "kana").length,
    kanaConcepts.length,
  );
  for (const entry of [...kanaEntries.hiragana, ...kanaEntries.katakana]) {
    assert.ok(!["ゐ", "ゑ", "ヰ", "ヱ"].includes(entry.character), `${entry.character} is obsolete kana`);
  }
});

test("hiragana and katakana entries are classified into the correct Unicode block", () => {
  const hiraganaBlock = /^[぀-ゟ]+$/;
  const katakanaBlock = /^[゠-ヿ]+$/;
  for (const entry of kanaEntries.hiragana)
    assert.match(entry.character, hiraganaBlock, `${entry.id} (${entry.character}) should be hiragana`);
  for (const entry of kanaEntries.katakana)
    assert.match(entry.character, katakanaBlock, `${entry.id} (${entry.character}) should be katakana`);
});

test("curriculum ordering is monotonic per script and stages start at 1", () => {
  for (const script of ["hiragana", "katakana"] as const) {
    const entries = kanaEntries[script];
    const orders = entries.map((e) => e.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
    assert.equal(new Set(orders).size, orders.length);
    const stageNumbers = kanaStages
      .filter((s) => s.script === script)
      .map((s) => s.id);
    assert.equal(Math.min(...stageNumbers), 1);
    assert.deepEqual(stageNumbers, [...stageNumbers].sort((a, b) => a - b));
    // Every entry's stage is one of the declared stages for its script.
    for (const entry of entries) assert.ok(stageNumbers.includes(entry.stage));
  }
});

test("basic vs extended forms: basic is exactly the 46-kana gojūon set, extended is katakana-only", () => {
  for (const script of ["hiragana", "katakana"] as const) {
    assert.equal(kanaEntries[script].filter((e) => e.category === "basic").length, 46);
  }
  assert.equal(kanaEntries.hiragana.filter((e) => e.category === "extended").length, 0);
  assert.ok(kanaEntries.katakana.filter((e) => e.category === "extended").length > 0);
  const categories = new Set([...kanaEntries.hiragana, ...kanaEntries.katakana].map((e) => e.category));
  for (const category of categories)
    assert.ok(["basic", "dakuten", "handakuten", "yoon", "small", "extended"].includes(category));
});

test("kana concept id round-trips through kanaConceptId/parseKanaConceptId", () => {
  for (const entry of [...kanaEntries.hiragana, ...kanaEntries.katakana]) {
    for (const direction of ["recognition", "recall"] as const) {
      const id = kanaConceptId(entry.id, direction);
      const parsed = parseKanaConceptId(id);
      assert.deepEqual(parsed, { entryId: entry.id, direction });
    }
  }
  assert.equal(parseKanaConceptId("v-maniau"), null);
  assert.equal(parseKanaConceptId("kana-not-a-real-entry-recognition"), null);
});

test("mastery calculation: a character requires both recognition and recall to master", () => {
  const mastered: ConceptProgress = {
    conceptId: "x",
    status: "mastered",
    reviewCount: 3,
    successStreak: 3,
    intervalDays: 10,
    dueAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
  const learning: ConceptProgress = { ...mastered, status: "learning", successStreak: 1 };
  assert.equal(characterStatus(undefined, undefined), "unseen");
  assert.equal(characterStatus(mastered, undefined), "introduced");
  assert.equal(characterStatus(mastered, learning), "learning");
  assert.equal(characterStatus(mastered, mastered), "mastered");
  assert.equal(characterStatus(learning, learning), "learning");

  const entry = kanaEntries.hiragana.find((e) => e.category === "basic")!;
  const progressById = new Map<string, ConceptProgress>([
    [kanaConceptId(entry.id, "recognition"), mastered],
    [kanaConceptId(entry.id, "recall"), mastered],
  ]);
  assert.equal(characterStatusFor(entry, progressById), "mastered");
  assert.equal(characterStatusFor(entry, new Map()), "unseen");
});

test("group completion: bucket and script cohorts sum to the right totals, milestones only complete at 100%", () => {
  const state = initialState();
  const cohorts = kanaScriptProgress(state, "hiragana");
  const total = cohorts.find((c) => c.id === "total")!;
  assert.equal(total.total, kanaCounts.hiragana);
  assert.equal(total.unseen, kanaCounts.hiragana);
  const bucketSum = cohorts.filter((c) => c.id !== "total").reduce((sum, c) => sum + c.total, 0);
  assert.equal(bucketSum, kanaCounts.hiragana);

  const milestones = kanaMilestones(state);
  assert.ok(milestones.every((m) => !m.complete));
  const basicHiragana = kanaEntries.hiragana.filter((e) => e.category === "basic");
  const masteredState = {
    ...state,
    progress: basicHiragana.flatMap((entry) => [
      masteredProgress(kanaConceptId(entry.id, "recognition")),
      masteredProgress(kanaConceptId(entry.id, "recall")),
    ]),
  };
  const afterBasic = kanaMilestones(masteredState);
  const basicMilestone = afterBasic.find((m) => m.script === "hiragana" && m.bucket === "basic")!;
  assert.equal(basicMilestone.mastered, 46);
  assert.equal(basicMilestone.complete, true);
  const allHiragana = afterBasic.find((m) => m.script === "hiragana" && m.bucket === "all")!;
  assert.equal(allHiragana.complete, false); // dakuten/yoon/etc still unseen
});

test("progress percentages: 0% when untouched, 100% once every character is mastered in both directions", () => {
  const state = initialState();
  assert.deepEqual(kanaOverview(state), { hiragana: 0, katakana: 0, overall: 0 });
  const everyEntry = [...kanaEntries.hiragana, ...kanaEntries.katakana];
  const fullState = {
    ...state,
    progress: everyEntry.flatMap((entry) => [
      masteredProgress(kanaConceptId(entry.id, "recognition")),
      masteredProgress(kanaConceptId(entry.id, "recall")),
    ]),
  };
  const overview = kanaOverview(fullState);
  assert.equal(overview.hiragana, 100);
  assert.equal(overview.katakana, 100);
  assert.equal(overview.overall, 100);
});

test("markKanaKnown instantly masters a group and only accepts real kana concept ids", () => {
  const entry = kanaEntries.hiragana.find((e) => e.category === "basic")!;
  const ids = [kanaConceptId(entry.id, "recognition"), kanaConceptId(entry.id, "recall")];
  const state = applyAction(
    initialState(),
    { type: "markKanaKnown", conceptIds: [...ids, "v-maniau", "not-a-real-id"] },
    now,
  );
  assert.equal(state.progress.length, 2);
  assert.ok(state.progress.every((item) => item.status === "mastered"));
  assert.ok(!state.progress.some((item) => item.conceptId === "v-maniau"));
  const progressById = new Map(state.progress.map((item) => [item.conceptId, item]));
  assert.equal(characterStatusFor(entry, progressById), "mastered");
  // Re-marking known is idempotent, not additive.
  const again = applyAction(state, { type: "markKanaKnown", conceptIds: ids }, now);
  assert.equal(again.progress.length, 2);
  assert.deepEqual(
    applyAction(initialState(), { type: "markKanaKnown", conceptIds: ["not-real"] }, now),
    initialState(),
  );
});

test("no duplicate kana data: unique ids, unique characters per script, and the known legitimate romaji collisions are exactly じ/ぢ and ず/づ (and their katakana equivalents)", () => {
  for (const script of ["hiragana", "katakana"] as const) {
    const entries = kanaEntries[script];
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
    assert.equal(new Set(entries.map((e) => e.character)).size, entries.length);
  }
  const romajiCollisions = new Map<string, string[]>();
  for (const script of ["hiragana", "katakana"] as const) {
    const byRomaji = new Map<string, string[]>();
    for (const entry of kanaEntries[script]) {
      if (!/^[a-z]+$/.test(entry.romaji)) continue; // skip the descriptive sokuon/chōon strings
      byRomaji.set(entry.romaji, [...(byRomaji.get(entry.romaji) ?? []), entry.character]);
    }
    for (const [romaji, characters] of byRomaji)
      if (characters.length > 1) romajiCollisions.set(`${script}:${romaji}`, characters);
  }
  assert.deepEqual(
    [...romajiCollisions.keys()].sort(),
    ["hiragana:ji", "hiragana:zu", "katakana:ji", "katakana:zu"],
  );
});

test("romaji is well-formed: lowercase letters for ordinary kana, non-empty for every entry", () => {
  for (const entry of [...kanaEntries.hiragana, ...kanaEntries.katakana]) {
    assert.ok(entry.romaji.trim().length > 0, `${entry.id} has empty romaji`);
    if (entry.category !== "small" && entry.row !== "extended" && entry.column !== "chouon")
      assert.match(entry.romaji, /^[a-z]+$/, `${entry.id} romaji "${entry.romaji}" is malformed`);
  }
});

test("kana combination relationships: yōon and dakuten/handakuten point back to a real base character in the same script", () => {
  for (const script of ["hiragana", "katakana"] as const) {
    const characters = new Set(kanaEntries[script].map((e) => e.character));
    for (const entry of kanaEntries[script].filter((e) => e.category === "yoon" || e.category === "dakuten" || e.category === "handakuten")) {
      assert.ok(entry.relatedKana, `${entry.id} should declare a related base character`);
      assert.ok(characters.has(entry.relatedKana!), `${entry.relatedKana} should exist in ${script}`);
    }
    // Basic kana never derive from something else.
    for (const entry of kanaEntries[script].filter((e) => e.category === "basic"))
      assert.equal(entry.relatedKana, null);
  }
  // が derives from か specifically (not some other k-row kana).
  const ga = kanaEntryById.get("h-g-a")!;
  assert.equal(ga.relatedKana, "か");
  const kya = kanaEntryById.get("h-k-ya")!;
  assert.equal(kya.relatedKana, "き");
});

test("confusion sets are symmetric and required pairs are present", () => {
  const requiredHiragana: [string, string][] = [["さ", "き"], ["ぬ", "め"], ["れ", "わ"], ["あ", "お"]];
  const requiredKatakana: [string, string][] = [["シ", "ツ"], ["ソ", "ン"], ["ク", "ケ"], ["ヌ", "ス"]];
  function findEntry(script: "hiragana" | "katakana", character: string) {
    return kanaEntries[script].find((e) => e.character === character)!;
  }
  for (const [a, b] of requiredHiragana) {
    assert.ok(findEntry("hiragana", a).confusionSet.includes(b));
    assert.ok(findEntry("hiragana", b).confusionSet.includes(a));
  }
  for (const [a, b] of requiredKatakana) {
    assert.ok(findEntry("katakana", a).confusionSet.includes(b));
    assert.ok(findEntry("katakana", b).confusionSet.includes(a));
  }
});

test("distractors prioritize real confusion-set members over random options", () => {
  const distractors = distractorsFor("h-s-a", "hiragana", 3); // さ, confused with き
  assert.ok(distractors.some((entry) => entry.character === "き"));
  const unknownEntry = distractorsFor("not-real", "hiragana", 3);
  assert.deepEqual(unknownEntry, []);
});

test("recordKanaQuizAnswer: mastery is a streak of 5 correct answers, any correct answer extends it, a miss resets it", () => {
  let progress = recordKanaQuizAnswer("kana-h-a-a-recognition", true, now);
  assert.equal(progress.status, "introduced");
  assert.equal(progress.successStreak, 1);
  for (let i = 0; i < 3; i++)
    progress = recordKanaQuizAnswer("kana-h-a-a-recognition", true, now, progress);
  assert.equal(progress.successStreak, 4);
  assert.equal(progress.status, "learning");
  progress = recordKanaQuizAnswer("kana-h-a-a-recognition", true, now, progress);
  assert.equal(progress.successStreak, 5);
  assert.equal(progress.status, "mastered");

  // A miss resets the streak to 0 and demotes mastery.
  const missed = recordKanaQuizAnswer("kana-h-a-a-recognition", false, now, progress);
  assert.equal(missed.successStreak, 0);
  assert.equal(missed.status, "learning");

  // Retry-then-correct still counts as a success building the streak (a
  // caller only reports `false` once a question is fully missed -- see
  // KanaQuizQuestion's 2-attempt handling in kana-study.tsx).
  const first = recordKanaQuizAnswer("kana-h-a-a-recall", true, now);
  const second = recordKanaQuizAnswer("kana-h-a-a-recall", true, now, first);
  assert.equal(second.successStreak, 2);
});

test("kanaQuizAnswer action: only kana concepts accepted, streak builds to mastery over repeated answers", () => {
  const conceptId = kanaConceptId(kanaEntries.hiragana[0].id, "recognition");
  let state = applyAction(
    initialState(),
    { type: "kanaQuizAnswer", conceptId: "v-maniau", correct: true },
    now,
  );
  assert.equal(state.progress.length, 0); // not a kana concept, ignored

  for (let i = 0; i < 5; i++)
    state = applyAction(state, { type: "kanaQuizAnswer", conceptId, correct: true }, now);
  assert.equal(state.progress.length, 1);
  assert.equal(state.progress[0].status, "mastered");
  assert.equal(state.progress[0].successStreak, 5);
  // Kana quiz answers are direct progress writes, not session/review-bound.
  assert.equal(state.sessions.length, 0);
  assert.equal(state.reviews.length, 0);
});

test("buildQuizQuestions: mixed asks both directions, single-direction modes stay pure, length is respected", () => {
  const ids = kanaEntries.hiragana.slice(0, 5).map((e) => e.id);
  const mixed = buildQuizQuestions(ids, "mixed", "all");
  assert.equal(mixed.length, ids.length * 2);
  assert.ok(ids.every((id) => mixed.some((q) => q.entryId === id && q.direction === "recognition")));
  assert.ok(ids.every((id) => mixed.some((q) => q.entryId === id && q.direction === "recall")));

  const recognitionOnly = buildQuizQuestions(ids, "recognition", "all");
  assert.equal(recognitionOnly.length, ids.length);
  assert.ok(recognitionOnly.every((q) => q.direction === "recognition"));

  const short = buildQuizQuestions(ids, "mixed", "short");
  assert.equal(short.length, 10);

  // A tiny selection with a longer requested length cycles rather than
  // running out of questions.
  const tinyButLong = buildQuizQuestions([ids[0]], "recognition", "short");
  assert.equal(tinyButLong.length, 10);
  assert.ok(tinyButLong.every((q) => q.entryId === ids[0]));

  assert.deepEqual(buildQuizQuestions([], "mixed", "all"), []);
  assert.deepEqual(buildQuizQuestions(["not-real"], "mixed", "all"), []);
});
