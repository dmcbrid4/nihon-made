import { z } from "zod";
import taeKimData from "./data/tae-kim-deck.json";
import type { CurriculumDraft } from "./curriculum-expansion";

// Mined from "Japanese course based on Tae Kim's grammar guide (anime)"
// (the "Japanese Like a Breeze" Anki deck): real sentences pulled from
// anime/drama, each with a Japanese Like a Breeze translation, grammar
// notes, and an audio clip + screenshot. That media is taken directly from
// copyrighted anime/drama episodes -- personal use only, never
// redistributed. See docs/tae-kim-mode.md and scripts/mine-tae-kim-deck.py.
// This track is exempt from the JLPT corpus's open-licensing/attribution
// rigor for exactly that reason: it isn't shipped to anyone but this user.

const phraseSchema = z.object({
  id: z.string().min(1),
  japanese: z.string().min(1),
  reading: z.string().min(1),
  lemmaField: z.string(),
  romaji: z.string(),
  translation: z.string().min(1),
  grammarNote: z.string(),
  notes: z.string(),
  source: z.string().min(1),
  audioFile: z.string().nullable(),
  imageFile: z.string().nullable(),
  tokenLemmas: z.array(z.string()),
  itemKind: z.enum(["word", "sentence"]),
});

const wordSchema = z.object({
  id: z.string().min(1),
  lemma: z.string().min(1),
  reading: z.string().min(1),
  partOfSpeech: z.string().min(1),
  frequency: z.number().int().positive(),
  examplePhraseIds: z.array(z.string()).min(1),
  dictionary: z.object({
    matched: z.boolean(),
    entryId: z.string().nullable(),
    common: z.boolean(),
    gloss: z.string().nullable(),
  }),
});

const taeKimDatasetSchema = z.object({
  sourceDeck: z.string().min(1),
  sourceNoteCount: z.number().int().positive(),
  counts: z.object({
    phrases: z.number().int().nonnegative(),
    words: z.number().int().nonnegative(),
    mediaFilesCopied: z.number().int().nonnegative(),
  }),
  phrases: z.array(phraseSchema),
  words: z.array(wordSchema),
});

const parsed = taeKimDatasetSchema.parse(taeKimData);

const POS_LABELS: Record<string, string> = {
  動詞: "verb",
  形容詞: "i-adjective",
  形状詞: "na-adjective",
  名詞: "noun",
  副詞: "adverb",
  連体詞: "pre-noun adjectival",
  接続詞: "conjunction",
  感動詞: "interjection",
};

export const taeKimSource =
  "Mined from \"Japanese course based on Tae Kim's grammar guide (anime)\" (the “Japanese Like a Breeze” Anki deck), which follows Tae Kim's grammar guide illustrated with real anime/drama dialogue. Audio and screenshots are taken from copyrighted anime/drama episodes for this user's personal study only; see docs/tae-kim-mode.md.";

const phrasesById = new Map(parsed.phrases.map((phrase) => [phrase.id, phrase]));

function mediaPath(file: string | null) {
  return file ? `/tae-kim/media/${file}` : undefined;
}

const phraseConcepts: CurriculumDraft[] = parsed.phrases.map((phrase) => ({
  id: phrase.id,
  type: "listening",
  expression: phrase.japanese,
  reading: phrase.reading,
  meaning: phrase.translation,
  level: "tae-kim",
  example: phrase.japanese,
  exampleMeaning: phrase.translation,
  note:
    [phrase.grammarNote, phrase.notes].filter(Boolean).join("\n\n") ||
    "Listen, then reveal the translation.",
  topic: "Tae Kim course",
  media: {
    audio: mediaPath(phrase.audioFile),
    image: mediaPath(phrase.imageFile),
    sourceShow: phrase.source,
  },
}));

const wordConcepts: CurriculumDraft[] = parsed.words.map((word) => {
  const example = phrasesById.get(word.examplePhraseIds[0]);
  return {
    id: word.id,
    type: "vocabulary",
    expression: word.lemma,
    reading: word.reading,
    meaning:
      word.dictionary.gloss ??
      "Not found in JMdict -- likely a character or place name from the source show.",
    level: "tae-kim",
    partOfSpeech: POS_LABELS[word.partOfSpeech] ?? word.partOfSpeech,
    example: example?.japanese ?? word.lemma,
    exampleMeaning: example?.translation ?? word.dictionary.gloss ?? "",
    note: `Appears ${word.frequency} time${word.frequency === 1 ? "" : "s"} in the Tae Kim course.`,
    topic: "Tae Kim course",
    media: example
      ? {
          audio: mediaPath(example.audioFile),
          image: mediaPath(example.imageFile),
          sourceShow: example.source,
        }
      : undefined,
  };
});

export const taeKimConcepts: CurriculumDraft[] = [...wordConcepts, ...phraseConcepts];
export const taeKimCounts = parsed.counts;
