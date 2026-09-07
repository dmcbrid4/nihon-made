"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Headphones,
  Layers3,
  PenLine,
} from "lucide-react";
import { concepts } from "@/lib/study/content";
import { vocabularyProgress } from "@/lib/study/vocabulary-progress";
import { useStudy } from "./study-provider";

const skills = [
  { type: "kanji", label: "Kanji", icon: PenLine },
  { type: "grammar", label: "Grammar", icon: Layers3 },
  { type: "reading", label: "Reading", icon: BookOpen },
  { type: "listening", label: "Listening", icon: Headphones },
];

export function ProgressOverview({ showLink = true }: { showLink?: boolean }) {
  const { state } = useStudy();
  if (!state) return null;
  const activeMode = state.goal.studyMode;
  // Kana has its own dedicated Progress-page section (progress-kana.tsx) --
  // this vocabulary-shaped overview (JLPT cohorts, kanji/grammar/reading/
  // listening counts) doesn't apply to it.
  if (activeMode === "kana") return null;
  const vocabulary = vocabularyProgress(state).filter(
    (cohort) => cohort.id === activeMode.toLowerCase(),
  );
  return (
    <section className="progress-section" aria-labelledby="progress-heading">
      <div className="section-heading">
        <div>
          <h2 id="progress-heading">
            {activeMode === "tae-kim" ? "Tae Kim" : activeMode} progress
          </h2>
        </div>
        {showLink && (
          <Link href="/progress" className="text-link">
            View progress <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      <div
        className="vocabulary-progress-grid"
        aria-label="Vocabulary progress"
      >
        {vocabulary.map((cohort) => {
          const introducedOrFurther =
            cohort.introduced + cohort.learning + cohort.mastered;
          return (
            <div key={cohort.id} className="vocabulary-progress-card">
              <span>{cohort.label}</span>
              <strong>
                {cohort.mastered} <small>/ {cohort.total}</small>
              </strong>
              <p>mastered</p>
              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${cohort.label} mastered`}
                aria-valuenow={cohort.mastered}
                aria-valuemin={0}
                aria-valuemax={cohort.total}
              >
                <span
                  className="progress-learning"
                  style={{
                    width: `${(introducedOrFurther / cohort.total) * 100}%`,
                  }}
                />
                <span
                  className="progress-mastered"
                  style={{
                    width: `${(cohort.mastered / cohort.total) * 100}%`,
                  }}
                />
              </div>
              <small>
                {cohort.unseen} unseen · {cohort.introduced} introduced ·{" "}
                {cohort.learning} learning
              </small>
            </div>
          );
        })}
      </div>
      <div className="progress-grid">
        {skills.map(({ type, label, icon: Icon }) => {
          const ids = concepts
            .filter((item) => item.type === type && item.level === activeMode)
            .map((item) => item.id);
          const introduced = state.progress.filter((item) =>
            ids.includes(item.conceptId),
          );
          const mastered = introduced.filter(
            (item) => item.status === "mastered",
          ).length;
          return (
            <div key={type} className="skill-card">
              <div className="skill-card-heading">
                <Icon size={17} strokeWidth={1.6} />
                <span>{label}</span>
              </div>
              <div className="skill-count">
                {ids.length ? (
                  <>
                    <strong>{introduced.length}</strong>
                    <span>/ {ids.length}</span>
                  </>
                ) : (
                  <strong className="not-yet">—</strong>
                )}
              </div>
              <div
                className="progress-track"
                role={ids.length ? "progressbar" : undefined}
                aria-label={
                  ids.length ? `${label} concepts introduced` : undefined
                }
                aria-valuenow={ids.length ? introduced.length : undefined}
                aria-valuemin={ids.length ? 0 : undefined}
                aria-valuemax={ids.length || undefined}
              >
                <span
                  className="progress-learning"
                  style={{
                    width: `${ids.length ? (introduced.length / ids.length) * 100 : 0}%`,
                  }}
                />
                <span
                  className="progress-mastered"
                  style={{
                    width: `${ids.length ? (mastered / ids.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>
                {ids.length ? "concepts introduced" : "No items in this course"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="progress-note">
        Mastered requires three consecutive Good or Easy ratings and a review
        interval of at least seven days. This is not an estimate of JLPT
        readiness.
      </p>
    </section>
  );
}
