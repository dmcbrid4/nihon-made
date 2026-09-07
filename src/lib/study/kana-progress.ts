import { concepts } from "./content";
import { kanaConceptId, kanaEntries, kanaStages, type KanaEntry } from "./kana";
import type {
  ConceptProgress,
  KanaCategory,
  KanaScript,
  StudyState,
} from "./types";
import type { CurriculumStage } from "./curriculum-progress";

/** Kana has no JLPT level, so it deliberately does not join curriculumTypes/
 * curriculumProgress (those are keyed on N5/N4 cohorts, see
 * curriculum-progress.ts) -- it gets this parallel module instead, keyed on
 * script (hiragana/katakana) and curriculum bucket. */
export type KanaBucket = "basic" | "voiced" | "combinations" | "extended";
const bucketFor: Record<KanaCategory, KanaBucket> = {
  basic: "basic",
  dakuten: "voiced",
  handakuten: "voiced",
  yoon: "combinations",
  small: "combinations",
  extended: "extended",
};
const bucketLabel: Record<KanaBucket, string> = {
  basic: "Basic kana",
  voiced: "Voiced kana",
  combinations: "Combinations",
  extended: "Extended",
};

/** Rank used only to combine a character's two directions into one status;
 * unrelated to (but reuses the shape of) curriculum-progress's CurriculumStage. */
function rank(progress?: ConceptProgress): 0 | 1 | 2 | 3 {
  if (!progress) return 0;
  if (progress.status === "mastered") return 3;
  if (progress.status === "learning") return 2;
  return 1;
}

/** A character is "mastered" only once BOTH recognition and recall reach
 * mastery -- see types.ts's KanaDirection doc comment. It's "unseen" only
 * when neither direction has ever been reviewed, and never regresses back
 * to "unseen" once either direction has started (so a character mid-way
 * through its pair doesn't look untouched). */
export function characterStatus(
  recognition: ConceptProgress | undefined,
  recall: ConceptProgress | undefined,
): CurriculumStage {
  const r = rank(recognition);
  const c = rank(recall);
  if (r === 0 && c === 0) return "unseen";
  if (r === 3 && c === 3) return "mastered";
  return Math.min(r, c) >= 2 ? "learning" : "introduced";
}

export function characterStatusFor(
  entry: KanaEntry,
  progressById: Map<string, ConceptProgress>,
): CurriculumStage {
  return characterStatus(
    progressById.get(kanaConceptId(entry.id, "recognition")),
    progressById.get(kanaConceptId(entry.id, "recall")),
  );
}

export type KanaCohort = {
  id: string;
  label: string;
  total: number;
  unseen: number;
  introduced: number;
  learning: number;
  mastered: number;
};

function buildCohort(
  id: string,
  label: string,
  entries: KanaEntry[],
  progressById: Map<string, ConceptProgress>,
): KanaCohort {
  const stages: Record<CurriculumStage, number> = {
    unseen: 0,
    introduced: 0,
    learning: 0,
    mastered: 0,
  };
  for (const entry of entries) stages[characterStatusFor(entry, progressById)] += 1;
  return { id, label, total: entries.length, ...stages };
}

function progressMap(state: StudyState) {
  return new Map(state.progress.map((item) => [item.conceptId, item]));
}

/** One cohort per curriculum bucket present in this script, plus a "total"
 * cohort for the whole script. Mirrors curriculumProgress's shape (a small
 * array of cohorts) without forcing kana through its N5/N4 structure. */
export function kanaScriptProgress(
  state: StudyState,
  script: KanaScript,
): KanaCohort[] {
  const progressById = progressMap(state);
  const entries = kanaEntries[script];
  const buckets = Array.from(new Set(entries.map((e) => bucketFor[e.category])));
  const cohorts = buckets.map((bucket) =>
    buildCohort(
      bucket,
      bucketLabel[bucket],
      entries.filter((e) => bucketFor[e.category] === bucket),
      progressById,
    ),
  );
  return [
    ...cohorts,
    buildCohort("total", "All kana", entries, progressById),
  ];
}

export type KanaOverview = {
  hiragana: number;
  katakana: number;
  /** Mastered / total across both scripts combined, weighted by count. */
  overall: number;
};

function percent(mastered: number, total: number): number {
  return total ? Math.round((mastered / total) * 100) : 0;
}

export function kanaOverview(state: StudyState): KanaOverview {
  const progressById = progressMap(state);
  const hiragana = buildCohort("hiragana", "Hiragana", kanaEntries.hiragana, progressById);
  const katakana = buildCohort("katakana", "Katakana", kanaEntries.katakana, progressById);
  return {
    hiragana: percent(hiragana.mastered, hiragana.total),
    katakana: percent(katakana.mastered, katakana.total),
    overall: percent(
      hiragana.mastered + katakana.mastered,
      hiragana.total + katakana.total,
    ),
  };
}

export type KanaMilestone = {
  script: KanaScript;
  bucket: KanaBucket | "all";
  label: string;
  mastered: number;
  total: number;
  complete: boolean;
};

/** Meaningful completion milestones, based on real per-character mastery
 * (both directions), not "viewed every card once". Always includes: Basic
 * Hiragana, Hiragana voiced sounds, Hiragana complete, Basic Katakana,
 * Katakana complete, and Kana foundation complete (both scripts) -- plus a
 * couple of natural extras (Hiragana combinations, Katakana voiced/
 * combinations/extended) generated the same way instead of being hardcoded
 * one-offs. */
export function kanaMilestones(state: StudyState): KanaMilestone[] {
  const progressById = progressMap(state);
  const milestones: KanaMilestone[] = [];
  for (const script of ["hiragana", "katakana"] as const) {
    const entries = kanaEntries[script];
    const buckets = Array.from(new Set(entries.map((e) => bucketFor[e.category])));
    for (const bucket of buckets) {
      const cohort = buildCohort(
        bucket,
        bucketLabel[bucket],
        entries.filter((e) => bucketFor[e.category] === bucket),
        progressById,
      );
      milestones.push({
        script,
        bucket,
        label: `${bucket === "basic" ? "Basic" : bucketLabel[bucket]} ${script === "hiragana" ? "Hiragana" : "Katakana"}${bucket === "basic" ? "" : " sounds"}`,
        mastered: cohort.mastered,
        total: cohort.total,
        complete: cohort.total > 0 && cohort.mastered === cohort.total,
      });
    }
    const all = buildCohort("total", "All", entries, progressById);
    milestones.push({
      script,
      bucket: "all",
      label: `${script === "hiragana" ? "Hiragana" : "Katakana"} complete`,
      mastered: all.mastered,
      total: all.total,
      complete: all.total > 0 && all.mastered === all.total,
    });
  }
  const both = buildCohort(
    "total",
    "Kana",
    [...kanaEntries.hiragana, ...kanaEntries.katakana],
    progressById,
  );
  milestones.push({
    script: "hiragana",
    bucket: "all",
    label: "Kana foundation complete",
    mastered: both.mastered,
    total: both.total,
    complete: both.total > 0 && both.mastered === both.total,
  });
  return milestones;
}

/** Which stages of this script's curriculum are unlocked for new
 * introductions. Stage 1 is always unlocked; stage N unlocks once at least
 * UNLOCK_THRESHOLD of stage N-1's characters have been introduced (their
 * recognition direction has at least one review) -- "a reasonable
 * familiarity threshold", not full mastery, so a tiny 3-5 character row
 * doesn't gate progress for long. */
const UNLOCK_THRESHOLD = 0.7;

export function maxUnlockedStage(state: StudyState, script: KanaScript): number {
  const progressById = progressMap(state);
  const entries = kanaEntries[script];
  const stageNumbers = Array.from(new Set(entries.map((e) => e.stage))).sort(
    (a, b) => a - b,
  );
  if (!stageNumbers.length) return 0;
  let unlocked = stageNumbers[0];
  for (let i = 1; i < stageNumbers.length; i++) {
    const previous = entries.filter((e) => e.stage === stageNumbers[i - 1]);
    const introduced = previous.filter((e) =>
      progressById.has(kanaConceptId(e.id, "recognition")),
    ).length;
    const ratio = previous.length ? introduced / previous.length : 1;
    if (ratio < UNLOCK_THRESHOLD) break;
    unlocked = stageNumbers[i];
  }
  return unlocked;
}

export function kanaStagesFor(script: KanaScript) {
  return kanaStages.filter((stage) => stage.script === script);
}

/** True once every character in a script has moved past "unseen" -- used
 * to decide whether the learner still needs the beginner intro framing. */
export function kanaStarted(state: StudyState): boolean {
  return concepts.some(
    (concept) =>
      concept.type === "kana" &&
      state.progress.some((p) => p.conceptId === concept.id),
  );
}
