import { z } from "zod";
import type { RubySegment } from "./types";

export const rubySegmentSchema = z.object({
  text: z.string().min(1),
  reading: z.string().min(1).nullable(),
});

const vocabularyDetailsSchema = z.object({
  expressionFurigana: z.array(rubySegmentSchema).min(1),
  exampleFurigana: z.array(rubySegmentSchema).min(1),
  exampleReading: z.string().min(1),
  secondaryMeanings: z.array(z.string().min(1)),
  itemKind: z.enum(["word", "expression", "phrase"]),
  linkedKanji: z.array(z.string().min(1)),
  priority: z.object({
    rank: z.number().int().positive(),
    band: z.enum(["essential", "common", "additional"]),
    reason: z.string().min(1),
  }),
  classification: z.object({
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z
      .array(
        z.object({
          sourceId: z.string().min(1),
          lineage: z.string().min(1),
          level: z.enum(["N5", "N4"]),
          // Whether this source's own raw list, looked up independently of
          // the record's assigned level, agrees with it. Null means the term
          // could not be relocated in that source's raw list (for example
          // after an editorial spelling correction), not agreement.
          agrees: z.boolean().nullable(),
        }),
      )
      .min(1),
    reason: z.string().min(1),
  }),
  provenance: z.object({
    lexicalSourceIds: z.array(z.string().min(1)).min(1),
    // A real JMdict entry/sense match, distinct from whether JmdictFurigana
    // supplied the ruby segmentation (see `ruby` below): a record can have
    // one without the other.
    dictionary: z
      .object({
        entryId: z.string().min(1),
        senseIds: z.array(z.string().min(1)),
        glossOverlap: z.number().int().nonnegative(),
      })
      .nullable(),
    ruby: z.object({
      source: z.enum(["jmdict-furigana", "generated"]),
      wordExact: z.boolean(),
    }),
    example: z.object({
      kind: z.enum(["imported", "editorial", "fallback"]),
      attribution: z
        .object({ sourceId: z.literal("tatoeba"), sentenceId: z.string().min(1) })
        .nullable(),
    }),
  }),
  targetSpans: z.array(
    z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      surface: z.string().min(1),
      lemma: z.string().min(1),
      match: z.enum(["exact", "inflected", "counter"]),
    }),
  ),
  review: z.object({
    lexical: z.enum(["pending", "reviewed"]),
    example: z.enum(["pending", "reviewed"]),
    furigana: z.enum(["automated", "reviewed", "uncertain"]),
    reviewer: z.string().min(1).nullable(),
    notes: z.array(z.string()),
  }),
  approval: z.object({
    approved: z.boolean(),
    reasons: z.array(z.string()),
  }),
});

const vocabularyItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal("vocabulary"),
  expression: z.string().min(1),
  kanjiForm: z.string().min(1).nullable(),
  reading: z.string().min(1),
  meaning: z.string().min(1),
  level: z.enum(["N5", "N4"]),
  partOfSpeech: z.string().min(1),
  example: z.string().min(1),
  exampleMeaning: z.string().min(1),
  note: z.string().min(1),
  topic: z.string().min(1),
  classificationNote: z.string().min(1).nullable(),
  sources: z.array(z.string().min(1)).min(1),
  vocabulary: vocabularyDetailsSchema,
});
export type VocabularyDataItem = z.infer<typeof vocabularyItemSchema>;

export const vocabularyDatasetSchema = z.object({
  schemaVersion: z.literal(3),
  license: z.string().min(1),
  sources: z.array(z.string().min(1)).min(1),
  sourceManifest: z.object({
    jmdictFurigana: z.object({
      version: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    jmdict: z.object({
      schema: z.string().min(1),
      dictDate: z.string().min(1),
      commonOnly: z.literal(false),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    tokenizer: z.string().min(1),
  }),
  // Full candidate catalog counts. `approvedCounts` is the subset that
  // actually ships to learners; see `activeVocabularyItems`.
  counts: z.object({
    n5: z.number().int().nonnegative(),
    n4Only: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  approvedCounts: z.object({
    n5: z.number().int().nonnegative(),
    n4Only: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  retired: z.array(
    z.object({ id: z.string().min(1), reason: z.string().min(1) }),
  ),
  items: z.array(vocabularyItemSchema),
});

export function rubyText(segments: RubySegment[]) {
  return segments.map((segment) => segment.text).join("");
}

export function phoneticRubyText(segments: RubySegment[]) {
  return segments
    .map((segment) => segment.reading ?? segment.text)
    .join("")
    .replace(/[ァ-ヶ]/g, (character) =>
      String.fromCodePoint(character.codePointAt(0)! - 0x60),
    );
}

/** Fold katakana to hiragana so a katakana-spelled reading (e.g. カレンダー)
 * can be compared against `phoneticRubyText`, which always returns hiragana. */
function foldToHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCodePoint(character.codePointAt(0)! - 0x60),
  );
}

export function activeVocabularyItems(data: { items: VocabularyDataItem[] }) {
  return data.items.filter((item) => item.vocabulary.approval.approved);
}

export function validateVocabularyDataset(data: unknown) {
  const parsed = vocabularyDatasetSchema.parse(data);
  const issues: string[] = [];
  const seen = new Set<string>();
  const examples = new Map<string, number>();
  const flags: string[] = [];
  const normalized = (value: string) =>
    value.normalize("NFKC").replace(/[\s・;；〜～]/g, "");
  for (const item of parsed.items) {
    const key = JSON.stringify([normalized(item.expression), normalized(item.reading)]);
    if (seen.has(key))
      issues.push(`${item.id}: duplicate expression and reading`);
    seen.add(key);
    if (rubyText(item.vocabulary.expressionFurigana) !== item.expression)
      issues.push(
        `${item.id}: expression ruby does not reconstruct the expression`,
      );
    // Canonical word-reading validation: the ruby's phonetic reconstruction
    // must match the stored reading, not just the ruby's display text. A
    // record whose ruby text reconstructs the expression but whose reading
    // segments are wrong (e.g. mutated to an unrelated reading) previously
    // passed this validator; this closes that gap. An unapproved candidate
    // may legitimately still have this problem (that is exactly what keeps
    // it unapproved); it becomes a hard, load-blocking issue only if the
    // record claims to be approved anyway.
    if (
      foldToHiragana(phoneticRubyText(item.vocabulary.expressionFurigana)) !==
      foldToHiragana(item.reading)
    ) {
      const message = `${item.id}: expression ruby does not reconstruct the canonical reading`;
      if (item.vocabulary.approval.approved) issues.push(message);
      else flags.push(message);
    }
    if (rubyText(item.vocabulary.exampleFurigana) !== item.example)
      issues.push(`${item.id}: example ruby does not reconstruct the example`);
    if (
      phoneticRubyText(item.vocabulary.exampleFurigana) !==
      item.vocabulary.exampleReading
    )
      issues.push(
        `${item.id}: example ruby does not reconstruct its stored reading`,
      );
    if (
      !/[㐀-鿿]/u.test(item.expression) &&
      item.vocabulary.expressionFurigana.some((part) => part.reading)
    )
      issues.push(`${item.id}: kana-only expression has ruby`);
    for (const span of item.vocabulary.targetSpans)
      if (item.example.slice(span.start, span.end) !== span.surface)
        issues.push(`${item.id}: target span does not match its example`);
    if (
      item.vocabulary.approval.approved &&
      item.vocabulary.approval.reasons.length
    )
      issues.push(`${item.id}: approved record still lists approval reasons`);
    if (
      !item.vocabulary.approval.approved &&
      !item.vocabulary.approval.reasons.length
    )
      issues.push(`${item.id}: unapproved record has no approval reasons`);
    if (!item.vocabulary.targetSpans.length)
      flags.push(`${item.id}: no exact or recognized inflected target span`);
    if (item.vocabulary.review.example !== "reviewed")
      flags.push(`${item.id}: example requires editorial review`);
    if (item.vocabulary.review.furigana === "uncertain")
      flags.push(`${item.id}: furigana segmentation is uncertain`);
    examples.set(item.example, (examples.get(item.example) ?? 0) + 1);
  }
  const counts = {
    n5: parsed.items.filter((item) => item.level === "N5").length,
    n4Only: parsed.items.filter((item) => item.level === "N4").length,
  };
  if (
    counts.n5 !== parsed.counts.n5 ||
    counts.n4Only !== parsed.counts.n4Only ||
    counts.n5 + counts.n4Only !== parsed.counts.total
  )
    issues.push("dataset counts do not match its records");
  const approved = activeVocabularyItems(parsed);
  const approvedCounts = {
    n5: approved.filter((item) => item.level === "N5").length,
    n4Only: approved.filter((item) => item.level === "N4").length,
  };
  if (
    approvedCounts.n5 !== parsed.approvedCounts.n5 ||
    approvedCounts.n4Only !== parsed.approvedCounts.n4Only ||
    approvedCounts.n5 + approvedCounts.n4Only !== parsed.approvedCounts.total
  )
    issues.push("approved dataset counts do not match its approved records");
  return {
    data: parsed,
    issues,
    duplicateExamples: [...examples.entries()].filter(([, count]) => count > 1),
    flags,
  };
}
