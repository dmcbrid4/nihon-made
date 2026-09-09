"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Search } from "lucide-react";
import { typeLabels } from "@/lib/study/content";
import { commonalityLevels, conceptTypes } from "@/lib/study/types";
import { useConceptFilters } from "@/lib/study/use-concept-filters";
import { useStudy } from "./study-provider";
import { ConceptFace } from "./concept-face";
import { Loading } from "./loading";

type ConceptFlag = {
  id: string;
  conceptId: string;
  note: string;
  createdAt: string;
  resolvedAt: string | null;
};

export function AdminBrowse() {
  const { mode } = useStudy();
  const {
    isKana,
    viewLevel,
    filter,
    setFilter,
    commonalityFilter,
    setCommonalityFilter,
    search,
    setSearch,
    visible,
  } = useConceptFilters();
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<ConceptFlag[] | null>(null);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "database") return;
    let active = true;
    fetch("/api/admin/flags")
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load flags.");
        return response.json() as Promise<ConceptFlag[]>;
      })
      .then((data) => {
        if (active) setFlags(data);
      })
      .catch(() => {
        if (active) setFlagsError("Couldn't load flags.");
      });
    return () => {
      active = false;
    };
  }, [mode]);

  if (isKana) return <Loading />;
  if (mode !== "database")
    return (
      <div className="empty-search panel">
        <h2>Admin Browse requires account storage.</h2>
        <p>
          Flags are saved to your account, so this view isn’t available in
          local/guest storage mode.
        </p>
      </div>
    );

  const activeIndex = visible.length
    ? Math.min(index, visible.length - 1)
    : 0;
  const concept = visible[activeIndex];
  const openFlags = (flags ?? []).filter((item) => !item.resolvedAt);
  const conceptOpenFlag = concept
    ? openFlags.find((item) => item.conceptId === concept.id)
    : undefined;

  async function submitFlag() {
    if (!concept || !note.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          conceptId: concept.id,
          note: note.trim(),
        }),
      });
      if (!response.ok) throw new Error("Couldn't save the flag.");
      const flag = (await response.json()) as ConceptFlag;
      setFlags((current) => [flag, ...(current ?? [])]);
      setNote("");
    } catch {
      setFlagsError("Couldn't save the flag. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveFlag(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/flags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedAt: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Couldn't resolve the flag.");
      const updated = (await response.json()) as ConceptFlag;
      setFlags((current) =>
        (current ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      setFlagsError("Couldn't resolve the flag. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{viewLevel} ADMIN BROWSE</div>
          <h1>Flip through every card</h1>
          <p>Read every active concept and flag anything that looks wrong.</p>
        </div>
        <span className="level-badge">
          {visible.length ? activeIndex + 1 : 0} of {visible.length}
        </span>
      </div>
      <div className="collection-toolbar">
        <div className="filter-tabs" role="group" aria-label="Filter concepts">
          <button
            aria-pressed={filter === "all"}
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            All concepts
          </button>
          {conceptTypes
            .filter((type) => type !== "kana")
            .map((type) => (
              <button
                key={type}
                aria-pressed={filter === type}
                className={filter === type ? "selected" : ""}
                onClick={() => setFilter(type)}
              >
                {typeLabels[type]}
              </button>
            ))}
        </div>
        <div
          className="filter-tabs commonality-tabs"
          role="group"
          aria-label="Filter by commonality"
        >
          <button
            aria-pressed={commonalityFilter === "all"}
            className={commonalityFilter === "all" ? "selected" : ""}
            onClick={() => setCommonalityFilter("all")}
          >
            All levels
          </button>
          {commonalityLevels.map((level) => (
            <button
              key={level}
              aria-pressed={commonalityFilter === level}
              className={commonalityFilter === level ? "selected" : ""}
              onClick={() => setCommonalityFilter(level)}
            >
              {level === "essential"
                ? "Essential"
                : level === "common"
                  ? "Common"
                  : "Additional"}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search concepts"
            placeholder="Find a word or meaning…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {flagsError && (
        <div className="error-banner" role="alert">
          <span>{flagsError}</span>
          <button onClick={() => setFlagsError(null)}>Dismiss</button>
        </div>
      )}
      {concept ? (
        <>
          <ConceptFace concept={concept} />
          <div className="sort-actions">
            <button
              className="secondary-button"
              disabled={activeIndex === 0}
              onClick={() => setIndex(activeIndex - 1)}
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <button
              className="secondary-button"
              disabled={activeIndex >= visible.length - 1}
              onClick={() => setIndex(activeIndex + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="flag-area">
            {conceptOpenFlag ? (
              <p className="field-help">
                Already flagged: “{conceptOpenFlag.note}”
              </p>
            ) : (
              <div className="flag-form">
                <textarea
                  aria-label="Flag note"
                  placeholder="What looks wrong with this card?"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <button
                  className="primary-button"
                  disabled={busy || !note.trim()}
                  onClick={submitFlag}
                >
                  <Flag size={17} />
                  Flag this card
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-search panel">
          <h2>No concepts found.</h2>
          <p>Try a different filter or search.</p>
        </div>
      )}
      {openFlags.length > 0 && (
        <div className="panel open-flags">
          <h2>Open flags ({openFlags.length})</h2>
          <ul>
            {openFlags.map((item) => (
              <li key={item.id}>
                <span>{item.note}</span>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => resolveFlag(item.id)}
                >
                  Mark resolved
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
