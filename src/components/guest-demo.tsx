"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChartNoAxesColumnIncreasing, House, RotateCcw, Settings2 } from "lucide-react";
import { intervalFor } from "@/lib/study/scheduler";
import { ratings, type Rating } from "@/lib/study/types";

export const guestCards = [
  { id: "water", japanese: "水", reading: "みず · mizu", meaning: "water", type: "Vocabulary", note: "お水をお願いします。 — Water, please." },
  { id: "please", japanese: "お願いします", reading: "おねがいします · onegaishimasu", meaning: "please", type: "Phrase", note: "これをお願いします。 — This one, please." },
  { id: "thanks", japanese: "ありがとうございます", reading: "arigatou gozaimasu", meaning: "thank you", type: "Phrase", note: "A polite way to thank someone." },
  { id: "excuse-me", japanese: "すみません", reading: "sumimasen", meaning: "excuse me / sorry", type: "Phrase", note: "Use it to get someone’s attention." },
  { id: "yes", japanese: "はい", reading: "hai", meaning: "yes", type: "Vocabulary", note: "A polite, everyday yes." },
  { id: "no", japanese: "いいえ", reading: "iie", meaning: "no", type: "Vocabulary", note: "A polite, everyday no." },
  { id: "station", japanese: "駅", reading: "えき · eki", meaning: "station", type: "Vocabulary", note: "駅はどこですか。 — Where is the station?" },
  { id: "toilet", japanese: "トイレ", reading: "toire", meaning: "toilet", type: "Vocabulary", note: "トイレはどこですか。 — Where is the toilet?" },
] as const;
type GuestDemo = { reviewed: Set<string>; cardRatings: Record<string, Rating>; review: (id: string, rating: Rating) => void; reset: () => void };
const GuestDemoContext = createContext<GuestDemo | null>(null);
export function GuestDemoProvider({ children }: { children: ReactNode }) { const [reviewed, setReviewed] = useState<Set<string>>(() => new Set()); const [cardRatings, setCardRatings] = useState<Record<string, Rating>>({}); const review = (id: string, rating: Rating) => { setReviewed((current) => new Set([...current, id])); setCardRatings((current) => ({ ...current, [id]: rating })); }; const reset = () => { setReviewed(new Set()); setCardRatings({}); }; return <GuestDemoContext.Provider value={{ reviewed, cardRatings, review, reset }}>{children}</GuestDemoContext.Provider>; }
function useGuestDemo() { const value = useContext(GuestDemoContext); if (!value) throw new Error("Guest demo must be used inside its provider."); return value; }
const navigation = [{ href: "/guest", label: "Today", icon: House }, { href: "/guest/collection", label: "Collection", icon: BookOpen }, { href: "/guest/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing }, { href: "/guest/settings", label: "Settings", icon: Settings2 }];
export function GuestShell({ children }: { children: ReactNode }) { const pathname = usePathname(); return <div className="guest-shell"><aside className="guest-sidebar"><Link href="/guest" className="brand"><span className="brand-mark" aria-hidden="true">日<span /></span><span><span className="brand-japanese" lang="ja">日本まで</span><span className="brand-english">Guest demo</span></span></Link><div className="sidebar-section-label">GUEST MODE</div><nav className="main-nav" aria-label="Guest navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></Link>)}</nav><div className="guest-sidebar-note">Sample lessons only.<br />No account required.</div></aside><div className="guest-workspace"><header className="guest-topbar"><span>Guest demo</span><Link href="/sign-in" className="text-link">Sign in</Link></header><main className="guest-main">{children}</main></div></div>; }
export function GuestDashboard() { const { reviewed } = useGuestDemo(); const remaining = guestCards.filter((card) => !reviewed.has(card.id)); return <><div className="page-heading"><div><div className="eyebrow">GUEST DASHBOARD</div><h1>Start with useful Japanese.</h1><p>Try the sample lesson without creating an account.</p></div><span className="level-badge">{reviewed.size} / {guestCards.length} reviewed</span></div><section className="guest-session panel"><div className="card-topline"><span className="eyebrow">TODAY’S SAMPLE</span><span className="time-pill">About 5 min</span></div><h2>{remaining.length ? "Practical starter words" : "Sample lesson complete"}</h2><p className="card-description">{remaining.length ? `${remaining.length} cards remaining in this demo.` : "Restart the demo or explore the collection."}</p><div className="guest-preview-list">{guestCards.slice(0, 4).map((card) => <div key={card.id}><span lang="ja">{card.japanese}</span><span>{card.meaning}</span><span>{reviewed.has(card.id) ? "Reviewed" : "Ready"}</span></div>)}</div><Link href="/guest/study" className="primary-button">{remaining.length ? "Start sample lesson" : "Review again"}<ArrowRight size={17} /></Link></section><section className="guest-dashboard-grid"><div className="panel guest-summary"><span className="eyebrow">WHAT’S INCLUDED</span><h2>8 starter cards</h2><p>Everyday words and phrases for a first look at Japanese.</p><Link href="/guest/collection" className="text-link">Browse collection <ArrowRight size={15} /></Link></div><div className="panel guest-summary"><span className="eyebrow">YOUR DEMO PROGRESS</span><h2>{reviewed.size} cards reviewed</h2><p>Progress is available while this guest session is open.</p><Link href="/guest/progress" className="text-link">View progress <ArrowRight size={15} /></Link></div></section></>; }
export function GuestStudy() {
  const { reviewed, cardRatings, review, reset } = useGuestDemo();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const card = guestCards[index];

  function rate(rating: Rating) {
    review(card.id, rating);
    if (index === guestCards.length - 1) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setRevealed(false);
  }

  function restart() {
    reset();
    setIndex(0);
    setRevealed(false);
    setDone(false);
  }

  if (done) {
    const recalled = guestCards.filter(
      (item) => cardRatings[item.id] === "good" || cardRatings[item.id] === "easy",
    ).length;
    return (
      <div className="completion panel">
        <span className="completion-icon">
          <Check size={27} strokeWidth={1.6} />
        </span>
        <span className="eyebrow">SAMPLE LESSON, COMPLETE</span>
        <h1>A little more understood.</h1>
        <p>That’s the same review flow the full app uses.</p>
        <div className="completion-stats">
          <div>
            <strong>{guestCards.length}</strong>
            <span>concepts reviewed</span>
          </div>
          <div>
            <strong>{recalled}</strong>
            <span>recalled comfortably</span>
          </div>
        </div>
        <div className="completion-reviews">
          {guestCards.map((item) => (
            <div key={item.id}>
              <span lang="ja">{item.japanese}</span>
              <span className={`review-rating rating-text-${cardRatings[item.id]}`}>
                {cardRatings[item.id]}
              </span>
            </div>
          ))}
        </div>
        <p className="completion-note">
          Sign in for a real schedule built from ratings like these.
        </p>
        <Link href="/guest" className="primary-button">
          Back to dashboard
          <ArrowRight size={17} />
        </Link>
        <button className="text-link guest-reset" onClick={restart}>
          <RotateCcw size={15} />
          Reset demo progress
        </button>
      </div>
    );
  }

  return (
    <div className="guest-study-view">
      <div className="study-navigation">
        <Link href="/guest" className="text-link">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <span>
          {index + 1} of {guestCards.length}
        </span>
      </div>
      <div className="study-progress-track">
        <span style={{ width: `${(index / guestCards.length) * 100}%` }} />
      </div>
      <section className="guest-flashcard panel">
        <span className="eyebrow">SAMPLE FLASHCARD</span>
        <div className="guest-flashcard-word">
          <p lang="ja">{card.japanese}</p>
          <span>{card.reading}</span>
        </div>
        {revealed ? (
          <div className="guest-answer">
            <strong>{card.meaning}</strong>
            <p>{card.note}</p>
          </div>
        ) : (
          <button className="primary-button" onClick={() => setRevealed(true)}>
            Show answer
          </button>
        )}
      </section>
      {revealed && (
        <div className="rating-area">
          <p>How did that feel?</p>
          <div className="rating-grid">
            {ratings.map((rating, i) => {
              const days = intervalFor(rating, undefined);
              return (
                <button
                  key={rating}
                  className={`rating-button rating-${rating}`}
                  onClick={() => rate(rating)}
                >
                  <span className="rating-key">{i + 1}</span>
                  <strong>{rating[0].toUpperCase() + rating.slice(1)}</strong>
                  <span className="rating-interval">
                    {rating === "again"
                      ? "Next session"
                      : `${days} ${days === 1 ? "day" : "days"}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="guest-study-note">
        {reviewed.size} of {guestCards.length} cards reviewed in this session.
      </p>
      <button className="text-link guest-reset" onClick={restart}>
        <RotateCcw size={15} />
        Reset demo progress
      </button>
    </div>
  );
}
export function GuestCollection() { const { reviewed } = useGuestDemo(); return <><div className="page-heading"><div><div className="eyebrow">GUEST COLLECTION</div><h1>Starter words and phrases</h1><p>Eight common items with pronunciation and an example.</p></div></div><div className="guest-collection">{guestCards.map((card) => <article className="panel" key={card.id}><div><span className="concept-status">{reviewed.has(card.id) ? "Reviewed" : "New"}</span><p className="guest-collection-japanese" lang="ja">{card.japanese}</p><span>{card.reading}</span></div><div><h2>{card.meaning}</h2><p>{card.note}</p><span className="eyebrow">{card.type}</span></div></article>)}</div></>; }
export function GuestProgress() { const { reviewed } = useGuestDemo(); const percent = Math.round((reviewed.size / guestCards.length) * 100); return <><div className="page-heading"><div><div className="eyebrow">GUEST PROGRESS</div><h1>Sample progress</h1><p>This shows activity from the current guest session.</p></div></div><div className="guest-progress-stats"><div className="panel"><strong>{reviewed.size}</strong><span>cards reviewed</span></div><div className="panel"><strong>{guestCards.length - reviewed.size}</strong><span>cards remaining</span></div><div className="panel"><strong>{percent}%</strong><span>demo complete</span></div></div><section className="panel guest-progress-panel"><h2>Lesson completion</h2><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><p>{reviewed.size} of {guestCards.length} sample cards reviewed.</p><Link href="/guest/study" className="primary-button">Continue lesson <ArrowRight size={17} /></Link></section></>; }
export function GuestSettings() { const { reset } = useGuestDemo(); return <><div className="page-heading"><div><div className="eyebrow">GUEST SETTINGS</div><h1>About this demo</h1><p>Guest mode is a public preview of Nihon Made.</p></div></div><section className="panel guest-settings"><div><h2>No account, no private data</h2><p>Guest activity is separate from the private workspace and is cleared when this demo session ends.</p></div><div><h2>Included content</h2><p>Eight introductory words and phrases. The private workspace contains the full study system.</p></div><button className="text-link" onClick={reset}><RotateCcw size={15} />Reset demo progress</button><Link href="/sign-in" className="primary-button">Sign in to private workspace <ArrowRight size={17} /></Link></section></>; }
