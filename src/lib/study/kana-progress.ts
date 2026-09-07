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

/** A character's status is the better of its two directions -- mastering
 * either recognition or recall alone is enough to master the character (a
 * 5-correct streak masters "a kana", per the quiz's mastery rule, not "a
 * kana in one specific direction"). Recognition and recall still track and
 * quiz separately; this only combines them for the character-level badge.
 * It's "unseen" only when neither direction has ever been reviewed. */
export function characterStatus(
  recognition: ConceptProgress | undefined,
  recall: ConceptProgress | undefined,
): CurriculumStage {
  const best = Math.max(rank(recognition), rank(recall));
  if (best === 0) return "unseen";
  if (best === 3) return "mastered";
  return best >= 2 ? "learning" : "introduced";
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
  for (const entry of entries)
    stages[characterStatusFor(entry, progressById)] += 1;
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
  const buckets = Array.from(
    new Set(entries.map((e) => bucketFor[e.category])),
  );
  const cohorts = buckets.map((bucket) =>
    buildCohort(
      bucket,
      bucketLabel[bucket],
      entries.filter((e) => bucketFor[e.category] === bucket),
      progressById,
    ),
  );
  return [...cohorts, buildCohort("total", "All kana", entries, progressById)];
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
  const hiragana = buildCohort(
    "hiragana",
    "Hiragana",
    kanaEntries.hiragana,
    progressById,
  );
  const katakana = buildCohort(
    "katakana",
    "Katakana",
    kanaEntries.katakana,
    progressById,
  );
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
 * (either direction, via characterStatus), not "viewed every card once".
 * Always includes: Basic
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
    const buckets = Array.from(
      new Set(entries.map((e) => bucketFor[e.category])),
    );
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

/** Kana's entire mastery model. Kana mode is not a daily SRS system -- there
 * is no due date, no row-unlocking gate, no "study session". The *only* way
 * a kana concept's progress moves is a Quiz mode answer (kana-quiz.tsx),
 * scored here directly, independent of the vocabulary/kanji/grammar
 * scheduler (scheduler.ts's scheduleReview). A streak of 5 correct answers
 * in a row masters it; each question is a single attempt, and a miss
 * resets the streak to 0. dueAt/lastReviewedAt carry no scheduling meaning
 * for kana (nothing reads them for gating); they're kept only because
 * ConceptProgress's shape -- and therefore the existing repository/DB
 * plumbing -- is otherwise unchanged. */
export function recordKanaQuizAnswer(
  conceptId: string,
  correct: boolean,
  now: Date,
  previous?: ConceptProgress,
): ConceptProgress {
  const successStreak = correct ? (previous?.successStreak ?? 0) + 1 : 0;
  // First-ever attempt (right or wrong) is "introduced"; from the second
  // attempt onward it's "learning" until the streak reaches 5.
  const status =
    successStreak >= 5 ? "mastered" : previous ? "learning" : "introduced";
  return {
    conceptId,
    status,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    successStreak,
    intervalDays: previous?.intervalDays ?? 0,
    dueAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
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
