import vocabularyData from "./data/jlpt-n5-n4-vocabulary.json";
import type { CurriculumDraft } from "./curriculum-expansion";
import {
  activeVocabularyItems,
  validateVocabularyDataset,
  type VocabularyDataItem,
} from "./vocabulary-data";

const validation = validateVocabularyDataset(vocabularyData);
if (validation.issues.length)
  throw new Error(
    `Invalid vocabulary corpus:\n${validation.issues.join("\n")}`,
  );

// Only records that cleared the Phase 2 mechanical approval gate (real
// example, validated word reading, complete sentence tokenization, a
// resolved target span) ship to learners. The rest stay in the full catalog
// for reporting and Phase 3 review; see vocabularyCatalogCounts below.
const sourceItems: VocabularyDataItem[] = activeVocabularyItems(
  validation.data,
);

export const vocabularyCorpus = sourceItems.map(
  ({ kanjiForm, classificationNote, sources, ...item }): CurriculumDraft => {
    void sources; // per-record provenance; Concept has no "sources" field
    return {
      ...item,
      commonality: item.vocabulary.priority.band,
      ...(kanjiForm ? { kanjiForm } : {}),
      ...(classificationNote ? { classificationNote } : {}),
    };
  },
);

// The approved subset that actually reaches the app. Prefer this for any UI
// or test that describes what a learner sees.
export const vocabularyCorpusCounts = validation.data.approvedCounts;
// The full candidate catalog, approved and unapproved together. Useful for
// data-quality reporting; do not present this as what learners study.
export const vocabularyCatalogCounts = validation.data.counts;
export const retiredVocabulary = new Map(
  validation.data.retired.map((item) => [item.id, item.reason]),
);

export const vocabularySource =
  "OpenJLPT, Jonathan Waller JLPT Resources, Open Anki JLPT Decks, and JMdict/Tatoeba; record-level provenance is stored with each item (see ATTRIBUTION.md).";
