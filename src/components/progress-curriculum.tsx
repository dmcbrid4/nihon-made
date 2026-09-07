"use client";

import {
  curriculumOverview,
  curriculumProgress,
  curriculumTypes,
  milestones,
  type CurriculumCohort,
  type CurriculumType,
} from "@/lib/study/curriculum-progress";
import type { StudyState } from "@/lib/study/types";
import { useStudy } from "./study-provider";

const typeLabel: Record<CurriculumType, string> = {
  vocabulary: "Vocabulary",
  kanji: "Kanji",
  grammar: "Grammar",
};

function MasteryCard({ cohort }: { cohort: CurriculumCohort }) {
  const complete = cohort.total > 0 && cohort.mastered === cohort.total;
  const introducedOrFurther = cohort.introduced + cohort.learning + cohort.mastered;
  return (
    <div className="vocabulary-progress-card">
      <span>{cohort.label}</span>
      <strong>
        {cohort.mastered} <small>/ {cohort.total}</small>
      </strong>
      <p>{complete ? "mastered — Complete ✓" : "mastered"}</p>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`${cohort.label} mastered`}
        aria-valuenow={cohort.mastered}
        aria-valuemin={0}
        aria-valuemax={cohort.total || 1}
      >
        <span
          className="progress-learning"
          style={{ width: `${cohort.total ? (introducedOrFurther / cohort.total) * 100 : 0}%` }}
        />
        <span
          className="progress-mastered"
          style={{ width: `${cohort.total ? (cohort.mastered / cohort.total) * 100 : 0}%` }}
        />
      </div>
      <small>
        {cohort.unseen} unseen · {cohort.introduced} introduced · {cohort.learning} learning
      </small>
    </div>
  );
}

function CurriculumMasterySection({ state, type }: { state: StudyState; type: CurriculumType }) {
  const cohorts = curriculumProgress(state, type);
  return (
    <section className="panel" aria-label={`${typeLabel[type]} mastery`}>
      <div className="section-heading">
        <h2>{typeLabel[type]}</h2>
      </div>
      <div className="vocabulary-progress-grid">
        {cohorts.map((cohort) => (
          <MasteryCard key={cohort.id} cohort={cohort} />
        ))}
      </div>
    </section>
  );
}

export function ProgressCurriculum() {
  const { state } = useStudy();
  if (!state) return null;
  const overview = curriculumOverview(state);
  const done = milestones(state).filter((item) => item.complete);
  return (
    <>
      <section className="panel curriculum-overview" aria-label="N4 curriculum progress">
        <div className="section-heading">
          <div>
            <h2>N4 curriculum progress</h2>
            <p>
              How much of the combined N5+N4 curriculum you’ve mastered. This is
              curriculum coverage, not an estimate of JLPT readiness.
            </p>
          </div>
        </div>
        <div className="curriculum-overview-bars">
          {curriculumTypes.map((type) => (
            <div key={type} className="curriculum-overview-row">
              <span>{typeLabel[type]}</span>
              <div className="progress-track">
                <span className="progress-mastered" style={{ width: `${overview[type]}%` }} />
              </div>
              <strong>{overview[type]}%</strong>
            </div>
          ))}
        </div>
        <div className="curriculum-overview-total">
          <span>Overall curriculum progress</span>
          <strong>{overview.overall}%</strong>
        </div>
        {done.length > 0 && (
          <ul className="milestone-list">
            {done.map((item) => (
              <li key={`${item.type}-${item.level}`}>
                <span>{item.label}</span>
                <span>
                  {item.mastered} / {item.total} mastered
                </span>
                <span className="milestone-complete">Complete ✓</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {curriculumTypes.map((type) => (
        <CurriculumMasterySection key={type} state={state} type={type} />
      ))}
    </>
  );
}
