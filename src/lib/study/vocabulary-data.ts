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
        }),
      )
      .min(1),
    reason: z.string().min(1),
  }),
  provenance: z.object({
    lexicalSourceIds: z.array(z.string().min(1)).min(1),
    dictionarySourceId: z.literal("jmdict").nullable(),
    exampleKind: z.enum(["imported", "editorial", "fallback"]),
  }),
  targetSpans: z.array(
    z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      surface: z.string().min(1),
      match: z.enum(["exact", "inflected"]),
    }),
  ),
  review: z.object({
    lexical: z.enum(["pending", "reviewed"]),
    example: z.enum(["pending", "reviewed"]),
    furigana: z.enum(["automated", "reviewed", "uncertain"]),
    notes: z.array(z.string()),
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
  schemaVersion: z.literal(2),
  license: z.string().min(1),
  sources: z.array(z.string().min(1)).min(1),
  sourceManifest: z.object({
    jmdictFurigana: z.object({
      version: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    jmdictCommon: z.object({
      schema: z.string().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    tokenizer: z.string().min(1),
  }),
  counts: z.object({
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

export function validateVocabularyDataset(data: unknown) {
  const parsed = vocabularyDatasetSchema.parse(data);
  const issues: string[] = [];
  const seen = new Set<string>();
  const examples = new Map<string, number>();
  const flags: string[] = [];
  const normalized = (value: string) =>
    value.normalize("NFKC").replace(/[\s・;；〜～]/g, "");
  for (const item of parsed.items) {
    const key = `${normalized(item.expression)}\u0000${normalized(item.reading)}`;
    if (seen.has(key))
      issues.push(`${item.id}: duplicate expression and reading`);
    seen.add(key);
    if (rubyText(item.vocabulary.expressionFurigana) !== item.expression)
      issues.push(
        `${item.id}: expression ruby does not reconstruct the expression`,
      );
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
  return {
    data: parsed,
    issues,
    duplicateExamples: [...examples.entries()].filter(([, count]) => count > 1),
    flags,
  };
}
