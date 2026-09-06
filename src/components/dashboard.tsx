"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Languages,
  Layers3,
  PenLine,
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
import { ProgressOverview } from "./progress-overview";

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
] as const;

export function Dashboard() {
  const { state, now, busy, dispatch } = useStudy();
  const router = useRouter();
  if (!state) return <Loading />;
  const session = currentSession(state, now);
  const items = session
    ? session.conceptIds.map((id) => conceptById.get(id)!).filter(Boolean)
    : planSession(state, now);
  const reviewed = session
    ? state.reviews.filter((review) => review.sessionId === session.id).length
    : 0;
  const completed = !!session?.completedAt;
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
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            TODAY
          </div>
          <h1>{state.goal.studyMode} Japanese study</h1>
          <p>
            {state.goal.studyMode === "N5"
              ? "Build the foundations before moving on."
              : "Focus on N4-only material, separate from your N5 work."}
          </p>
        </div>
        <div className="heading-date">
          <span>{date}</span>
          <span className="level-badge">{state.goal.studyMode} mode</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="today-card panel" aria-labelledby="today-heading">
          <div className="card-topline">
            <span className="eyebrow">
              <span className="status-dot" /> {state.goal.studyMode} SESSION
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
            {sections.map(({ type, label, description, icon: Icon }) => {
              const count = items.filter((item) => item.type === type).length;
              const noun =
                type === "grammar"
                  ? "concept"
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
            <Link href="/study" className="primary-button">
              <Check size={17} />
              View today’s session
              <ArrowRight size={17} />
            </Link>
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
            {completed
              ? "Progress saved."
              : "Progress saves automatically."}
          </p>
        </section>
      </div>
      <ProgressOverview />
      <section className="travel-focus">
        <span className="focus-icon">
          <Compass size={23} strokeWidth={1.5} />
        </span>
        <div>
          <div className="eyebrow">STUDY MATERIAL</div>
          <h2>N5–N4 foundations</h2>
          <p>Vocabulary, kanji, grammar, and reading practice.</p>
        </div>
        <Link href="/collection" className="text-link">
          Explore {concepts.length} concepts <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
