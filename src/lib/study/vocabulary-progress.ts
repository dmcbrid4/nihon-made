import { curriculumProgress, type CurriculumCohort, type CurriculumStage } from "./curriculum-progress";
import type { StudyState } from "./types";

/** @deprecated Use CurriculumStage from curriculum-progress.ts. Kept as an
 * alias since this was the original name. */
export type VocabularyStage = CurriculumStage;
/** @deprecated Use CurriculumCohort from curriculum-progress.ts. */
export type VocabularyCohort = CurriculumCohort;

export function vocabularyProgress(state: StudyState): VocabularyCohort[] {
  return curriculumProgress(state, "vocabulary");
}
