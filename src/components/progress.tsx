"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, Clock3 } from "lucide-react";
import { conceptById, concepts } from "@/lib/study/content";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { ProgressOverview } from "./progress-overview";
import { ProgressCountdown } from "./progress-countdown";
import { ProgressCurriculum } from "./progress-curriculum";
import { ProgressKnowledgeState } from "./progress-knowledge";
import { ProgressHistoryChart } from "./progress-history-chart";
import { ProgressKanjiGrid } from "./progress-kanji-grid";
import { ProgressPacing } from "./progress-pacing";
import { ProgressKana } from "./progress-kana";

export function ProgressView() {
  const { state } = useStudy();
  if (!state) return <Loading />;
  const activeMode = state.goal.studyMode;
  const completed = state.sessions.filter(
    (session) => session.completedAt && session.mode === activeMode,
  );
  const mastered = state.progress.filter(
    (item) =>
      item.status === "mastered" &&
      concepts.find((concept) => concept.id === item.conceptId)?.level === activeMode,
  ).length;
  const reviews = state.reviews.filter(
    (review) =>
      concepts.find((concept) => concept.id === review.conceptId)?.level === activeMode,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">N4 JOURNEY</div>
          <h1>How close am I to N4?</h1>
          <p>Your curriculum progress, pace, and what to focus on next.</p>
        </div>
      </div>
      <ProgressCountdown />
      <ProgressKana />
      <ProgressCurriculum />
      <ProgressKnowledgeState />
      <ProgressHistoryChart />
      <ProgressKanjiGrid />
      <ProgressPacing />
      <div className="section-heading progress-section-divider">
        <div>
          <h2>Your {activeMode} practice</h2>
          <p>Session activity for your currently active study mode.</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="panel stat-panel">
          <Check size={19} />
          <strong>{completed.length}</strong>
          <span>sessions completed</span>
        </div>
        <div className="panel stat-panel">
          <BookOpen size={19} />
          <strong>{reviews.length}</strong>
          <span>reviews recorded</span>
        </div>
        <div className="panel stat-panel">
          <Clock3 size={19} />
          <strong>{mastered}</strong>
          <span>concepts mastered</span>
        </div>
      </div>
      <ProgressOverview showLink={false} />
      <div className="progress-detail-grid">
        <section className="panel history-panel">
          <h2>Recent practice</h2>
          {completed.length ? (
            <div className="history-list">
              {completed
                .slice(-7)
                .reverse()
                .map((session) => {
                  const sessionReviews = state.reviews.filter(
                    (review) => review.sessionId === session.id,
                  );
                  return (
                    <details key={session.id}>
                      <summary>
                        <span className="history-icon">
                          {session.completedAt ? (
                            <Check size={17} />
                          ) : (
                            <Clock3 size={17} />
                          )}
                        </span>
                        <div>
                          <h3>
                            {new Date(session.startedAt).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                timeZone: state.goal.timeZone,
                              },
                            )}
                          </h3>
                          <p>
                            {sessionReviews.length} of{" "}
                            {session.conceptIds.length} concepts reviewed
                          </p>
                          <p>{session.mode} mode</p>
                        </div>
                        <span className="concept-status">
                          {session.completedAt ? "Complete" : "In progress"}
                        </span>
                      </summary>
                      <div className="completion-reviews">
                        {sessionReviews.map((review) => (
                          <div key={review.id}>
                            <span lang="ja">
                              {conceptById.get(review.conceptId)?.expression}
                            </span>
                            <span
                              className={`review-rating rating-text-${review.rating}`}
                            >
                              {review.rating}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
            </div>
          ) : (
            <div className="history-empty">
              <p>Your story starts with one session.</p>
              <span>Your reviews will appear here as you practice.</span>
              <Link href="/study" className="text-link">
                Start your first session
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <aside className="panel understanding-panel">
          <span className="eyebrow">WHAT THE NUMBERS MEAN</span>
          <h2>Practice, without the guesswork.</h2>
          <p>
            <strong>Unseen</strong> means the concept has not appeared in a
            reviewed card yet.
          </p>
          <p>
            <strong>Introduced</strong> means you have reviewed it once. It
            enters <strong>learning</strong> after its next review.
          </p>
          <p>
            <strong>Mastered</strong> means three consecutive Good or Easy
            ratings, with a review interval of at least seven days.
          </p>
          <div className="data-note">
            These are self-assessments of recall, not a test score. Reading is
            tracked through passage reviews; listening has no scores until audio
            practice is added.
          </div>
        </aside>
      </div>
    </>
  );
}
