"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";

const cards = [
  { japanese: "水", reading: "みず · mizu", meaning: "water", note: "Use it when asking for water: お水をお願いします。" },
  { japanese: "お願いします", reading: "おねがいします · onegaishimasu", meaning: "please", note: "Use it after a request: これをお願いします。" },
  { japanese: "ありがとうございます", reading: "arigatou gozaimasu", meaning: "thank you", note: "A polite way to thank someone." },
  { japanese: "すみません", reading: "sumimasen", meaning: "excuse me / sorry", note: "Use it to get someone’s attention or apologize." },
  { japanese: "はい", reading: "hai", meaning: "yes", note: "A polite, everyday yes." },
  { japanese: "いいえ", reading: "iie", meaning: "no", note: "A polite, everyday no." },
] as const;

export function GuestStudy() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  function next() {
    const nextIndex = index + 1;
    if (nextIndex < cards.length) {
      setIndex(nextIndex);
      setRevealed(false);
      return;
    }
    setIndex(cards.length);
  }
  function restart() { setIndex(0); setRevealed(false); }
  const card = cards[index];
  return <main className="guest-page"><header className="guest-header"><Link href="/guest" className="guest-brand"><span className="brand-mark" aria-hidden="true">日<span /></span><span>日本まで</span></Link><Link href="/sign-in" className="text-link">Sign in</Link></header><section className="guest-content">{index === cards.length ? <div className="guest-card panel"><span className="eyebrow">GUEST LESSON COMPLETE</span><h1>Six useful words</h1><p>You can return to these cards whenever you want.</p><button className="primary-button" onClick={restart}><RotateCcw size={17} />Start again</button></div> : <div className="guest-card panel"><div className="guest-progress"><span>GUEST LESSON</span><span>{`${index + 1} of ${cards.length}`}</span></div><div className="guest-word"><p lang="ja">{card.japanese}</p><span>{card.reading}</span></div>{revealed && <div className="guest-answer"><strong>{card.meaning}</strong><p>{card.note}</p></div>}<button className="primary-button" onClick={() => revealed ? next() : setRevealed(true)}>{revealed ? <>Next card <ArrowRight size={17} /></> : "Show answer"}</button></div>}<aside className="guest-note"><span className="eyebrow">ABOUT GUEST MODE</span><p>No account is needed. This short lesson is separate from the private study workspace.</p></aside></section></main>;
}
