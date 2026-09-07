"use client";

import { formatTargetDate } from "@/lib/study/dates";
import { pacing } from "@/lib/study/progress-metrics";
import { useStudy } from "./study-provider";

const statusLabel: Record<string, string> = {
  complete: "Complete",
  ahead: "Ahead of pace",
  "on-pace": "On pace",
  behind: "Behind pace",
  unknown: "Not enough history yet",
};

export function ProgressPacing() {
  const { state, now } = useStudy();
  if (!state) return null;
  const result = pacing(state, now, "vocabulary");

  return (
    <section className="panel pacing-section" aria-label="Pacing toward your target date">
      <div className="section-heading">
        <div>
          <h2>Pacing toward {formatTargetDate(state.goal.targetDate)}</h2>
          <p>Vocabulary is the largest track, so it’s the clearest pacing signal.</p>
        </div>
      </div>
      {result.status === "complete" ? (
        <p className="pacing-complete">
          All {result.total} N5–N4 vocabulary items are mastered.
        </p>
      ) : (
        <div className="pacing-grid">
          <div>
            <span>Remaining</span>
            <strong>{result.remaining}</strong>
            <small>vocabulary items</small>
          </div>
          <div>
            <span>Days remaining</span>
            <strong>{result.daysRemaining}</strong>
            <small>to {formatTargetDate(state.goal.targetDate)}</small>
          </div>
          <div>
            <span>Required pace</span>
            <strong>
              {result.requiredPacePerDay !== null
                ? `${result.requiredPacePerDay.toFixed(1)}/day`
                : "—"}
            </strong>
            <small>
              {result.requiredPacePerDay !== null
                ? "mastered/day to finish in time"
                : "target date has passed"}
            </small>
          </div>
          <div>
            <span>7-day average</span>
            <strong>
              {result.sevenDayPace !== null ? `${result.sevenDayPace.toFixed(1)}/day` : "—"}
            </strong>
            <small>
              {result.sevenDayPace !== null ? "mastered/day, recently" : "more history needed"}
            </small>
          </div>
        </div>
      )}
      <p className={`pace-status pace-${result.status}`}>
        Status: {statusLabel[result.status]}
      </p>
      {result.status !== "complete" &&
        (result.estimatedCompletionDate ? (
          <p className="pacing-estimate">
            Estimated vocabulary completion: {formatTargetDate(result.estimatedCompletionDate)}
          </p>
        ) : (
          <p className="pacing-estimate">
            More study history is needed for a completion estimate.
          </p>
        ))}
    </section>
  );
}
