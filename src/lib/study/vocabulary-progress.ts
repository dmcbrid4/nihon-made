import { concepts } from "./content";
import type { ConceptProgress, StudyState } from "./types";

export type VocabularyStage = "unseen" | ConceptProgress["status"];

export type VocabularyCohort = {
  id: "n5" | "n4" | "total";
  label: string;
  total: number;
  unseen: number;
  introduced: number;
  learning: number;
  mastered: number;
};

function cohort(
  id: VocabularyCohort["id"],
  label: string,
  conceptIds: string[],
  progressById: Map<string, ConceptProgress>,
): VocabularyCohort {
  const stages: Record<VocabularyStage, number> = {
    unseen: 0,
    introduced: 0,
    learning: 0,
    mastered: 0,
  };
  for (const conceptId of conceptIds)
    stages[progressById.get(conceptId)?.status ?? "unseen"] += 1;
  return { id, label, total: conceptIds.length, ...stages };
}

export function vocabularyProgress(state: StudyState): VocabularyCohort[] {
  const progressById = new Map(
    state.progress.map((item) => [item.conceptId, item]),
  );
  const n5 = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N5")
    .map((item) => item.id);
  const n4 = concepts
    .filter((item) => item.type === "vocabulary" && item.level === "N4")
    .map((item) => item.id);
  return [
    cohort("n5", "N5 vocabulary", n5, progressById),
    cohort("n4", "N4-only vocabulary", n4, progressById),
    cohort("total", "N5–N4 vocabulary", [...n5, ...n4], progressById),
  ];
}
