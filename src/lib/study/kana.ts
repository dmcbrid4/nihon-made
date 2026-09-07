import { z } from "zod";
import kanaData from "./data/kana.json";
import type { CurriculumDraft } from "./curriculum-expansion";
import {
  kanaCategories,
  kanaDirections,
  kanaScripts,
  type KanaDirection,
} from "./types";

// Modern standard hiragana/katakana: the 46 basic kana per script, dakuten,
// handakuten, yōon (contracted sounds), small っ/ッ, the katakana long-vowel
// mark ー, and the common katakana combinations used for foreign sounds
// (ファ, ティ, ヴ, etc). Deliberately excludes obsolete kana (ゐ/ゑ) -- not
// part of any modern beginner curriculum. See docs/kana-mode.md.

const kanaEntrySchema = z.object({
  id: z.string().min(1),
  character: z.string().min(1),
  romaji: z.string().min(1),
  row: z.string().min(1),
  column: z.string().min(1),
  category: z.enum(kanaCategories),
  stage: z.number().int().positive(),
  order: z.number().int().positive(),
  relatedKana: z.string().nullable(),
  confusionSet: z.array(z.string()),
  note: z.string().nullable(),
});

const kanaStageSchema = z.object({
  id: z.number().int().positive(),
  script: z.enum(kanaScripts),
  label: z.string().min(1),
  description: z.string().min(1),
});

const kanaDatasetSchema = z.object({
  stages: z.array(kanaStageSchema),
  hiragana: z.array(kanaEntrySchema),
  katakana: z.array(kanaEntrySchema),
});

export type KanaEntry = z.infer<typeof kanaEntrySchema>;
export type KanaStage = z.infer<typeof kanaStageSchema>;

const parsed = kanaDatasetSchema.parse(kanaData);

export const kanaSource =
  "Original curriculum data: the modern hiragana/katakana syllabaries in standard gojūon order, following common introductory Japanese teaching sequence. Not mined or imported from a third-party deck.";

export const kanaStages: KanaStage[] = parsed.stages;
export const kanaEntries: Record<"hiragana" | "katakana", KanaEntry[]> = {
  hiragana: parsed.hiragana,
  katakana: parsed.katakana,
};
export const kanaEntryById = new Map(
  [...parsed.hiragana, ...parsed.katakana].map((entry) => [entry.id, entry]),
);

export function kanaConceptId(entryId: string, direction: KanaDirection) {
  return `kana-${entryId}-${direction}`;
}

/** Recovers the base kana entry id and direction from a kana concept id.
 * Inverse of kanaConceptId; used by kana-quiz.ts/kana-progress.ts to
 * go from a ConceptProgress row back to "which character, which direction". */
export function parseKanaConceptId(
  conceptId: string,
): { entryId: string; direction: KanaDirection } | null {
  if (!conceptId.startsWith("kana-")) return null;
  for (const direction of kanaDirections) {
    const suffix = `-${direction}`;
    if (conceptId.endsWith(suffix)) {
      const entryId = conceptId.slice("kana-".length, -suffix.length);
      return kanaEntryById.has(entryId) ? { entryId, direction } : null;
    }
  }
  return null;
}

function draftsFor(
  entry: KanaEntry,
  script: "hiragana" | "katakana",
): CurriculumDraft[] {
  return kanaDirections.map((direction) => ({
    id: kanaConceptId(entry.id, direction),
    type: "kana",
    expression: entry.character,
    reading: entry.romaji,
    meaning: "",
    level: "kana",
    example: "",
    exampleMeaning: "",
    note: entry.note ?? "",
    topic: "Kana foundations",
    kanaDetails: {
      character: entry.character,
      script,
      row: entry.row,
      column: entry.column,
      category: entry.category,
      stage: entry.stage,
      curriculumOrder: entry.order,
      direction,
      relatedKana: entry.relatedKana,
      confusionSet: entry.confusionSet,
      note: entry.note,
    },
  }));
}

export const kanaConcepts: CurriculumDraft[] = [
  ...parsed.hiragana.flatMap((entry) => draftsFor(entry, "hiragana")),
  ...parsed.katakana.flatMap((entry) => draftsFor(entry, "katakana")),
];

export const kanaCounts = {
  hiragana: parsed.hiragana.length,
  katakana: parsed.katakana.length,
  hiraganaBasic: parsed.hiragana.filter((e) => e.category === "basic").length,
  katakanaBasic: parsed.katakana.filter((e) => e.category === "basic").length,
};
