import vocabularyData from "./data/jlpt-n5-n4-vocabulary.json";
import type { CurriculumDraft } from "./curriculum-expansion";

type SourceVocabulary = {
  id: string;
  expression: string;
  kanjiForm: string | null;
  reading: string;
  meaning: string;
  level: "N5" | "N4";
  partOfSpeech: string;
  example: string;
  exampleMeaning: string;
  note: string;
  topic: string;
  classificationNote: string | null;
};

const sourceItems = vocabularyData.items as SourceVocabulary[];

export const vocabularyCorpus = sourceItems.map(
  ({ kanjiForm, classificationNote, ...item }): CurriculumDraft => ({
    ...item,
    type: "vocabulary",
    ...(kanjiForm ? { kanjiForm } : {}),
    ...(classificationNote ? { classificationNote } : {}),
  }),
);

export const vocabularyCorpusCounts = vocabularyData.counts;

export const vocabularySource =
  "OpenJLPT, Jonathan Waller JLPT Resources, Open Anki JLPT Decks, and JMdict/Tatoeba (CC BY-SA 4.0; see ATTRIBUTION.md).";
