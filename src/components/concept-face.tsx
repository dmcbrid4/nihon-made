import { typeLabels } from "@/lib/study/content";
import type { Concept } from "@/lib/study/types";
import { FuriganaText } from "./furigana";

/** The "read the whole card at once" presentation shared by Quick Sort and
 * Admin Browse -- both want immediate (non-reveal-gated) display of a
 * concept, unlike ReviewCard's active-recall flip. Mirrors ReviewCard's
 * markup/class names for visual consistency, minus the reveal gate and
 * rating controls. */
export function ConceptFace({ concept }: { concept: Concept }) {
  return (
    <article className="review-card panel">
      <div className="review-card-top">
        <span className="concept-badge">{typeLabels[concept.type]}</span>
        <span className="level-tag">
          {concept.level}
          <span>·</span>
          {concept.topic}
        </span>
      </div>
      <div className="review-question">
        <p className="eyebrow">WHAT DOES THIS MEAN?</p>
        <h1 lang="ja">
          <FuriganaText
            fallback={concept.expression}
            segments={
              concept.expressionFurigana ?? concept.vocabulary?.expressionFurigana
            }
          />
        </h1>
        {concept.romaji && <p className="romaji-line">{concept.romaji}</p>}
      </div>
      <div className="review-answer">
        <div className="answer-main">
          <p className="answer-reading" lang="ja">
            {concept.reading}
          </p>
          <h2>{concept.meaning}</h2>
        </div>
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
        <p className="concept-note">{concept.note}</p>
      </div>
    </article>
  );
}
