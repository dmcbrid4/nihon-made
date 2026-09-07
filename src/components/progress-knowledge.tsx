"use client";

import { knowledgeStateBreakdown } from "@/lib/study/curriculum-progress";
import { useStudy } from "./study-provider";

const stages = ["mastered", "learning", "introduced", "unseen"] as const;
const stageLabel: Record<(typeof stages)[number], string> = {
  mastered: "Mastered",
  learning: "Learning",
  introduced: "Introduced",
  unseen: "Unseen",
};
const stageClass: Record<(typeof stages)[number], string> = {
  mastered: "stage-mastered",
  learning: "stage-learning",
  introduced: "stage-introduced",
  unseen: "stage-unseen",
};

export function ProgressKnowledgeState() {
  const { state } = useStudy();
  if (!state) return null;
  const breakdown = knowledgeStateBreakdown(state);
  return (
    <section className="panel knowledge-state" aria-label="Knowledge state breakdown">
      <div className="section-heading">
        <div>
          <h2>What you know</h2>
          <p>
            Composition of the whole N5+N4 curriculum (vocabulary, kanji, and
            grammar combined) across the app’s real study states.
          </p>
        </div>
      </div>
      <div
        className="knowledge-bar"
        role="img"
        aria-label={`${breakdown.mastered} mastered, ${breakdown.learning} learning, ${breakdown.introduced} introduced, ${breakdown.unseen} unseen`}
      >
        {breakdown.total > 0 &&
          stages.map((stage) => (
            <span
              key={stage}
              className={stageClass[stage]}
              style={{ width: `${(breakdown[stage] / breakdown.total) * 100}%` }}
            />
          ))}
      </div>
      <ul className="knowledge-legend">
        {stages.map((stage) => (
          <li key={stage}>
            <span className={`legend-dot ${stageClass[stage]}`} />
            {stageLabel[stage]}
            <strong>{breakdown[stage]}</strong>
          </li>
        ))}
      </ul>
      <p className="progress-note">
        This app has no separate calibration step, so <strong>introduced</strong>{" "}
        (reviewed once) is the closest real signal to a known baseline —{" "}
        it is not the same as SRS mastery.{" "}
        <strong>Mastered</strong> means three consecutive Good or Easy ratings
        with a review interval of at least seven days.
      </p>
    </section>
  );
}
