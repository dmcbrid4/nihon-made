import { kanaDirections } from "./types";
import type { KanaDirection, KanaScript } from "./types";
import { kanaEntries, kanaEntryById, type KanaEntry } from "./kana";

/** Multiple-choice distractors for one kana entry, prioritized toward real
 * confusion risk: confusion-set members first (see types.ts's
 * KanaDetails.confusionSet), then same-row, then same-category, then
 * anything else in the script. Deterministic order -- callers shuffle for
 * display so tests can assert on the candidate set itself. */
export function distractorsFor(
  entryId: string,
  script: KanaScript,
  count = 3,
): KanaEntry[] {
  const entry = kanaEntryById.get(entryId);
  if (!entry) return [];
  const pool = kanaEntries[script].filter((item) => item.id !== entry.id);
  const confusion = pool.filter((item) => entry.confusionSet.includes(item.character));
  const sameRow = pool.filter(
    (item) => item.row === entry.row && !confusion.includes(item),
  );
  const sameCategory = pool.filter(
    (item) => item.category === entry.category && item.row !== entry.row,
  );
  const rest = pool.filter((item) => item.category !== entry.category);
  const ranked = [...confusion, ...sameRow, ...sameCategory, ...rest];
  const seen = new Set<string>();
  const result: KanaEntry[] = [];
  for (const item of ranked) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length === count) break;
  }
  return result;
}

export type QuizDirectionMode = "recognition" | "recall" | "mixed";
export type QuizLength = "short" | "medium" | "all";
export type KanaQuestion = { entryId: string; direction: KanaDirection };

const LENGTH_TARGET: Record<Exclude<QuizLength, "all">, number> = {
  short: 10,
  medium: 20,
};

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Builds one quiz's question list from a freely chosen selection of entry
 * ids. "Mixed" asks about both directions for every selected character;
 * "recognition"/"recall" ask about only that direction. `length` trims (or,
 * for a short selection, cycles) the shuffled pool to a target size --
 * "all" always asks about the full (direction-expanded) selection exactly
 * once, in random order. Pure function: no dependency on ConceptProgress or
 * any dispatch, so it's trivial to unit test on its own. */
export function buildQuizQuestions(
  selectedIds: Iterable<string>,
  directionMode: QuizDirectionMode,
  length: QuizLength,
): KanaQuestion[] {
  const directions: KanaDirection[] =
    directionMode === "mixed" ? [...kanaDirections] : [directionMode];
  const pool: KanaQuestion[] = [];
  for (const entryId of selectedIds) {
    if (!kanaEntryById.has(entryId)) continue;
    for (const direction of directions) pool.push({ entryId, direction });
  }
  const shuffledPool = shuffled(pool);
  if (length === "all" || !shuffledPool.length) return shuffledPool;
  const target = LENGTH_TARGET[length];
  if (shuffledPool.length >= target) return shuffledPool.slice(0, target);
  // A small selection with a longer requested length: cycle through fresh
  // reshuffles of the pool so repeats aren't clustered back-to-back.
  const questions: KanaQuestion[] = [];
  while (questions.length < target) questions.push(...shuffled(pool));
  return questions.slice(0, target);
}
