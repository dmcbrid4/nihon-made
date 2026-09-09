"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, SkipForward } from "lucide-react";
import { conceptById } from "@/lib/study/content";
import { useConceptFilters } from "@/lib/study/use-concept-filters";
import { useStudy } from "./study-provider";
import { ConceptFace } from "./concept-face";
import { Loading } from "./loading";

export function QuickSort() {
  const { state, dispatch, busy } = useStudy();
  const { isKana, viewLevel, visible } = useConceptFilters();
  const sortLevel = viewLevel === "N4" ? "N4" : "N5";
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);

  // Snapshot the queue once, the first render `state` is available, using
  // React's supported "adjust state during render" pattern (not an effect)
  // so it happens before paint with no extra render flash. Recomputing this
  // reactively off `state` on every render would reshuffle/shrink the list
  // mid-flip every time a card gets marked known, since dispatch replaces
  // state.progress with a new array each time.
  if (queue === null && state) {
    const progressById = new Map(
      state.progress.map((item) => [item.conceptId, item]),
    );
    setQueue(
      visible
        .filter((item) => item.type === "vocabulary" && item.level === sortLevel)
        .filter((item) => progressById.get(item.id)?.status !== "mastered")
        .map((item) => item.id),
    );
  }

  if (isKana) return <Loading />;
  if (!state || queue === null) return <Loading />;

  const conceptId = queue[index];
  const concept = conceptId ? conceptById.get(conceptId) : undefined;

  async function markKnown() {
    if (!conceptId) return;
    const next = await dispatch({
      type: "markVocabularyKnown",
      conceptIds: [conceptId],
    });
    if (next) setKnownCount((count) => count + 1);
    setIndex((value) => value + 1);
  }

  function skip() {
    setIndex((value) => value + 1);
  }

  if (!concept) {
    return (
      <div className="empty-search panel">
        <h2>Nothing left to sort.</h2>
        <p>
          {knownCount
            ? `You marked ${knownCount} ${knownCount === 1 ? "word" : "words"} as already known.`
            : `Every remaining ${sortLevel} word is either already mastered or worth a normal review.`}
        </p>
        <Link href="/collection" className="text-link">
          Back to your collection
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{sortLevel} QUICK SORT</div>
          <h1>Already know this?</h1>
          <p>
            Mark anything you already know -- it jumps straight to mastered
            and drops out of your review queue. Switch study modes from the
            sidebar or Settings to sort the other level.
          </p>
        </div>
        <span className="level-badge">
          {index + 1} of {queue.length}
        </span>
      </div>
      <ConceptFace concept={concept} />
      <div className="sort-actions">
        <button className="primary-button" disabled={busy} onClick={markKnown}>
          <Check size={17} />
          Already know it
        </button>
        <button className="secondary-button" disabled={busy} onClick={skip}>
          <SkipForward size={17} />
          Keep in queue
        </button>
      </div>
    </>
  );
}
