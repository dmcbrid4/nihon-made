"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, Clock3 } from "lucide-react";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { ProgressOverview } from "./progress-overview";

export function ProgressView() {
  const { state } = useStudy();
  if (!state) return <Loading />;
  const completed = state.sessions.filter((session) => session.completedAt);
  const mastered = state.progress.filter(
    (item) => item.status === "mastered",
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UNDERSTANDING, OVER TIME</div>
          <h1>Every connection counts.</h1>
          <p>A clear view of the practice you’ve actually done.</p>
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
          <strong>{state.reviews.length}</strong>
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
          {state.sessions.length ? (
            <div className="history-list">
              {state.sessions
                .slice(-7)
                .reverse()
                .map((session) => (
                  <div key={session.id}>
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
                        {
                          state.reviews.filter(
                            (review) => review.sessionId === session.id,
                          ).length
                        }{" "}
                        of {session.conceptIds.length} concepts reviewed
                      </p>
                    </div>
                    <span className="concept-status">
                      {session.completedAt ? "Complete" : "In progress"}
                    </span>
                  </div>
                ))}
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
