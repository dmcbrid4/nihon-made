"use client";

import { Fragment, useState } from "react";
import { Volume2 } from "lucide-react";
import { kanaEntries, kanaConceptId, type KanaEntry } from "@/lib/study/kana";
import { characterStatusFor } from "@/lib/study/kana-progress";
import type { KanaScript } from "@/lib/study/types";
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

const VOWELS = ["a", "i", "u", "e", "o"] as const;
const BASIC_ROWS = ["a", "k", "s", "t", "n", "h", "m", "y", "r", "w"] as const;
const VOICED_ROWS = ["g", "z", "d", "b", "p"] as const;
const YOON_ROWS = ["k", "g", "s", "z", "t", "n", "h", "b", "p", "m", "r"] as const;
const YOON_COLS = ["ya", "yu", "yo"] as const;

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
  const entries = kanaEntries[script];
  const byKey = new Map(entries.map((entry) => [`${entry.row}-${entry.column}`, entry]));
  const n = entries.find((entry) => entry.column === "n");
  const chouon = entries.find((entry) => entry.category === "extended" && entry.column === "chouon");
  const extended = entries.filter((entry) => entry.category === "extended" && entry !== chouon);
  const small = entries.filter((entry) => entry.category === "small");
  const selected = selectedId ? entries.find((entry) => entry.id === selectedId) : undefined;

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

  async function markKnown() {
    if (!selected) return;
    const ids = [
      kanaConceptId(selected.id, "recognition"),
      kanaConceptId(selected.id, "recall"),
    ];
    const next = await dispatch({ type: "markKanaKnown", conceptIds: ids });
    if (next) setMessage(`${selected.character} marked as known.`);
  }

  return (
    <div className="kana-chart-layout">
      <div className="kana-chart-scroll">
        <section className="panel kana-chart-section">
          <h2>Basic kana</h2>
          <div
            className="kana-grid-table"
            style={{ gridTemplateColumns: `auto repeat(${VOWELS.length}, 1fr)` }}
          >
            <span />
            {VOWELS.map((v) => (
              <span key={v} className="kana-grid-header">
                {v}
              </span>
            ))}
            {BASIC_ROWS.map((row) => (
              <Fragment key={row}>
                <span className="kana-grid-header">{row}</span>
                {VOWELS.map((col) => cell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
              </Fragment>
            ))}
            <span className="kana-grid-header">n</span>
            {cell(n, "n-n")}
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
        <section className="panel kana-chart-section">
          <h2>Dakuten &amp; handakuten (voiced sounds)</h2>
          <div
            className="kana-grid-table"
            style={{ gridTemplateColumns: `auto repeat(${VOWELS.length}, 1fr)` }}
          >
            <span />
            {VOWELS.map((v) => (
              <span key={v} className="kana-grid-header">
                {v}
              </span>
            ))}
            {VOICED_ROWS.map((row) => (
              <Fragment key={row}>
                <span className="kana-grid-header">{row}</span>
                {VOWELS.map((col) => cell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
              </Fragment>
            ))}
          </div>
        </section>
        <section className="panel kana-chart-section">
          <h2>Yōon (contracted sounds)</h2>
          <div
            className="kana-grid-table"
            style={{ gridTemplateColumns: `auto repeat(${YOON_COLS.length}, 1fr)` }}
          >
            <span />
            {YOON_COLS.map((v) => (
              <span key={v} className="kana-grid-header">
                {v}
              </span>
            ))}
            {YOON_ROWS.map((row) => (
              <Fragment key={row}>
                <span className="kana-grid-header">{row}</span>
                {YOON_COLS.map((col) => cell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
              </Fragment>
            ))}
          </div>
        </section>
        {(!!small.length || !!extended.length || chouon) && (
          <section className="panel kana-chart-section">
            <h2>{script === "hiragana" ? "Small っ" : "Small ッ, long vowel, and extended sounds"}</h2>
            <div className="kana-flex-grid">
              {small.map((entry) => cell(entry, entry.id))}
              {chouon && cell(chouon, chouon.id)}
              {extended.map((entry) => cell(entry, entry.id))}
            </div>
          </section>
        )}
      </div>
      <aside className="panel kana-detail-panel">
        {selected ? (
          <>
            <span className="kana-detail-character" lang="ja">
              {selected.character}
            </span>
            <p className="kana-detail-romaji">{selected.romaji}</p>
            <button type="button" className="text-link" onClick={() => speak(selected.character)}>
              <Volume2 size={14} /> Hear it
            </button>
            <p className="field-help">
              Category: {selected.category}
              {selected.relatedKana && ` · Derived from ${selected.relatedKana}`}
            </p>
            {!!selected.confusionSet.length && (
              <p className="field-help">Often confused with: {selected.confusionSet.join("、")}</p>
            )}
            {selected.note && <p className="concept-note">{selected.note}</p>}
            <p className="field-help">
              Status: {stageLabel[characterStatusFor(selected, progressById)]}
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
