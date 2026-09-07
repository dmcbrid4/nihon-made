import vocabularyData from "./data/jlpt-n5-n4-vocabulary.json";
import type { CurriculumDraft } from "./curriculum-expansion";
import type { Commonality } from "./types";
import {
  validateVocabularyDataset,
  type VocabularyDataItem,
} from "./vocabulary-data";

const validation = validateVocabularyDataset(vocabularyData);
if (validation.issues.length)
  throw new Error(
    `Invalid vocabulary corpus:\n${validation.issues.join("\n")}`,
  );
const sourceItems: VocabularyDataItem[] = validation.data.items;

function curriculumBand(item: VocabularyDataItem): Commonality {
  if (item.vocabulary.priority.rank <= 100) return "essential";
  const commonThreshold = item.level === "N5" ? 800 : 1_800;
  return item.vocabulary.priority.rank <= commonThreshold
    ? "common"
    : "additional";
}

export const vocabularyCorpus = sourceItems.map(
  ({ kanjiForm, classificationNote, sources, ...item }): CurriculumDraft => ({
    ...item,
    commonality: curriculumBand({
      ...item,
      kanjiForm,
      classificationNote,
      sources,
    }),
    ...(kanjiForm ? { kanjiForm } : {}),
    ...(classificationNote ? { classificationNote } : {}),
  }),
);

export const vocabularyCorpusCounts = validation.data.counts;
export const retiredVocabulary = new Map(
  validation.data.retired.map((item) => [item.id, item.reason]),
);

export const vocabularySource =
  "OpenJLPT, Jonathan Waller JLPT Resources, Open Anki JLPT Decks, and JMdict/Tatoeba; record-level provenance is stored with each item (see ATTRIBUTION.md).";
