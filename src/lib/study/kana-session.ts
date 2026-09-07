import { concepts, conceptById } from "./content";
import { dateInZone } from "./dates";
import {
  kanaConceptId,
  kanaEntries,
  kanaEntryById,
  parseKanaConceptId,
  type KanaEntry,
} from "./kana";
import { maxUnlockedStage } from "./kana-progress";
import type { Concept, KanaScript, StudySession, StudyState } from "./types";

/** "5-10 new symbols at a time" per the product spec -- deliberately much
 * smaller than vocabulary's daily caps, since the whole curriculum is only
 * ~229 characters and cramming would defeat "rapid but durable acquisition". */
const NEW_CHARACTERS_PER_QUEUE = 6;

function scriptConcepts(script: KanaScript): Concept[] {
  return concepts.filter(
    (item) => item.type === "kana" && item.kanaDetails?.script === script,
  );
}

function sessionScript(session: StudySession): KanaScript | null {
  const first = session.conceptIds[0];
  const concept = first ? conceptById.get(first) : undefined;
  return concept?.kanaDetails?.script ?? null;
}

export function currentKanaSession(
  state: StudyState,
  now: Date,
  script: KanaScript,
) {
  return (
    state.sessions.find(
      (session) =>
        !session.completedAt &&
        session.mode === "kana" &&
        sessionScript(session) === script,
    ) ??
    state.sessions.findLast(
      (session) =>
        session.mode === "kana" &&
        sessionScript(session) === script &&
        session.date === dateInZone(now, state.goal.timeZone),
    )
  );
}

/** Builds one kana study queue: due reviews first (any character, either
 * direction), then a small batch of new introductions from the highest
 * unlocked stage downward. New characters introduce their recognition
 * concept immediately followed by their recall concept, so a fresh
 * character's "Introduction" panel is shown once before both quizzes
 * rather than twice -- see kana-study.tsx. */
export function buildKanaQueue(
  state: StudyState,
  now: Date,
  script: KanaScript,
): Concept[] {
  const progressById = new Map(state.progress.map((item) => [item.conceptId, item]));
  const items = scriptConcepts(script);
  const unlockedStage = maxUnlockedStage(state, script);

  const due = items
    .filter((item) => {
      const entry = progressById.get(item.id);
      return entry && Date.parse(entry.dueAt) <= now.getTime();
    })
    .sort(
      (a, b) =>
        Date.parse(progressById.get(a.id)!.dueAt) -
        Date.parse(progressById.get(b.id)!.dueAt),
    );

  const unseen = items
    .filter(
      (item) =>
        (item.kanaDetails?.stage ?? Infinity) <= unlockedStage &&
        !progressById.has(item.id),
    )
    .sort((a, b) => {
      const orderDiff =
        (a.kanaDetails?.curriculumOrder ?? 0) - (b.kanaDetails?.curriculumOrder ?? 0);
      if (orderDiff) return orderDiff;
      // Recognition before recall for the same character.
      return a.kanaDetails?.direction === b.kanaDetails?.direction
        ? 0
        : a.kanaDetails?.direction === "recognition"
          ? -1
          : 1;
    });

  const selected: Concept[] = [...due];
  const selectedIds = new Set(selected.map((item) => item.id));
  let newCharacters = 0;
  const seenCharacters = new Set<string>();
  for (const item of unseen) {
    const details = item.kanaDetails!;
    if (details.direction === "recall") {
      const parsed = parseKanaConceptId(item.id);
      const recognitionId = parsed ? kanaConceptId(parsed.entryId, "recognition") : item.id;
      const recognitionKnown =
        progressById.has(recognitionId) || selectedIds.has(recognitionId);
      if (!recognitionKnown) continue;
    }
    if (!seenCharacters.has(details.character)) {
      if (newCharacters >= NEW_CHARACTERS_PER_QUEUE) continue;
      seenCharacters.add(details.character);
      newCharacters += 1;
    }
    selected.push(item);
    selectedIds.add(item.id);
  }
  return selected;
}

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
