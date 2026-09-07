"use client";

import { Fragment, type ReactNode } from "react";
import { kanaEntries, type KanaEntry } from "@/lib/study/kana";
import type { KanaScript } from "@/lib/study/types";

// Shared gojūon grid shape, used by both the read-only reference chart
// (kana-chart.tsx) and the Study/Quiz selector (kana-selector.tsx) so the
// row/column/gap layout is defined exactly once.
const VOWELS = ["a", "i", "u", "e", "o"] as const;
const BASIC_ROWS = ["a", "k", "s", "t", "n", "h", "m", "y", "r", "w"] as const;
const VOICED_ROWS = ["g", "z", "d", "b", "p"] as const;
const YOON_ROWS = ["k", "g", "s", "z", "t", "n", "h", "b", "p", "m", "r"] as const;
const YOON_COLS = ["ya", "yu", "yo"] as const;

export function KanaGridSections({
  script,
  renderCell,
}: {
  script: KanaScript;
  renderCell: (entry: KanaEntry | undefined, key: string) => ReactNode;
}) {
  const entries = kanaEntries[script];
  const byKey = new Map(entries.map((entry) => [`${entry.row}-${entry.column}`, entry]));
  const n = entries.find((entry) => entry.column === "n");
  const chouon = entries.find(
    (entry) => entry.category === "extended" && entry.column === "chouon",
  );
  const extended = entries.filter(
    (entry) => entry.category === "extended" && entry !== chouon,
  );
  const small = entries.filter((entry) => entry.category === "small");

  return (
    <>
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
              {VOWELS.map((col) => renderCell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
            </Fragment>
          ))}
          <span className="kana-grid-header">n</span>
          {renderCell(n, "n-n")}
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
              {VOWELS.map((col) => renderCell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
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
              {YOON_COLS.map((col) => renderCell(byKey.get(`${row}-${col}`), `${row}-${col}`))}
            </Fragment>
          ))}
        </div>
      </section>
      {(!!small.length || !!extended.length || chouon) && (
        <section className="panel kana-chart-section">
          <h2>
            {script === "hiragana" ? "Small っ" : "Small ッ, long vowel, and extended sounds"}
          </h2>
          <div className="kana-flex-grid">
            {small.map((entry) => renderCell(entry, entry.id))}
            {chouon && renderCell(chouon, chouon.id)}
            {extended.map((entry) => renderCell(entry, entry.id))}
          </div>
        </section>
      )}
    </>
  );
}
