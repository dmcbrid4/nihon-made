"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Eye } from "lucide-react";
import { typeLabels } from "@/lib/study/content";
import { intervalFor } from "@/lib/study/scheduler";
import {
  ratings,
  type Concept,
  type ConceptProgress,
  type Rating,
} from "@/lib/study/types";
import { FuriganaText } from "./furigana";

export function ReviewCard({
  concept,
  progress,
  busy,
  onRate,
}: {
  concept: Concept;
  progress?: ConceptProgress;
  busy: boolean;
  onRate: (rating: Rating) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const passage = concept.type === "reading" || concept.type === "listening";
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        busy
      )
        return;
      if (
        (event.target as HTMLElement).closest(
          "button, a, input, textarea, select, summary",
        )
      )
        return;
      if (event.code === "Space" && !revealed) {
        event.preventDefault();
        setRevealed(true);
      }
      const rating = ratings[Number(event.key) - 1];
      if (revealed && rating) {
        event.preventDefault();
        onRate(rating);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [revealed, busy, onRate]);

  return (
    <>
      <article className={`review-card panel ${passage ? "reading-card" : ""}`}>
        <div className="review-card-top">
          <span className="concept-badge">{typeLabels[concept.type]}</span>
          <span className="level-tag">
            {concept.level}
            <span>·</span>
            {concept.topic}
          </span>
        </div>
        <div className="review-question">
          <p className="eyebrow">
            {passage
              ? concept.type === "listening"
                ? "LISTENING SCRIPT"
                : "READ AT YOUR OWN PACE"
              : concept.type === "grammar"
                ? "HOW WOULD YOU USE THIS?"
                : "WHAT DOES THIS MEAN?"}
          </p>
          <h1
            lang="ja"
            className={concept.type === "kanji" ? "kanji-expression" : ""}
          >
            <FuriganaText
              fallback={concept.expression}
              segments={concept.vocabulary?.expressionFurigana}
            />
          </h1>
          {passage && (
            <>
              <p className="reading-passage" lang="ja">
                {concept.example}
              </p>
              <p className="comprehension-question">{concept.question}</p>
            </>
          )}
        </div>
        {revealed ? (
          <div className="review-answer" aria-live="polite">
            <div className="answer-main">
              {!passage && (
                <p className="answer-reading" lang="ja">
                  {concept.reading}
                </p>
              )}
              <h2>{passage ? concept.answer : concept.meaning}</h2>
            </div>
            {passage ? (
              <details className="translation">
                <summary>Show passage translation</summary>
                <p>{concept.exampleMeaning}</p>
              </details>
            ) : (
              <div className="example">
                <span className="eyebrow">IN CONTEXT</span>
                <p lang="ja">
                  <FuriganaText
                    fallback={concept.example}
                    segments={concept.vocabulary?.exampleFurigana}
                  />
                </p>
                <p className="example-translation">{concept.exampleMeaning}</p>
              </div>
            )}
            <p className="concept-note">{concept.note}</p>
          </div>
        ) : (
          <div className="reveal-area">
            <p>
              {passage
                ? "Think of your answer, then check your understanding."
                : "Take a moment to recall it. There’s no timer."}
            </p>
            <button
              className="primary-button reveal-button"
              onClick={() => setRevealed(true)}
            >
              <Eye size={17} />
              {passage ? "Check understanding" : "Reveal answer"}
              <span className="keyboard-hint">space</span>
            </button>
          </div>
        )}
      </article>
      {revealed && (
        <div className="rating-area">
          <p>How did that feel?</p>
          <div className="rating-grid">
            {ratings.map((rating, index) => {
              const days = intervalFor(rating, progress);
              return (
                <button
                  key={rating}
                  disabled={busy}
                  className={`rating-button rating-${rating}`}
                  onClick={() => onRate(rating)}
                >
                  <span className="rating-key">{index + 1}</span>
                  <strong>{rating[0].toUpperCase() + rating.slice(1)}</strong>
                  <span className="rating-interval">
                    {rating === "again"
                      ? "Next session"
                      : `${days} ${days === 1 ? "day" : "days"}`}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="rating-note">
            {busy
              ? "Saving your review…"
              : "Your rating shapes what you’ll review next."}
            <ArrowRight size={13} />
          </p>
        </div>
      )}
    </>
  );
}
