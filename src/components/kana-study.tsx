"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Volume2 } from "lucide-react";
import { conceptById } from "@/lib/study/content";
import { buildKanaQueue, currentKanaSession, distractorsFor } from "@/lib/study/kana-session";
import { kanaEntryById, parseKanaConceptId, type KanaEntry } from "@/lib/study/kana";
import type { Concept, ConceptProgress, KanaScript, Rating } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { KanaChart } from "./kana-chart";

const scriptTitle: Record<KanaScript, string> = { hiragana: "Hiragana", katakana: "Katakana" };

function speak(character: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(character);
    utterance.lang = "ja-JP";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    /* Speech synthesis is optional; Kana mode works fully without it. */
  }
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function KanaCard({
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
  const details = concept.kanaDetails!;
  const parsed = parseKanaConceptId(concept.id);
  const entry = parsed ? kanaEntryById.get(parsed.entryId) : undefined;
  const [introduced, setIntroduced] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const timeout = useRef<number | null>(null);
  const options = useMemo<KanaEntry[]>(() => {
    if (!entry) return [];
    const distractors = distractorsFor(entry.id, details.script, 3);
    return shuffled([entry, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.id]);

  useEffect(
    () => () => {
      if (timeout.current) window.clearTimeout(timeout.current);
    },
    [],
  );

  if (!entry) return null;
  const isNew = !progress;
  const showIntro = isNew && details.direction === "recognition" && !introduced;

  function choose(choiceId: string) {
    if (result || busy) return;
    if (choiceId === entry!.id) {
      setResult("correct");
      const rating: Rating = attempt === 0 ? "good" : "hard";
      timeout.current = window.setTimeout(() => onRate(rating), 650);
    } else {
      const next = new Set(wrong);
      next.add(choiceId);
      setWrong(next);
      if (attempt + 1 >= 2) {
        setResult("incorrect");
        timeout.current = window.setTimeout(() => onRate("again"), 1100);
      } else {
        setAttempt(attempt + 1);
      }
    }
  }

  if (showIntro) {
    return (
      <article className="review-card panel kana-card kana-intro-card">
        <div className="kana-badge-row">
          <span className="concept-badge">New {details.script === "hiragana" ? "hiragana" : "katakana"}</span>
        </div>
        <div className="kana-prompt">
          <p className="eyebrow">A NEW CHARACTER</p>
          <h1 lang="ja" className="kana-character">
            {entry.character}
          </h1>
          <p className="kana-romaji-large">{entry.romaji}</p>
          {entry.note && <p className="concept-note">{entry.note}</p>}
        </div>
        <div className="kana-intro-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => speak(entry.character)}
          >
            <Volume2 size={16} />
            Hear it
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setIntroduced(true)}
          >
            Got it -- let&rsquo;s practice
            <ArrowRight size={17} />
          </button>
        </div>
      </article>
    );
  }

  const recognition = details.direction === "recognition";
  return (
    <article className={`review-card panel kana-card ${result ? `kana-result-${result}` : ""}`}>
      <div className="review-card-top">
        <span className="concept-badge">{scriptTitle[details.script]}</span>
        <span className="level-tag">
          {recognition ? "Recognition" : "Recall"}
          <span>·</span>
          {details.category === "basic" ? "basic" : details.category}
        </span>
      </div>
      <div className="kana-prompt">
        <p className="eyebrow">{recognition ? "WHAT SOUND IS THIS?" : "WHICH KANA IS THIS?"}</p>
        <h1 lang={recognition ? "ja" : undefined} className="kana-character">
          {recognition ? entry.character : entry.romaji}
        </h1>
        <button
          type="button"
          className="text-link kana-hear-link"
          onClick={() => speak(entry.character)}
        >
          <Volume2 size={14} /> Hear it
        </button>
      </div>
      <div className="kana-options" role="group" aria-label="Choose your answer">
        {options.map((option) => {
          const isCorrect = option.id === entry.id;
          const isWrong = wrong.has(option.id);
          const revealCorrect = !!result && isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!!result || busy}
              onClick={() => choose(option.id)}
              lang={recognition ? undefined : "ja"}
              className={`kana-option ${isWrong ? "kana-option-wrong" : ""} ${revealCorrect ? "kana-option-correct" : ""}`}
            >
              {recognition ? option.romaji : option.character}
            </button>
          );
        })}
      </div>
      {result === "correct" && (
        <p className="kana-feedback kana-feedback-correct" role="status">
          <Check size={14} /> {attempt === 0 ? "Right the first time." : "Got there."}
        </p>
      )}
      {result === "incorrect" && (
        <p className="kana-feedback kana-feedback-incorrect" role="status">
          {entry.character} is {entry.romaji}. On to the next one.
        </p>
      )}
    </article>
  );
}

function KanaSession({ script }: { script: KanaScript }) {
  const { state, now, dispatch, busy } = useStudy();
  if (!state) return <Loading />;
  const session = currentKanaSession(state, now, script);
  if (!session) {
    const items = buildKanaQueue(state, now, script);
    return (
      <div className="empty-state panel">
        <span className="eyebrow">{scriptTitle[script].toUpperCase()} PRACTICE</span>
        <h1>{items.length ? "Your kana session is ready." : "You're all caught up."}</h1>
        <p>
          {items.length
            ? `${items.length} cards this round.`
            : "New rows unlock as you get comfortable with what's due. Check back soon, or explore the chart."}
        </p>
        {!!items.length && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => void dispatch({ type: "startKana", id: crypto.randomUUID(), script })}
          >
            Start practicing
            <ArrowRight size={17} />
          </button>
        )}
        <Link href="/kana" className="text-link">
          Back to Kana
        </Link>
      </div>
    );
  }
  const reviews = state.reviews.filter((review) => review.sessionId === session.id);
  const reviewed = new Set(reviews.map((review) => review.conceptId));
  const activeConceptIds = session.conceptIds.filter((id) => conceptById.has(id));
  const conceptId = activeConceptIds.find((id) => !reviewed.has(id));
  const concept = conceptId ? conceptById.get(conceptId) : undefined;

  if (session.completedAt) {
    const correct = reviews.filter((review) => review.rating === "good" || review.rating === "hard").length;
    return (
      <div className="completion panel">
        <span className="completion-icon">
          <Check size={27} strokeWidth={1.6} />
        </span>
        <span className="eyebrow">{scriptTitle[script].toUpperCase()} PRACTICE, COMPLETE</span>
        <h1>A little more legible.</h1>
        <div className="completion-stats">
          <div>
            <strong>{reviews.length}</strong>
            <span>cards reviewed</span>
          </div>
          <div>
            <strong>{correct}</strong>
            <span>answered correctly</span>
          </div>
        </div>
        <div className="completion-reviews">
          {reviews.map((review) => (
            <div key={review.id}>
              <span lang="ja">{conceptById.get(review.conceptId)?.expression}</span>
              <span className={`review-rating rating-text-${review.rating}`}>
                {review.rating === "again" ? "missed" : "got it"}
              </span>
            </div>
          ))}
        </div>
        <p className="completion-note">Your progress is saved and shapes your next session.</p>
        <Link href="/kana" className="primary-button">
          Back to Kana
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }
  if (!concept) return null;
  function rate(rating: Rating) {
    if (!concept) return;
    void dispatch({
      type: "review",
      id: crypto.randomUUID(),
      sessionId: session!.id,
      conceptId: concept.id,
      rating,
    });
  }
  const remaining = activeConceptIds.length - reviewed.size;
  return (
    <div className="study-container">
      <div className="study-navigation">
        <Link href="/kana" className="text-link">
          <ArrowLeft size={16} />
          Save & leave
        </Link>
        <span>
          <Clock3 size={14} />
          {remaining} card{remaining === 1 ? "" : "s"} left
        </span>
      </div>
      <div className="study-progress-label">
        <span>{scriptTitle[script]} practice</span>
        <span>
          {reviews.length + 1} <span className="muted">of {activeConceptIds.length}</span>
        </span>
      </div>
      <div
        className="study-progress-track"
        role="progressbar"
        aria-label="Session progress"
        aria-valuenow={reviews.length}
        aria-valuemin={0}
        aria-valuemax={activeConceptIds.length}
      >
        <span style={{ width: `${(reviews.length / activeConceptIds.length) * 100}%` }} />
      </div>
      <KanaCard
        key={concept.id}
        concept={concept}
        progress={state.progress.find((item) => item.conceptId === concept.id)}
        busy={busy}
        onRate={rate}
      />
    </div>
  );
}

export function KanaStudyPage({ script }: { script: KanaScript }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"study" | "chart">(
    searchParams.get("tab") === "chart" ? "chart" : "study",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KANA FOUNDATIONS</div>
          <h1 lang="ja">{scriptTitle[script]}</h1>
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Kana view">
        <button
          aria-pressed={tab === "study"}
          className={tab === "study" ? "selected" : ""}
          onClick={() => setTab("study")}
        >
          Study
        </button>
        <button
          aria-pressed={tab === "chart"}
          className={tab === "chart" ? "selected" : ""}
          onClick={() => setTab("chart")}
        >
          Chart
        </button>
      </div>
      {tab === "study" ? <KanaSession script={script} /> : <KanaChart script={script} />}
    </>
  );
}
