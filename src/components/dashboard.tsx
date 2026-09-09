"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Headphones,
  Languages,
  Layers3,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { concepts, conceptById } from "@/lib/study/content";
import {
  currentSession,
  minutesPerType,
  planSession,
  sessionMinutes,
} from "@/lib/study/planner";
import { useStudy } from "./study-provider";
import { Loading } from "./loading";
import { KanaHome } from "./kana-home";

const sections = [
  {
    type: "vocabulary",
    label: "Vocabulary",
    description: "New and due words",
    icon: Languages,
  },
  {
    type: "kanji",
    label: "Kanji",
    description: "Character recognition and reading",
    icon: PenLine,
  },
  {
    type: "grammar",
    label: "Grammar",
    description: "Core sentence patterns",
    icon: Layers3,
  },
  {
    type: "reading",
    label: "Reading",
    description: "Short reading practice",
    icon: BookOpen,
  },
  {
    type: "listening",
    label: "Listening",
    description: "Audio comprehension",
    icon: Headphones,
  },
] as const;

export function Dashboard() {
  const { state, now, busy, dispatch } = useStudy();
  const router = useRouter();
  if (!state) return <Loading />;
  // Kana has no daily SRS queue -- it replaces Today entirely with its own
  // chart/study/quiz home instead of the vocabulary session flow below.
  if (state.goal.studyMode === "kana") return <KanaHome />;
  const session = currentSession(state, now);
  const items = session
    ? session.conceptIds.map((id) => conceptById.get(id)!).filter(Boolean)
    : planSession(state, now);
  const reviewed = session
    ? state.reviews.filter((review) => review.sessionId === session.id).length
    : 0;
  const completed = !!session?.completedAt;
  const modeLabel =
    state.goal.studyMode === "tae-kim" ? "Tae Kim" : state.goal.studyMode;
  const modeConcepts = concepts.filter(
    (item) => item.level === state.goal.studyMode,
  );
  const priorIds = new Set(state.progress.map((item) => item.conceptId));
  const newCount = items.filter((item) => !priorIds.has(item.id)).length;
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: state.goal.timeZone,
  }).format(now);
  async function start() {
    const next = await dispatch({ type: "start", id: crypto.randomUUID() });
    if (next) router.push("/study");
  }
  function repeat() {
    if (!session) return;
    if (
      window.confirm(
        "Repeat today's lesson? This undoes today's reviews so you can go through it again.",
      )
    )
      void dispatch({ type: "repeatSession", sessionId: session.id });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{modeLabel} · DAILY STUDY</div>
          <h1>Today</h1>
          <p>
            {completed
              ? "Your session is saved."
              : "Review due cards, then study new material."}
          </p>
        </div>
        <div className="heading-date">
          <span>{date}</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="today-card panel" aria-labelledby="today-heading">
          <div className="card-topline">
            <span className="eyebrow">
              <span lang="ja">学習</span> / SESSION
            </span>
            <span className="time-pill">
              <Clock3 size={13} />
              {sessionMinutes(items)} min
            </span>
          </div>
          <h2 id="today-heading">
            {completed
              ? "Session complete"
              : reviewed
                ? "Continue session"
                : "Today’s study"}
          </h2>
          <p className="card-description">
            {completed
              ? "Your next session will be ready tomorrow."
              : reviewed
                ? `${reviewed} of ${items.length} steps complete. Your place is saved.`
                : `${items.length} activities selected for today.`}
          </p>
          <div className="session-list">
            {sections
              .filter(({ type }) => items.some((item) => item.type === type))
              .map(({ type, label, description, icon: Icon }) => {
                const count = items.filter((item) => item.type === type).length;
                const noun =
                  type === "grammar"
                    ? "concept"
                    : type === "listening"
                      ? "clip"
                      : type === "reading"
                        ? "passage"
                        : type === "kanji"
                          ? "character"
                          : "word";
                return (
                  <div key={type} className="session-row">
                    <span className={`subject-icon subject-${type}`}>
                      <Icon size={19} strokeWidth={1.7} />
                    </span>
                    <div className="session-row-text">
                      <h3>
                        {label}
                        <span>
                          {count} {noun}
                          {count !== 1 ? "s" : ""}
                        </span>
                      </h3>
                      <p>{description}</p>
                    </div>
                    <span className="row-duration">
                      {count * minutesPerType[type]} min
                    </span>
                  </div>
                );
              })}
          </div>
          {completed ? (
            <div className="completion-actions">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={repeat}
              >
                <RotateCcw size={16} />
                Repeat today’s lesson
              </button>
              <Link href="/study" className="primary-button">
                <Check size={17} />
                View today’s session
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <button
              className="primary-button"
              disabled={busy || !items.length}
              onClick={() => void start()}
            >
              {busy
                ? "Preparing your session…"
                : reviewed
                  ? "Continue session"
                  : items.length
                    ? "Start session"
                    : "No study due today"}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="session-footnote">
            {completed ? "Progress saved." : "Progress saves automatically."}
          </p>
        </section>
        <aside className="session-index" aria-label="Session details">
          <span className="eyebrow">{modeLabel} / OVERVIEW</span>
          <h2>{completed ? "Recorded" : "Session details"}</h2>
          <dl>
            <div>
              <dt>{session ? "Cards reviewed" : "New cards"}</dt>
              <dd>{session ? reviewed : newCount}</dd>
            </div>
            <div>
              <dt>{session ? "Cards remaining" : "Due reviews"}</dt>
              <dd>
                {session
                  ? Math.max(0, items.length - reviewed)
                  : items.length - newCount}
              </dd>
            </div>
            <div>
              <dt>Daily time budget</dt>
              <dd>
                {state.goal.dailyMinutes}
                <small> min</small>
              </dd>
            </div>
          </dl>
          <Link href="/settings" className="text-link">
            Adjust study settings <ArrowUpRight size={15} />
          </Link>
          <div className="collection-index">
            <span className="eyebrow">REFERENCE</span>
            <h3>{modeLabel} collection</h3>
            <p>{modeConcepts.length.toLocaleString()} items in this course.</p>
            <Link href="/collection" className="text-link">
              Browse material <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
