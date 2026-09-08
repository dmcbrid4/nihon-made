"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from "lucide-react";
import { conceptById } from "@/lib/study/content";
import {
  currentSession,
  planSession,
  sessionMinutes,
} from "@/lib/study/planner";
import type { Rating } from "@/lib/study/types";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { ReviewCard } from "./review-card";

export function StudySessionView() {
  const { state, now, dispatch, busy } = useStudy();
  const router = useRouter();
  const isKana = state?.goal.studyMode === "kana";
  useEffect(() => {
    // Kana has no daily SRS queue -- Today already sends Kana mode to
    // /kana directly, but a stale bookmark/back-button could still land
    // here, so redirect rather than show a broken vocabulary-shaped session.
    if (isKana) router.replace("/kana");
  }, [isKana, router]);
  if (!state) return <Loading />;
  if (isKana) return <Loading />;
  const session = currentSession(state, now);
  if (!session) {
    const items = planSession(state, now);
    return (
      <div className="empty-state panel">
        <span className="eyebrow">STUDY SESSION</span>
        <h1>{items.length ? "Ready to study" : "No cards due"}</h1>
        <p>
          {items.length
            ? `${items.length} cards · About ${sessionMinutes(items)} minutes`
            : "Your next reviews will appear when they’re due. Take a look around the collection in the meantime."}
        </p>
        {!!items.length && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() =>
              void dispatch({ type: "start", id: crypto.randomUUID() })
            }
          >
            Start session
            <ArrowRight size={17} />
          </button>
        )}
        <Link href="/" className="text-link">
          Back to Today
        </Link>
      </div>
    );
  }
  const reviews = state.reviews.filter(
    (review) => review.sessionId === session.id,
  );
  const reviewed = new Set(reviews.map((review) => review.conceptId));
  const activeConceptIds = session.conceptIds.filter((id) =>
    conceptById.has(id),
  );
  const conceptId = activeConceptIds.find((id) => !reviewed.has(id));
  const concept = conceptId ? conceptById.get(conceptId) : undefined;
  if (session.completedAt) {
    const recall = reviews.filter(
      (review) => review.rating === "good" || review.rating === "easy",
    ).length;
    return (
      <div className="completion panel">
        <span className="completion-icon">
          <Check size={27} strokeWidth={1.6} />
        </span>
        <span className="eyebrow">SESSION SUMMARY</span>
        <h1>Session complete</h1>
        <p>{reviews.length} cards reviewed. Your progress is saved.</p>
        <div className="completion-stats">
          <div>
            <strong>{reviews.length}</strong>
            <span>concepts reviewed</span>
          </div>
          <div>
            <strong>{recall}</strong>
            <span>recalled comfortably</span>
          </div>
        </div>
        <div className="completion-reviews">
          {reviews.map((review) => (
            <div key={review.id}>
              <span lang="ja">
                {conceptById.get(review.conceptId)?.expression}
              </span>
              <span className={`review-rating rating-text-${review.rating}`}>
                {review.rating}
              </span>
            </div>
          ))}
        </div>
        <p className="completion-note">
          Your progress is saved. Tomorrow’s session will build on your reviews.
        </p>
        <div className="completion-actions">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Repeat today's lesson? This undoes today's reviews so you can go through it again.",
                )
              )
                void dispatch({ type: "repeatSession", sessionId: session.id });
            }}
          >
            <RotateCcw size={16} />
            Repeat today’s lesson
          </button>
          <Link href="/" className="primary-button">
            Back to Today
            <ArrowRight size={17} />
          </Link>
        </div>
        <Link href="/progress" className="text-link">
          See your progress
        </Link>
      </div>
    );
  }
  if (!concept)
    // Covers both "every card in this session got retired" and "the only
    // card(s) left unreviewed got retired while others were already
    // answered" -- an interrupted session can land in either shape, and
    // both need the same recovery screen instead of silently rendering
    // nothing (see completeRetired below).
    return (
      <div className="empty-state panel">
        <span className="eyebrow">CURRICULUM UPDATE</span>
        <h1>This earlier session has been updated.</h1>
        <p>
          Its remaining cards were retired during a curriculum-quality update.
          Your existing reviews stay in your history.
        </p>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void dispatch({ type: "completeRetired", sessionId: session.id })
          }
        >
          Finish updated session
        </button>
        <Link href="/" className="text-link">
          Back to Today
        </Link>
      </div>
    );
  function rate(rating: Rating) {
    if (!session || !concept) return;
    void dispatch({
      type: "review",
      id: crypto.randomUUID(),
      sessionId: session.id,
      conceptId: concept.id,
      rating,
    });
  }
  const remaining = activeConceptIds
    .filter((id) => !reviewed.has(id))
    .map((id) => conceptById.get(id)!)
    .filter(Boolean);
  return (
    <div className="study-container">
      <div className="study-navigation">
        <Link href="/" className="text-link">
          <ArrowLeft size={16} />
          Save & leave
        </Link>
        <span>
          <Clock3 size={14} />
          About {sessionMinutes(remaining)} min left
        </span>
      </div>
      <div className="study-progress-label">
        <span>Today’s Japanese</span>
        <span>
          {reviews.length + 1}{" "}
          <span className="muted">of {activeConceptIds.length}</span>
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
        <span
          style={{
            width: `${(reviews.length / activeConceptIds.length) * 100}%`,
          }}
        />
      </div>
      <ReviewCard
        key={concept.id}
        concept={concept}
        progress={state.progress.find((item) => item.conceptId === concept.id)}
        busy={busy}
        onRate={rate}
      />
    </div>
  );
}
