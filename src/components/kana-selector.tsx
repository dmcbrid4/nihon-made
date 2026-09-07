"use client";

import { Check } from "lucide-react";
import { kanaEntries, type KanaEntry } from "@/lib/study/kana";
import { characterStatusFor, type KanaBucket } from "@/lib/study/kana-progress";
import type { ConceptProgress, KanaScript } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { KanaGridSections } from "./kana-grid-sections";

const stageClass: Record<string, string> = {
  mastered: "stage-mastered",
  learning: "stage-learning",
  introduced: "stage-introduced",
  unseen: "stage-unseen",
};

const bucketFor: Record<KanaEntry["category"], KanaBucket> = {
  basic: "basic",
  dakuten: "voiced",
  handakuten: "voiced",
  yoon: "combinations",
  small: "combinations",
  extended: "extended",
};
const bucketLabel: Record<KanaBucket, string> = {
  basic: "Basic",
  voiced: "Voiced",
  combinations: "Combinations",
  extended: "Extended",
};

/** The chart-based selection UI shared by the Study and Quiz tabs: click any
 * character to toggle it, plus quick-select shortcuts (by category, by
 * mastery status, all/none). Controlled component -- the caller owns the
 * selection set, so Study and Quiz keep independent selections. */
export function KanaSelector({
  script,
  selected,
  onChange,
}: {
  script: KanaScript;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { state } = useStudy();
  const progressById = new Map<string, ConceptProgress>(
    (state?.progress ?? []).map((item) => [item.conceptId, item]),
  );
  const entries = kanaEntries[script];
  const buckets = Array.from(new Set(entries.map((e) => bucketFor[e.category])));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  function selectIds(ids: string[]) {
    onChange(new Set(ids));
  }
  function selectByStatus(want: "mastered" | "unmastered") {
    const ids = entries
      .filter((entry) => {
        const status = characterStatusFor(entry, progressById);
        return want === "mastered" ? status === "mastered" : status !== "mastered";
      })
      .map((entry) => entry.id);
    selectIds(ids);
  }

  function cell(entry: KanaEntry | undefined, key: string) {
    if (!entry) return <span key={key} className="kana-cell kana-cell-empty" aria-hidden="true" />;
    const status = characterStatusFor(entry, progressById);
    const checked = selected.has(entry.id);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={checked}
        className={`kana-cell ${stageClass[status]} ${checked ? "kana-cell-checked" : ""}`}
        onClick={() => toggle(entry.id)}
        title={`${entry.character} — ${entry.romaji}`}
        lang="ja"
      >
        {checked && <Check className="kana-cell-check" size={13} strokeWidth={3} />}
        {entry.character}
      </button>
    );
  }

  return (
    <div className="kana-selector">
      <div className="kana-selector-toolbar">
        <div className="kana-selector-count">
          <strong>{selected.size}</strong> selected
        </div>
        <div className="kana-selector-actions">
          <button type="button" className="text-link" onClick={() => selectIds(entries.map((e) => e.id))}>
            Select all
          </button>
          <button type="button" className="text-link" onClick={() => selectIds([])}>
            Clear
          </button>
          <button type="button" className="text-link" onClick={() => selectByStatus("unmastered")}>
            Select unmastered
          </button>
          <button type="button" className="text-link" onClick={() => selectByStatus("mastered")}>
            Select mastered
          </button>
        </div>
      </div>
      <div className="kana-selector-buckets">
        {buckets.map((bucket) => (
          <button
            key={bucket}
            type="button"
            className="secondary-button"
            onClick={() =>
              selectIds(entries.filter((e) => bucketFor[e.category] === bucket).map((e) => e.id))
            }
          >
            Select {bucketLabel[bucket]}
          </button>
        ))}
      </div>
      <div className="kana-chart-scroll">
        <KanaGridSections script={script} renderCell={cell} />
      </div>
    </div>
  );
}
