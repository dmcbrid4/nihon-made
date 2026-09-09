"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { concepts } from "./content";
import {
  commonalityLevels,
  conceptTypes,
  type Commonality,
  type ConceptType,
} from "./types";
import { useStudy } from "@/components/study-provider";

function isConceptType(value: string | null): value is ConceptType {
  return conceptTypes.includes(value as ConceptType);
}

/** The filter/sort/level logic shared by CollectionView, Quick Sort, and
 * Admin Browse -- kept in one place so their concept lists can't drift
 * apart. See collection.tsx for the original, single-consumer version this
 * was extracted from. */
export function useConceptFilters() {
  const { state } = useStudy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMode = state?.goal.studyMode ?? "N5";
  const isKana = activeMode === "kana";
  useEffect(() => {
    // Kana has its own dedicated chart/quiz UI; none of these views render
    // kana concepts as flip-through cards.
    if (isKana) router.replace("/kana?tab=chart");
  }, [isKana, router]);
  const initialType = searchParams.get("type");
  const [filter, setFilter] = useState<ConceptType | "all">(
    isConceptType(initialType) ? initialType : "all",
  );
  const [commonalityFilter, setCommonalityFilter] = useState<
    Commonality | "all"
  >("all");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const levelParam = searchParams.get("level");
  const viewLevel =
    levelParam === "N5" || levelParam === "N4" || levelParam === "tae-kim"
      ? levelParam
      : activeMode;
  const visible = concepts
    .filter(
      (item) =>
        (filter === "all" || item.type === filter) &&
        item.level === viewLevel &&
        (commonalityFilter === "all" ||
          (item.type === "vocabulary" &&
            item.commonality === commonalityFilter)) &&
        [item.expression, item.reading, item.meaning, item.topic]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const rank = (item: (typeof concepts)[number]) =>
        item.type !== "vocabulary"
          ? 3
          : commonalityLevels.indexOf(item.commonality ?? "additional");
      return rank(a) - rank(b) || a.sequence - b.sequence;
    });
  return {
    activeMode,
    isKana,
    viewLevel,
    filter,
    setFilter,
    commonalityFilter,
    setCommonalityFilter,
    search,
    setSearch,
    visible,
  };
}
