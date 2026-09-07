"use client";

import { useState } from "react";
import { masteryHistory } from "@/lib/study/progress-metrics";
import { useStudy } from "./study-provider";

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(1, ...points);
  const width = 100;
  const height = 32;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((value, index) => [index * stepX, height - (value / max) * height]);
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="history-chart-svg"
      role="presentation"
    >
      <path d={area} className="history-chart-area" />
      <path d={line} className="history-chart-line" />
    </svg>
  );
}

const metrics = ["vocabulary", "kanji"] as const;
const metricLabel: Record<(typeof metrics)[number], string> = {
  vocabulary: "Vocabulary",
  kanji: "Kanji",
};

export function ProgressHistoryChart() {
  const { state, now } = useStudy();
  const [metric, setMetric] = useState<(typeof metrics)[number]>("vocabulary");
  if (!state) return null;
  const history = masteryHistory(state, now);
  const points = history.map((point) => point[metric]);
  const latest = points[points.length - 1] ?? 0;

  return (
    <section className="panel history-chart" aria-label="Mastered items over time">
      <div className="section-heading">
        <div>
          <h2>Mastered {metricLabel[metric].toLowerCase()} over time</h2>
          <p>Reconstructed from your actual review history, not fabricated.</p>
        </div>
        <div className="history-chart-toggle" role="group" aria-label="Chart metric">
          {metrics.map((option) => (
            <button
              key={option}
              type="button"
              className={metric === option ? "selected" : ""}
              onClick={() => setMetric(option)}
            >
              {metricLabel[option]}
            </button>
          ))}
        </div>
      </div>
      {history.length < 2 ? (
        <p className="history-empty-note">
          More study history is needed to chart a trend. Keep reviewing — this
          fills in as you go, starting from your first recorded review.
        </p>
      ) : (
        <>
          <Sparkline points={points} />
          <div className="history-chart-labels">
            <span>{history[0].date}</span>
            <span>{history[history.length - 1].date}</span>
          </div>
          <p className="history-chart-value">
            <strong>{latest}</strong> {metricLabel[metric].toLowerCase()} items
            mastered as of today
          </p>
        </>
      )}
    </section>
  );
}
