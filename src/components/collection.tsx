"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { typeLabels } from "@/lib/study/content";
import { commonalityLevels, conceptTypes } from "@/lib/study/types";
import { useConceptFilters } from "@/lib/study/use-concept-filters";
import { useStudy } from "./study-provider";
import { FuriganaText } from "./furigana";
import { Loading } from "./loading";

export function CollectionView() {
  const { state } = useStudy();
  const {
    activeMode,
    isKana,
    viewLevel,
    filter,
    setFilter,
    commonalityFilter,
    setCommonalityFilter,
    search,
    setSearch,
    visible,
  } = useConceptFilters();
  if (isKana) return <Loading />;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{viewLevel} STUDY MODE</div>
          <h1>{viewLevel === "tae-kim" ? "Tae Kim" : viewLevel} collection</h1>
          <p>
            {viewLevel === "N5"
              ? "Foundation vocabulary, kanji, grammar, reading, and listening."
              : viewLevel === "N4"
                ? "N4-only material, kept separate from your N5 foundation."
                : "Words and sentences mined from the Tae Kim/anime course."}
          </p>
        </div>
        <span className="level-badge">
          {visible.length} {viewLevel} concepts
        </span>
      </div>
      <p className="collection-links">
        <Link href="/quick-sort" className="text-link">
          Quick sort -- mark words you already know
        </Link>
        <Link href="/admin/browse" className="text-link">
          Admin browse -- flip through every card
        </Link>
      </p>
      <div className="collection-toolbar">
        <div className="filter-tabs" role="group" aria-label="Filter concepts">
          <button
            aria-pressed={filter === "all"}
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            All concepts
          </button>
          {conceptTypes
            .filter((type) => type !== "kana")
            .map((type) => (
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
        <div
          className="filter-tabs commonality-tabs"
          role="group"
          aria-label="Filter by commonality"
        >
          <button
            aria-pressed={commonalityFilter === "all"}
            className={commonalityFilter === "all" ? "selected" : ""}
            onClick={() => setCommonalityFilter("all")}
          >
            All levels
          </button>
          {commonalityLevels.map((level) => (
            <button
              key={level}
              aria-pressed={commonalityFilter === level}
              className={commonalityFilter === level ? "selected" : ""}
              onClick={() => setCommonalityFilter(level)}
            >
              {level === "essential"
                ? "Essential"
                : level === "common"
                  ? "Common"
                  : "Additional"}
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
        {visible.map((concept, index) => {
          const progress = state?.progress.find(
            (item) => item.conceptId === concept.id,
          );
          const group =
            concept.type === "vocabulary"
              ? (concept.commonality ?? "additional")
              : "other";
          const previous = visible[index - 1];
          const previousGroup =
            previous?.type === "vocabulary"
              ? (previous.commonality ?? "additional")
              : "other";
          return (
            <Fragment key={concept.id}>
              {group !== previousGroup && (
                <div className="collection-group-heading">
                  <strong>
                    {group === "essential"
                      ? "Foundation"
                      : group === "common"
                        ? "Standard sequence"
                        : group === "additional"
                          ? "Later sequence"
                          : "Other study material"}
                  </strong>
                  <span>
                    {group === "essential"
                      ? "High-value beginner vocabulary selected for the first part of the curriculum."
                      : group === "common"
                        ? "Vocabulary ordered after the foundation using curriculum priority and dictionary commonness as a supporting signal."
                        : group === "additional"
                          ? "Vocabulary retained for coverage and introduced after the higher-priority sequence."
                          : "Kanji, grammar, reading, and listening practice."}
                  </span>
                </div>
              )}
              <details className="collection-item" key={concept.id}>
                <summary>
                  <span className="collection-expression" lang="ja">
                    <FuriganaText
                      fallback={concept.expression}
                      segments={concept.vocabulary?.expressionFurigana}
                    />
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
                      {concept.kanjiForm
                        ? `Kanji form: ${concept.kanjiForm} · `
                        : ""}
                      Part of speech: {concept.partOfSpeech}
                    </p>
                  )}
                  <p lang="ja">
                    <FuriganaText
                      fallback={concept.example}
                      segments={concept.vocabulary?.exampleFurigana}
                    />
                  </p>
                  <p className="muted">{concept.exampleMeaning}</p>
                  <p className="concept-note">{concept.note}</p>
                  {concept.media && (
                    <div className="concept-media">
                      {concept.media.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={concept.media.image}
                          alt=""
                          className="concept-media-image"
                        />
                      )}
                      {concept.media.audio && (
                        <audio controls src={concept.media.audio} />
                      )}
                      {concept.media.sourceShow && (
                        <p className="field-help">
                          From: {concept.media.sourceShow}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="field-help">
                    {concept.curriculumUnit} · Source: {concept.source}
                  </p>
                  {concept.classificationNote && (
                    <p className="field-help">
                      Level note: {concept.classificationNote}
                    </p>
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
            </Fragment>
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
                setCommonalityFilter("all");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <p className="progress-note">
        {viewLevel === activeMode
          ? "Switch study modes from the sidebar or Settings to view the other level."
          : `Showing your ${viewLevel} collection -- your active study mode is still ${activeMode}.`}
      </p>
    </>
  );
}
