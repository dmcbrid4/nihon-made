import { concepts } from "./content";
import type { ConceptProgress, StudyState } from "./types";

export type CurriculumStage = "unseen" | ConceptProgress["status"];
export const curriculumStages = [
  "unseen",
  "introduced",
  "learning",
  "mastered",
] as const satisfies readonly CurriculumStage[];

/** The three concept types with a real curriculum-mastery notion. Reading
 * and listening are excluded: they have no per-item mastery status yet. */
export const curriculumTypes = ["vocabulary", "kanji", "grammar"] as const;
export type CurriculumType = (typeof curriculumTypes)[number];

const typeLabel: Record<CurriculumType, string> = {
  vocabulary: "vocabulary",
  kanji: "kanji",
  grammar: "grammar",
};

export type CurriculumCohort = {
  id: "n5" | "n4" | "total";
  label: string;
  total: number;
  unseen: number;
  introduced: number;
  learning: number;
  mastered: number;
};

function cohort(
  id: CurriculumCohort["id"],
  label: string,
  conceptIds: string[],
  progressById: Map<string, ConceptProgress>,
): CurriculumCohort {
  const stages: Record<CurriculumStage, number> = {
    unseen: 0,
    introduced: 0,
    learning: 0,
    mastered: 0,
  };
  for (const conceptId of conceptIds)
    stages[progressById.get(conceptId)?.status ?? "unseen"] += 1;
  return { id, label, total: conceptIds.length, ...stages };
}

/** N5, N4-only, and combined cohorts for one curriculum type. The Tae Kim
 * track is intentionally excluded -- it has no JLPT level and isn't part of
 * "how much of N5/N4 have I completed". */
export function curriculumProgress(
  state: StudyState,
  type: CurriculumType,
): [CurriculumCohort, CurriculumCohort, CurriculumCohort] {
  const progressById = new Map(
    state.progress.map((item) => [item.conceptId, item]),
  );
  const n5 = concepts
    .filter((item) => item.type === type && item.level === "N5")
    .map((item) => item.id);
  const n4 = concepts
    .filter((item) => item.type === type && item.level === "N4")
    .map((item) => item.id);
  return [
    cohort("n5", `N5 ${typeLabel[type]}`, n5, progressById),
    cohort("n4", `N4-only ${typeLabel[type]}`, n4, progressById),
    cohort("total", `N5–N4 ${typeLabel[type]}`, [...n5, ...n4], progressById),
  ];
}

function percent(mastered: number, total: number): number {
  return total ? Math.round((mastered / total) * 100) : 0;
}

export type CurriculumOverview = {
  vocabulary: number;
  kanji: number;
  grammar: number;
  /** Mastered / total across vocabulary, kanji, and grammar combined,
   * weighted by item count -- not an average of the three percentages. */
  overall: number;
};

/** "N4 curriculum progress": how much of the combined N5+N4 curriculum has
 * been mastered, per type and overall. Deliberately not a "proficiency"
 * score -- there is no reading/listening mastery model to back one. */
export function curriculumOverview(state: StudyState): CurriculumOverview {
  const combined = curriculumTypes.map((type) => curriculumProgress(state, type)[2]);
  const sums = combined.reduce(
    (acc, c) => ({ mastered: acc.mastered + c.mastered, total: acc.total + c.total }),
    { mastered: 0, total: 0 },
  );
  const [vocabulary, kanji, grammar] = combined;
  return {
    vocabulary: percent(vocabulary.mastered, vocabulary.total),
    kanji: percent(kanji.mastered, kanji.total),
    grammar: percent(grammar.mastered, grammar.total),
    overall: percent(sums.mastered, sums.total),
  };
}

export type KnowledgeStateBreakdown = {
  unseen: number;
  introduced: number;
  learning: number;
  mastered: number;
  total: number;
};

/** Composition of the whole N5+N4 curriculum (vocabulary + kanji + grammar
 * combined) across the app's real study states. There is no calibration
 * feature in this app, so "introduced" -- one real review, not yet
 * mastered -- stands in for a "known baseline" state; it is not a stand-in
 * for SRS mastery. */
export function knowledgeStateBreakdown(state: StudyState): KnowledgeStateBreakdown {
  return curriculumTypes
    .map((type) => curriculumProgress(state, type)[2])
    .reduce(
      (acc, c) => ({
        unseen: acc.unseen + c.unseen,
        introduced: acc.introduced + c.introduced,
        learning: acc.learning + c.learning,
        mastered: acc.mastered + c.mastered,
        total: acc.total + c.total,
      }),
      { unseen: 0, introduced: 0, learning: 0, mastered: 0, total: 0 },
    );
}

export type Milestone = {
  type: CurriculumType;
  level: "N5" | "N4";
  label: string;
  mastered: number;
  total: number;
  complete: boolean;
};

/** Curriculum subsections that are effectively done: every item in that
 * type+level has reached "mastered". */
export function milestones(state: StudyState): Milestone[] {
  return curriculumTypes.flatMap((type) => {
    const [n5, n4] = curriculumProgress(state, type);
    return [
      { level: "N5" as const, cohort: n5 },
      { level: "N4" as const, cohort: n4 },
    ].map(({ level, cohort }) => ({
      type,
      level,
      label: `${level} ${typeLabel[type]}`,
      mastered: cohort.mastered,
      total: cohort.total,
      complete: cohort.total > 0 && cohort.mastered === cohort.total,
    }));
  });
}
