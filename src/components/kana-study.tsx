"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  RotateCcw,
  Volume2,
} from "lucide-react";
import {
  buildQuizQuestions,
  distractorsFor,
  type KanaQuestion,
  type QuizDirectionMode,
  type QuizLength,
} from "@/lib/study/kana-quiz";
import { kanaConceptId, kanaEntryById, type KanaEntry } from "@/lib/study/kana";
import type { KanaDirection, KanaScript } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { KanaChart } from "./kana-chart";
import { KanaSelector } from "./kana-selector";

const scriptTitle: Record<KanaScript, string> = {
  hiragana: "Hiragana",
  katakana: "Katakana",
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

let dingContext: AudioContext | null = null;

/** A short two-note chime for a correct quiz answer -- synthesized rather
 * than a bundled audio file, so there's no asset to ship or load. Reuses
 * one AudioContext across calls (creating a fresh one per note is what
 * triggers browser warnings/limits). */
function playCorrectChime() {
  try {
    dingContext ??= new AudioContext();
    const ctx = dingContext;
    const start = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    gain.connect(ctx.destination);
    for (const [freq, delay] of [
      [880, 0],
      [1318.5, 0.03],
    ] as const) {
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      oscillator.connect(gain);
      oscillator.start(start + delay);
      oscillator.stop(start + 0.35);
    }
  } catch {
    /* optional */
  }
}

/** A quick vibration on a correct quiz answer. Only Android (Chrome/Firefox)
 * implements the Vibration API -- iOS Safari doesn't expose it to web pages
 * at all, so this is a no-op there rather than a broken feature. */
function hapticSuccess() {
  try {
    navigator.vibrate?.(20);
  } catch {
    /* optional */
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

/** One multiple-choice quiz question, one attempt. Whatever the first
 * answer is settles it -- correct reports `true`, wrong reports `false`.
 * See kana-progress.ts's recordKanaQuizAnswer for why that matters (it's
 * exactly what keeps or resets the 5-streak). */
function KanaQuizQuestion({
  script,
  question,
  busy,
  onSettled,
}: {
  script: KanaScript;
  question: KanaQuestion;
  busy: boolean;
  onSettled: (correct: boolean) => void;
}) {
  const entry = kanaEntryById.get(question.entryId);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const timeout = useRef<number | null>(null);
  const options = useMemo<KanaEntry[]>(() => {
    if (!entry) return [];
    return shuffled([entry, ...distractorsFor(entry.id, script, 3)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.entryId, question.direction]);

  if (!entry) return null;
  const recognition = question.direction === "recognition";

  function choose(choiceId: string) {
    if (result || busy) return;
    if (choiceId === entry!.id) {
      setResult("correct");
      playCorrectChime();
      hapticSuccess();
      timeout.current = window.setTimeout(() => onSettled(true), 650);
    } else {
      setWrong(new Set([choiceId]));
      setResult("incorrect");
      timeout.current = window.setTimeout(() => onSettled(false), 1100);
    }
  }

  return (
    <article
      className={`review-card panel kana-card ${result ? `kana-result-${result}` : ""}`}
    >
      <div className="review-card-top">
        <span className="concept-badge">{scriptTitle[script]}</span>
        <span className="level-tag">
          {recognition ? "Recognition" : "Recall"}
          <span>·</span>
          {entry.category === "basic" ? "basic" : entry.category}
        </span>
      </div>
      <div className="kana-prompt">
        <p className="eyebrow">
          {recognition ? "WHAT SOUND IS THIS?" : "WHICH KANA IS THIS?"}
        </p>
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
      <div
        className="kana-options"
        role="group"
        aria-label="Choose your answer"
      >
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
          <Check size={14} /> Correct.
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

const LENGTH_OPTIONS: { value: QuizLength; label: string }[] = [
  { value: "short", label: "Short (~10)" },
  { value: "medium", label: "Medium (~20)" },
  { value: "all", label: "Everything selected" },
];
const DIRECTION_OPTIONS: { value: QuizDirectionMode; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "recognition", label: "Recognition only" },
  { value: "recall", label: "Recall only" },
];

function KanaQuizPractice({ script }: { script: KanaScript }) {
  const { dispatch, busy } = useStudy();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [directionMode, setDirectionMode] =
    useState<QuizDirectionMode>("mixed");
  const [length, setLength] = useState<QuizLength>("medium");
  const [phase, setPhase] = useState<"configure" | "quiz" | "results">(
    "configure",
  );
  const [questions, setQuestions] = useState<KanaQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    (KanaQuestion & { correct: boolean })[]
  >([]);

  function start(
    pool: Iterable<string>,
    mode: QuizDirectionMode,
    len: QuizLength,
  ) {
    const built = buildQuizQuestions(pool, mode, len);
    if (!built.length) return;
    setQuestions(built);
    setIndex(0);
    setAnswers([]);
    setPhase("quiz");
  }

  async function settle(correct: boolean) {
    const question = questions[index];
    await dispatch({
      type: "kanaQuizAnswer",
      conceptId: kanaConceptId(question.entryId, question.direction),
      correct,
    });
    setAnswers((prev) => [...prev, { ...question, correct }]);
    if (index + 1 >= questions.length) setPhase("results");
    else setIndex(index + 1);
  }

  if (phase === "configure")
    return (
      <div className="kana-quiz-configure">
        <KanaSelector
          script={script}
          selected={selected}
          onChange={setSelected}
        />
        <div className="panel kana-quiz-settings">
          <div>
            <span className="field-label">Direction</span>
            <div
              className="filter-tabs"
              role="group"
              aria-label="Quiz direction"
            >
              {DIRECTION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  aria-pressed={directionMode === option.value}
                  className={directionMode === option.value ? "selected" : ""}
                  onClick={() => setDirectionMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Length</span>
            <div className="filter-tabs" role="group" aria-label="Quiz length">
              {LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  aria-pressed={length === option.value}
                  className={length === option.value ? "selected" : ""}
                  onClick={() => setLength(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            className="primary-button"
            disabled={!selected.size}
            onClick={() => start(selected, directionMode, length)}
          >
            {selected.size
              ? `Start quiz (${selected.size} selected)`
              : "Select kana to quiz"}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );

  if (phase === "quiz") {
    const question = questions[index];
    return (
      <div className="study-container">
        <div className="study-navigation">
          <button className="text-link" onClick={() => setPhase("configure")}>
            <ArrowLeft size={16} />
            Change selection
          </button>
          <span>
            {index + 1} <span className="muted">of {questions.length}</span>
          </span>
        </div>
        <div
          className="study-progress-track"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={questions.length}
        >
          <span style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <KanaQuizQuestion
          key={`${question.entryId}-${question.direction}-${index}`}
          script={script}
          question={question}
          busy={busy}
          onSettled={(correct) => void settle(correct)}
        />
      </div>
    );
  }

  const score = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct);
  return (
    <div className="completion panel">
      <span className="completion-icon">
        <Check size={27} strokeWidth={1.6} />
      </span>
      <span className="eyebrow">QUIZ COMPLETE</span>
      <h1>
        {score} / {answers.length}
      </h1>
      <div className="completion-reviews">
        {answers.map((answer, i) => {
          const entry = kanaEntryById.get(answer.entryId)!;
          return (
            <div key={`${answer.entryId}-${answer.direction}-${i}`}>
              <span lang="ja">
                {entry.character} ({answer.direction})
              </span>
              <span
                className={`review-rating rating-text-${answer.correct ? "good" : "again"}`}
              >
                {answer.correct ? "correct" : "missed"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="completion-note">
        Correct answers build a streak toward mastery -- 5 in a row masters a
        kana.
      </p>
      <div className="kana-results-actions">
        {!!missed.length && (
          <button
            className="primary-button"
            onClick={() =>
              start(new Set(missed.map((m) => m.entryId)), directionMode, "all")
            }
          >
            <RotateCcw size={16} />
            Retry {missed.length} missed
          </button>
        )}
        <button
          className="secondary-button"
          onClick={() => setPhase("configure")}
        >
          New selection
        </button>
        <Link href="/kana" className="text-link">
          Back to Kana
        </Link>
      </div>
    </div>
  );
}

function KanaStudyBrowse({ script }: { script: KanaScript }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<KanaDirection>("recognition");
  const [phase, setPhase] = useState<"configure" | "browse" | "done">(
    "configure",
  );
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  function start() {
    if (!selected.size) return;
    setOrder(shuffled([...selected]));
    setIndex(0);
    setRevealed(false);
    setPhase("browse");
  }

  if (phase === "configure")
    return (
      <div className="kana-quiz-configure">
        <KanaSelector
          script={script}
          selected={selected}
          onChange={setSelected}
        />
        <div className="panel kana-quiz-settings">
          <div>
            <span className="field-label">Show first</span>
            <div
              className="filter-tabs"
              role="group"
              aria-label="Study direction"
            >
              <button
                aria-pressed={direction === "recognition"}
                className={direction === "recognition" ? "selected" : ""}
                onClick={() => setDirection("recognition")}
              >
                Kana → romaji
              </button>
              <button
                aria-pressed={direction === "recall"}
                className={direction === "recall" ? "selected" : ""}
                onClick={() => setDirection("recall")}
              >
                Romaji → kana
              </button>
            </div>
          </div>
          <button
            className="primary-button"
            disabled={!selected.size}
            onClick={start}
          >
            {selected.size
              ? `Study ${selected.size} selected`
              : "Select kana to study"}
            <ArrowRight size={17} />
          </button>
          <p className="field-help">
            Free browsing -- nothing here is scored or saved. Use Quiz to work
            toward mastery.
          </p>
        </div>
      </div>
    );

  if (phase === "done")
    return (
      <div className="completion panel">
        <span className="completion-icon">
          <Check size={27} strokeWidth={1.6} />
        </span>
        <span className="eyebrow">STUDY COMPLETE</span>
        <h1>{order.length} characters reviewed.</h1>
        <div className="kana-results-actions">
          <button className="primary-button" onClick={start}>
            <RotateCcw size={16} />
            Study again
          </button>
          <button
            className="secondary-button"
            onClick={() => setPhase("configure")}
          >
            New selection
          </button>
          <Link href="/kana" className="text-link">
            Back to Kana
          </Link>
        </div>
      </div>
    );

  const entry = kanaEntryById.get(order[index])!;
  const front = direction === "recognition" ? entry.character : entry.romaji;
  const back = direction === "recognition" ? entry.romaji : entry.character;
  function next() {
    if (index + 1 >= order.length) setPhase("done");
    else {
      setIndex(index + 1);
      setRevealed(false);
    }
  }
  return (
    <div className="study-container">
      <div className="study-navigation">
        <button className="text-link" onClick={() => setPhase("configure")}>
          <ArrowLeft size={16} />
          Change selection
        </button>
        <span>
          {index + 1} <span className="muted">of {order.length}</span>
        </span>
      </div>
      <article className="review-card panel kana-card">
        <div className="kana-prompt">
          <p className="eyebrow">
            {direction === "recognition"
              ? "WHAT SOUND IS THIS?"
              : "WHICH KANA IS THIS?"}
          </p>
          <h1
            lang={direction === "recognition" ? "ja" : undefined}
            className="kana-character"
          >
            {front}
          </h1>
          <button
            type="button"
            className="text-link kana-hear-link"
            onClick={() => speak(entry.character)}
          >
            <Volume2 size={14} /> Hear it
          </button>
        </div>
        {revealed ? (
          <div className="review-answer" aria-live="polite">
            <div className="answer-main">
              <h2 lang={direction === "recognition" ? undefined : "ja"}>
                {back}
              </h2>
            </div>
          </div>
        ) : (
          <div className="reveal-area">
            <button
              type="button"
              className="primary-button reveal-button"
              onClick={() => setRevealed(true)}
            >
              <Eye size={17} />
              Reveal
            </button>
          </div>
        )}
      </article>
      {revealed && (
        <div className="rating-area">
          <button className="primary-button" onClick={next}>
            Next
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

export function KanaStudyPage({ script }: { script: KanaScript }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<"chart" | "study" | "quiz">(
    initialTab === "chart" || initialTab === "quiz" ? initialTab : "study",
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
          aria-pressed={tab === "quiz"}
          className={tab === "quiz" ? "selected" : ""}
          onClick={() => setTab("quiz")}
        >
          Quiz
        </button>
        <button
          aria-pressed={tab === "chart"}
          className={tab === "chart" ? "selected" : ""}
          onClick={() => setTab("chart")}
        >
          Chart
        </button>
      </div>
      {tab === "study" && <KanaStudyBrowse key={script} script={script} />}
      {tab === "quiz" && <KanaQuizPractice key={script} script={script} />}
      {tab === "chart" && <KanaChart script={script} />}
    </>
  );
}
