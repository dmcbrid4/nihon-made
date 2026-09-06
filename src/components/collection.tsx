"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { concepts, typeLabels } from "@/lib/study/content";
import { conceptTypes, type ConceptType } from "@/lib/study/types";
import { useStudy } from "./study-provider";

export function CollectionView() {
  const { state } = useStudy();
  const [filter, setFilter] = useState<ConceptType | "all">("all");
  const [search, setSearch] = useState("");
  const visible = concepts.filter(
    (item) =>
      (filter === "all" || item.type === filter) &&
      [item.expression, item.reading, item.meaning, item.topic]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORDS THAT TAKE YOU PLACES</div>
          <h1>Your growing collection.</h1>
          <p>A sequenced N5 and N4 study corpus, rooted in everyday Japanese.</p>
        </div>
        <span className="level-badge">{concepts.length} curriculum concepts</span>
      </div>
      <div className="collection-toolbar">
        <div className="filter-tabs" role="group" aria-label="Filter concepts">
          <button
            aria-pressed={filter === "all"}
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            All concepts
          </button>
          {conceptTypes.map((type) => (
            <button
              key={type}
              aria-pressed={filter === type}
              className={filter === type ? "selected" : ""}
              onClick={() => setFilter(type)}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search concepts"
            placeholder="Find a word or meaning…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="collection-list panel">
        {visible.map((concept) => {
          const progress = state?.progress.find(
            (item) => item.conceptId === concept.id,
          );
          return (
            <details className="collection-item" key={concept.id}>
              <summary>
                <span className="collection-expression" lang="ja">
                  {concept.expression}
                </span>
                <span className="collection-meaning">
                  {concept.meaning}
                  <span>
                    {typeLabels[concept.type]} · {concept.level} ·{" "}
                    {concept.topic} · difficulty {concept.difficulty}/5
                  </span>
                </span>
                <span
                  className={`concept-status status-${progress?.status ?? "unseen"}`}
                >
                  {progress?.status ?? "unseen"}
                </span>
                <ChevronDown size={16} />
              </summary>
              <div className="collection-detail">
                <p className="answer-reading" lang="ja">
                  {concept.reading}
                </p>
                {concept.type === "vocabulary" && concept.partOfSpeech && (
                  <p className="field-help">
                    {concept.kanjiForm ? `Kanji form: ${concept.kanjiForm} · ` : ""}
                    Part of speech: {concept.partOfSpeech}
                  </p>
                )}
                <p lang="ja">{concept.example}</p>
                <p className="muted">{concept.exampleMeaning}</p>
                <p className="concept-note">{concept.note}</p>
                <p className="field-help">
                  {concept.curriculumUnit} · Source: {concept.source}
                </p>
                {concept.classificationNote && (
                  <p className="field-help">Level note: {concept.classificationNote}</p>
                )}
                {progress && (
                  <p className="field-help">
                    Reviewed {progress.reviewCount}{" "}
                    {progress.reviewCount === 1 ? "time" : "times"}. Next due{" "}
                    {new Date(progress.dueAt).toLocaleDateString("en-US", {
                      timeZone: state?.goal.timeZone,
                      month: "short",
                      day: "numeric",
                    })}
                    .
                  </p>
                )}
              </div>
            </details>
          );
        })}
        {!visible.length && (
          <div className="empty-search">
            <Search size={24} />
            <h2>No concepts found.</h2>
            <p>Try a Japanese word, reading, or English meaning.</p>
            <button
              className="text-link"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <p className="progress-note">
        A source-backed N5 → N4 vocabulary curriculum alongside grammar, kanji,
        reading, and listening practice. JLPT labels are approximate learning levels.
      </p>
    </>
  );
}
