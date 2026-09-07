"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { kanaConceptId, kanaEntries, type KanaEntry } from "@/lib/study/kana";
import { characterStatusFor } from "@/lib/study/kana-progress";
import type { KanaScript } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { KanaGridSections } from "./kana-grid-sections";

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

function speak(character: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(character);
    utterance.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    /* optional */
  }
}

export function KanaChart({ script }: { script: KanaScript }) {
  const { state, dispatch, busy } = useStudy();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!state) return null;
  const progressById = new Map(state.progress.map((item) => [item.conceptId, item]));

  function cell(entry: KanaEntry | undefined, key: string) {
    if (!entry) return <span key={key} className="kana-cell kana-cell-empty" aria-hidden="true" />;
    const status = characterStatusFor(entry, progressById);
    return (
      <button
        key={key}
        type="button"
        className={`kana-cell ${stageClass[status]} ${selectedId === entry.id ? "kana-cell-selected" : ""}`}
        onClick={() => setSelectedId(entry.id)}
        title={`${entry.character} — ${entry.romaji}`}
        lang="ja"
      >
        {entry.character}
      </button>
    );
  }

  const selectedEntry = selectedId
    ? kanaEntries[script].find((entry) => entry.id === selectedId)
    : undefined;

  async function markKnown() {
    if (!selectedEntry) return;
    const ids = [
      kanaConceptId(selectedEntry.id, "recognition"),
      kanaConceptId(selectedEntry.id, "recall"),
    ];
    const next = await dispatch({ type: "markKanaKnown", conceptIds: ids });
    if (next) setMessage(`${selectedEntry.character} marked as known.`);
  }

  return (
    <div className="kana-chart-layout">
      <div className="kana-chart-scroll">
        <KanaGridSections script={script} renderCell={cell} />
      </div>
      <aside className="panel kana-detail-panel">
        {selectedEntry ? (
          <>
            <span className="kana-detail-character" lang="ja">
              {selectedEntry.character}
            </span>
            <p className="kana-detail-romaji">{selectedEntry.romaji}</p>
            <button type="button" className="text-link" onClick={() => speak(selectedEntry.character)}>
              <Volume2 size={14} /> Hear it
            </button>
            <p className="field-help">
              Category: {selectedEntry.category}
              {selectedEntry.relatedKana && ` · Derived from ${selectedEntry.relatedKana}`}
            </p>
            {!!selectedEntry.confusionSet.length && (
              <p className="field-help">Often confused with: {selectedEntry.confusionSet.join("、")}</p>
            )}
            {selectedEntry.note && <p className="concept-note">{selectedEntry.note}</p>}
            <p className="field-help">
              Status: {stageLabel[characterStatusFor(selectedEntry, progressById)]}
            </p>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => void markKnown()}>
              Mark known
            </button>
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}
          </>
        ) : (
          <p className="muted">Click any character to see its reading and study details.</p>
        )}
        <ul className="knowledge-legend">
          {stages.map((stage) => (
            <li key={stage}>
              <span className={`legend-dot ${stageClass[stage]}`} />
              {stageLabel[stage]}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
