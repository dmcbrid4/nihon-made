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
  Settings2,
} from "lucide-react";
import { concepts, conceptById } from "@/lib/study/content";
import { daysUntil, formatTripDate } from "@/lib/study/dates";
import {
  currentSession,
  minutesPerType,
  planSession,
  sessionMinutes,
} from "@/lib/study/planner";
import { useStudy } from "./study-provider";
import { Landscape } from "./landscape";
import { Loading } from "./loading";
import { ProgressOverview } from "./progress-overview";

const sections = [
  {
    type: "vocabulary",
    label: "Vocabulary",
    description: "Useful words, familiar contexts",
    icon: Languages,
  },
  {
    type: "kanji",
    label: "Kanji",
    description: "Find meaning in the characters",
    icon: PenLine,
  },
  {
    type: "grammar",
    label: "Grammar",
    description: "Put the pieces together",
    icon: Layers3,
  },
  {
    type: "reading",
    label: "Reading",
    description: "A small window into everyday Japan",
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
  const days = daysUntil(state.goal.targetDate, now, state.goal.timeZone);
  async function start() {
    const next = await dispatch({ type: "start", id: crypto.randomUUID() });
    if (next) router.push("/study");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-sun" /> 日本語を、毎日。
          </div>
          <h1>今日も、日本語をひとつ。</h1>
          <p lang="ja">読む。聞く。話す。身につける。</p>
        </div>
        <div className="heading-date">
          <span>{date}</span>
          <span className="level-badge">Working toward JLPT N4</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="today-card panel" aria-labelledby="today-heading">
          <div className="card-topline">
            <span className="eyebrow">
              <span className="status-dot" /> TODAY’S PRACTICE
            </span>
            <span className="time-pill">
              <Clock3 size={13} />
              {sessionMinutes(items)} min
            </span>
          </div>
          <h2 id="today-heading">
            {completed
              ? "A good place to pause."
              : reviewed
                ? "Pick up where you left off."
                : "Make room for Japanese."}
          </h2>
          <p className="card-description">
            {completed
              ? "Today’s session is complete. Let it settle in."
              : reviewed
                ? `${reviewed} of ${items.length} steps complete. Your place is saved.`
                : "A focused session. A few new connections."}
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
                  ? "Continue Today’s Japanese"
                  : items.length
                    ? "Start Today’s Japanese"
                    : "You’re all caught up"}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="session-footnote">
            {completed
              ? "Your next session will be ready tomorrow."
              : "Go at your own pace. You can pause anytime."}
          </p>
        </section>
        <aside className="trip-card" aria-label="Countdown to Japan">
          <div className="trip-topline">
            <span className="eyebrow">THE DESTINATION</span>
            <Link
              href="/settings"
              className="icon-button"
              aria-label="Edit Japan trip date"
            >
              <Settings2 size={17} />
            </Link>
          </div>
          <div className="trip-title">
            <h2>Japan</h2>
            <span lang="ja">日本</span>
          </div>
          <p className="trip-date">{formatTripDate(state.goal.targetDate)}</p>
          <div className="countdown">
            <strong>{days}</strong>
            <span>{days === 1 ? "DAY TO GO" : "DAYS TO GO"}</span>
          </div>
          <Landscape />
          <div className="trip-caption">
            <span lang="ja">少しずつ、前へ。</span>
            <span>Little by little, forward.</span>
          </div>
        </aside>
      </div>
      <ProgressOverview />
      <section className="travel-focus">
        <span className="focus-icon">
          <Compass size={23} strokeWidth={1.5} />
        </span>
        <div>
          <div className="eyebrow">JAPANESE FOR THE REAL WORLD</div>
          <h2>Next stop: everyday Japan.</h2>
          <p>From finding your platform to ordering something delicious.</p>
        </div>
        <Link href="/collection" className="text-link">
          Explore {concepts.length} concepts <ArrowUpRight size={16} />
        </Link>
      </section>
      <div className="closing-note">
        <span lang="ja">学ぶ、つながる、旅をする。</span>
        <span>Learn. Connect. Go places.</span>
      </div>
    </>
  );
}
