"use client";

import Link from "next/link";
import { concepts } from "@/lib/study/content";
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

export function ProgressKanjiGrid() {
  const { state } = useStudy();
  if (!state) return null;
  const progressById = new Map(state.progress.map((item) => [item.conceptId, item]));
  const kanji = concepts
    .filter((item) => item.type === "kanji" && (item.level === "N5" || item.level === "N4"))
    .sort((a, b) => (a.level === b.level ? a.sequence - b.sequence : a.level === "N5" ? -1 : 1));

  return (
    <section className="panel kanji-grid-section" aria-label="Kanji knowledge map">
      <div className="section-heading">
        <div>
          <h2>Kanji knowledge map</h2>
          <p>All {kanji.length} N5 and N4 kanji. Click a character to find it in your collection.</p>
        </div>
      </div>
      <div className="kanji-grid">
        {kanji.map((item) => {
          const status = progressById.get(item.id)?.status ?? "unseen";
          return (
            <Link
              key={item.id}
              href={`/collection?type=kanji&q=${encodeURIComponent(item.expression)}`}
              className={`kanji-cell ${stageClass[status]}`}
              title={`${item.expression} — ${item.meaning} (${item.level}, ${status})`}
              lang="ja"
            >
              {item.expression}
            </Link>
          );
        })}
      </div>
      <ul className="knowledge-legend">
        {stages.map((stage) => (
          <li key={stage}>
            <span className={`legend-dot ${stageClass[stage]}`} />
            {stageLabel[stage]}
          </li>
        ))}
      </ul>
    </section>
  );
}
